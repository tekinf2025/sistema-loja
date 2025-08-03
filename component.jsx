import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, Plus, Edit, Trash2, ShoppingCart, User, Package, Wrench, TrendingUp, X, Check, AlertTriangle, Menu, Calculator, File, Upload, Download, FileText, Database } from 'lucide-react';

// Configuração do Supabase
const supabaseUrl = 'https://ivumtyhdkjurerknjnpt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2dW10eWhka2p1cmVya25qbnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNjUyMjMsImV4cCI6MjA2NTk0MTIyM30.rbkqMbSYczGbJdGSjUvARGLIU3Gf-B9q0RWm0vW99Bs';
const supabase = createClient(supabaseUrl, supabaseKey);

// Hook personalizado para toast notifications
const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return { toasts, addToast, removeToast };
};

// Componente de Toast
const Toast = ({ toast, onRemove }) => {
  const bgColor = toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600';
  
  return (
    <div className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between mb-2 animate-fade-in`}>
      <span>{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} className="ml-2 hover:opacity-70">
        <X size={16} />
      </button>
    </div>
  );
};

// Componente de Modal responsivo
const Modal = ({ isOpen, onClose, title, children, size = "2xl" }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
    "6xl": "max-w-6xl"
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-slate-800 rounded-lg p-4 lg:p-6 w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg lg:text-xl font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// Componente principal do sistema
const SistemaGerenciamento = () => {
  const [currentPage, setCurrentPage] = useState('vendas');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  // Estados para dados
  const [produtos, setProdutos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Funções para buscar nomes pelos códigos
  const getClienteName = (codigo) => {
    const cliente = clientes.find(c => c.codigo === codigo);
    return cliente ? cliente.nome : codigo;
  };

  const getProdutoName = (codigo) => {
    const produto = produtos.find(p => p.codigo === codigo);
    return produto ? produto.nome : codigo;
  };

  const getServicoName = (codigo) => {
    const servico = servicos.find(s => s.codigo === codigo);
    return servico ? servico.nome : codigo;
  };

  // Estados para modais
  const [showClientModal, setShowClientModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showEditSaleModal, setShowEditSaleModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Estados para filtros de venda
  const [filtroMes, setFiltroMes] = useState('mes-atual');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Estados para importação/exportação
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importLog, setImportLog] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Funções de Importação e Exportação CSV
  
  // Função para converter array para CSV
  const arrayToCSV = (data, headers) => {
    if (!data || data.length === 0) return '';
    
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header] || '';
        // Escapar aspas e quebras de linha
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  };

  // Função para converter CSV para array
  const csvToArray = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        data.push(row);
      }
    }
    
    return data;
  };

  // Função para exportar dados para CSV
  const exportarCSV = async (tipo) => {
    setIsExporting(true);
    try {
      let data = [];
      let headers = [];
      let filename = '';
      
      switch (tipo) {
        case 'clientes':
          data = clientes;
          headers = ['codigo', 'nome', 'telefone', 'observacao', 'data_cadastro'];
          filename = 'clientes.csv';
          break;
        case 'produtos':
          data = produtos;
          headers = ['codigo', 'nome', 'valor', 'custo', 'estoque'];
          filename = 'produtos.csv';
          break;
        case 'servicos':
          data = servicos;
          headers = ['codigo', 'nome', 'preco_hora', 'preco_custo'];
          filename = 'servicos.csv';
          break;
        case 'vendas':
          data = vendas;
          headers = ['codigo', 'data', 'cliente_codigo', 'produto_codigo', 'servico_codigo', 'quantidade', 'valor_total', 'custo_fixo', 'lucro', 'observacao'];
          filename = 'vendas.csv';
          break;
        case 'todos':
          // Exportar todos os dados em um arquivo ZIP seria ideal, mas vamos criar arquivos separados
          const dataCompleta = {
            clientes: clientes,
            produtos: produtos,
            servicos: servicos,
            vendas: vendas
          };
          
          const csvCompleto = Object.keys(dataCompleta).map(tabela => {
            const tabelaHeaders = {
              clientes: ['codigo', 'nome', 'telefone', 'observacao', 'data_cadastro'],
              produtos: ['codigo', 'nome', 'valor', 'custo', 'estoque'],
              servicos: ['codigo', 'nome', 'preco_hora', 'preco_custo'],
              vendas: ['codigo', 'data', 'cliente_codigo', 'produto_codigo', 'servico_codigo', 'quantidade', 'valor_total', 'custo_fixo', 'lucro', 'observacao']
            };
            
            return `[${tabela.toUpperCase()}]\n${arrayToCSV(dataCompleta[tabela], tabelaHeaders[tabela])}\n`;
          }).join('\n');
          
          const blob = new Blob([csvCompleto], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = 'backup_completo.csv';
          link.click();
          
          addToast('Backup completo exportado com sucesso!');
          setIsExporting(false);
          return;
      }
      
      const csvContent = arrayToCSV(data, headers);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      
      addToast(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} exportados com sucesso!`);
      
    } catch (error) {
      console.error('Erro ao exportar:', error);
      addToast(`Erro ao exportar: ${error.message}`, 'error');
    }
    setIsExporting(false);
  };

  // Função para importar dados do CSV
  const importarCSV = async (file, tipo) => {
    setIsImporting(true);
    setImportLog([]);
    
    try {
      const text = await file.text();
      let data = [];
      let log = [];
      
      if (tipo === 'todos') {
        // Processar backup completo
        const sections = text.split(/\[([A-Z]+)\]/);
        
        for (let i = 1; i < sections.length; i += 2) {
          const sectionName = sections[i].toLowerCase();
          const sectionData = sections[i + 1];
          
          if (sectionData && sectionData.trim()) {
            const parsedData = csvToArray(sectionData.trim());
            
            try {
              await processarImportacao(parsedData, sectionName);
              log.push(`✅ ${sectionName}: ${parsedData.length} registros importados`);
            } catch (error) {
              log.push(`❌ ${sectionName}: Erro - ${error.message}`);
            }
          }
        }
      } else {
        data = csvToArray(text);
        await processarImportacao(data, tipo);
        log.push(`✅ ${data.length} registros de ${tipo} importados com sucesso`);
      }
      
      setImportLog(log);
      await loadAllData();
      addToast('Importação concluída!');
      
    } catch (error) {
      console.error('Erro ao importar:', error);
      addToast(`Erro ao importar: ${error.message}`, 'error');
      setImportLog([`❌ Erro: ${error.message}`]);
    }
    
    setIsImporting(false);
  };

  // Função para processar importação específica
  const processarImportacao = async (data, tipo) => {
    const tabelas = {
      clientes: 'sistema_clientes',
      produtos: 'sistema_estoque',
      servicos: 'sistema_servicos',
      vendas: 'sistema_vendas'
    };
    
    const tabela = tabelas[tipo];
    if (!tabela || !data || data.length === 0) {
      throw new Error(`Tipo inválido ou dados vazios para ${tipo}`);
    }
    
    // Validar e limpar dados
    const dadosLimpos = data.map(row => {
      const cleanRow = {};
      Object.keys(row).forEach(key => {
        const value = row[key];
        if (value === '' || value === 'null' || value === 'undefined') {
          cleanRow[key] = null;
        } else if (key.includes('valor') || key.includes('custo') || key.includes('preco') || key.includes('total') || key.includes('lucro')) {
          cleanRow[key] = parseFloat(value) || 0;
        } else if (key === 'quantidade' || key === 'estoque') {
          cleanRow[key] = parseInt(value) || 0;
        } else {
          cleanRow[key] = value;
        }
      });
      return cleanRow;
    });
    
    // Inserir dados em lotes para melhor performance
    const batchSize = 100;
    for (let i = 0; i < dadosLimpos.length; i += batchSize) {
      const batch = dadosLimpos.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from(tabela)
        .upsert(batch, { 
          onConflict: 'codigo',
          ignoreDuplicates: false 
        });
        
      if (error) throw error;
    }
  };

  // Função para lidar com upload de arquivo
  const handleFileUpload = (event, tipo) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      addToast('Por favor, selecione um arquivo CSV', 'error');
      return;
    }
    
    importarCSV(file, tipo);
    event.target.value = ''; // Limpar input
  };

  // Estados para formulários
  const [clientForm, setClientForm] = useState({
    codigo: '',
    nome: '',
    telefone: '',
    observacao: '',
    data_cadastro: new Date().toISOString().split('T')[0]
  });

  const [productForm, setProductForm] = useState({
    codigo: '',
    nome: '',
    valor: '',
    estoque: '',
    custo: ''
  });

  const [serviceForm, setServiceForm] = useState({
    codigo: '',
    nome: '',
    preco_hora: '',
    preco_custo: ''
  });

  // Estados para nova venda
  const [novaVenda, setNovaVenda] = useState({
    cliente: null,
    data: new Date().toISOString().split('T')[0],
    observacao: '',
    itens: []
  });

  // Estados para edição de venda
  const [vendaEditando, setVendaEditando] = useState({
    codigo: '',
    cliente: null,
    data: '',
    observacao: '',
    quantidade: 1,
    valor_total: 0,
    custo_fixo: 0,
    produto_codigo: '',
    servico_codigo: ''
  });

  // Estados para seleção de itens
  const [buscaCliente, setBuscaCliente] = useState('');
  const [buscaProduto, setBuscaProduto] = useState('');
  const [buscaServico, setBuscaServico] = useState('');
  const [mostrarSugestoesCliente, setMostrarSugestoesCliente] = useState(false);
  const [mostrarSugestoesProduto, setMostrarSugestoesProduto] = useState(false);
  const [mostrarSugestoesServico, setMostrarSugestoesServico] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProdutos(),
        loadServicos(),
        loadVendas(),
        loadClientes()
      ]);
    } catch (error) {
      addToast('Erro ao carregar dados', 'error');
    }
    setLoading(false);
  };



  const loadProdutos = async () => {
    const { data, error } = await supabase.from('sistema_estoque').select('*');
    if (error) throw error;
    setProdutos(data || []);
  };

  const loadServicos = async () => {
    const { data, error } = await supabase.from('sistema_servicos').select('*');
    if (error) throw error;
    setServicos(data || []);
  };

  const loadVendas = async () => {
    const { data, error } = await supabase.from('sistema_vendas').select('*').order('data', { ascending: false });
    if (error) throw error;
    setVendas(data || []);
  };

  const loadClientes = async () => {
    const { data, error } = await supabase.from('sistema_clientes').select('*').order('data_cadastro', { ascending: false });
    if (error) throw error;
    setClientes(data || []);
  };

  // Funções para clientes
  const handleSaveClient = async (e) => {
    e.preventDefault();
    try {
      const clientDataToSave = clientForm;

      if (editingItem) {
        const { error } = await supabase
          .from('sistema_clientes')
          .update(clientDataToSave)
          .eq('codigo', editingItem.codigo);
        if (error) throw error;
        addToast('Cliente atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('sistema_clientes')
          .insert([clientDataToSave]);
        if (error) throw error;
        addToast('Cliente criado com sucesso!');
      }
      
      await loadClientes();
      setShowClientModal(false);
      setEditingItem(null);
      setClientForm({ 
        codigo: '', 
        nome: '', 
        telefone: '', 
        observacao: '', 
        data_cadastro: new Date().toISOString().split('T')[0] 
      });
    } catch (error) {
      addToast('Erro ao salvar cliente: ' + error.message, 'error');
    }
  };

  const handleDeleteClient = async (codigo) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        const { error } = await supabase
          .from('sistema_clientes')
          .delete()
          .eq('codigo', codigo);
        if (error) throw error;
        
        await loadClientes();
        addToast('Cliente excluído com sucesso!');
      } catch (error) {
        addToast('Erro ao excluir cliente: ' + error.message, 'error');
      }
    }
  };

  // Funções para produtos
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('sistema_estoque')
          .update(productForm)
          .eq('codigo', editingItem.codigo);
        if (error) throw error;
        addToast('Produto atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('sistema_estoque')
          .insert([productForm]);
        if (error) throw error;
        addToast('Produto criado com sucesso!');
      }
      
      await loadProdutos();
      setShowProductModal(false);
      setEditingItem(null);
      setProductForm({ codigo: '', nome: '', valor: '', estoque: '', custo: '' });
    } catch (error) {
      addToast('Erro ao salvar produto: ' + error.message, 'error');
    }
  };

  const handleDeleteProduct = async (codigo) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        const { error } = await supabase
          .from('sistema_estoque')
          .delete()
          .eq('codigo', codigo);
        if (error) throw error;
        
        await loadProdutos();
        addToast('Produto excluído com sucesso!');
      } catch (error) {
        addToast('Erro ao excluir produto: ' + error.message, 'error');
      }
    }
  };

  // Funções para serviços
  const handleSaveService = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('sistema_servicos')
          .update(serviceForm)
          .eq('codigo', editingItem.codigo);
        if (error) throw error;
        addToast('Serviço atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('sistema_servicos')
          .insert([serviceForm]);
        if (error) throw error;
        addToast('Serviço criado com sucesso!');
      }
      
      await loadServicos();
      setShowServiceModal(false);
      setEditingItem(null);
      setServiceForm({ codigo: '', nome: '', preco_hora: '', preco_custo: '' });
    } catch (error) {
      addToast('Erro ao salvar serviço: ' + error.message, 'error');
    }
  };

  const handleDeleteService = async (codigo) => {
    if (window.confirm('Tem certeza que deseja excluir este serviço?')) {
      try {
        const { error } = await supabase
          .from('sistema_servicos')
          .delete()
          .eq('codigo', codigo);
        if (error) throw error;
        
        await loadServicos();
        addToast('Serviço excluído com sucesso!');
      } catch (error) {
        addToast('Erro ao excluir serviço: ' + error.message, 'error');
      }
    }
  };

  // Função para gerar próximo código de venda
  const getNextSaleCode = () => {
    if (!vendas || vendas.length === 0) {
      return 'VEN-0001';
    }
    
    try {
      // Buscar o maior número de código existente (considerando ambos os formatos)
      const maxCode = vendas.reduce((max, venda) => {
        if (!venda.codigo) return max;
        
        // Aceitar tanto "VEN-" quanto "ven-" (case insensitive)
        const match = venda.codigo.match(/ven-(\d+)/i);
        if (match) {
          const num = parseInt(match[1]);
          return num > max ? num : max;
        }
        return max;
      }, 0);
      
      // Incrementar e formatar com zeros à esquerda
      const nextNum = maxCode + 1;
      return `VEN-${nextNum.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Erro ao gerar código da venda:', error);
      return `VEN-${Date.now().toString().slice(-4)}`;
    }
  };

  // Função para gerar próximo código de cliente
  const getNextClientCode = () => {
    if (!clientes || clientes.length === 0) {
      return 'CLI-0001';
    }
    
    try {
      const maxCode = clientes.reduce((max, cliente) => {
        if (!cliente.codigo) return max;
        
        const match = cliente.codigo.match(/cli-(\d+)/i);
        if (match) {
          const num = parseInt(match[1]);
          return num > max ? num : max;
        }
        return max;
      }, 0);
      
      const nextNum = maxCode + 1;
      return `CLI-${nextNum.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Erro ao gerar código do cliente:', error);
      return `CLI-${Date.now().toString().slice(-4)}`;
    }
  };

  // Função para gerar próximo código de produto
  const getNextProductCode = () => {
    if (!produtos || produtos.length === 0) {
      return 'PRD-0001';
    }
    
    try {
      const maxCode = produtos.reduce((max, produto) => {
        if (!produto.codigo) return max;
        
        const match = produto.codigo.match(/prd-(\d+)/i);
        if (match) {
          const num = parseInt(match[1]);
          return num > max ? num : max;
        }
        return max;
      }, 0);
      
      const nextNum = maxCode + 1;
      return `PRD-${nextNum.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Erro ao gerar código do produto:', error);
      return `PRD-${Date.now().toString().slice(-4)}`;
    }
  };

  // Função para gerar próximo código de serviço
  const getNextServiceCode = () => {
    if (!servicos || servicos.length === 0) {
      return 'SRV-0001';
    }
    
    try {
      const maxCode = servicos.reduce((max, servico) => {
        if (!servico.codigo) return max;
        
        const match = servico.codigo.match(/srv-(\d+)/i);
        if (match) {
          const num = parseInt(match[1]);
          return num > max ? num : max;
        }
        return max;
      }, 0);
      
      const nextNum = maxCode + 1;
      return `SRV-${nextNum.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Erro ao gerar código do serviço:', error);
      return `SRV-${Date.now().toString().slice(-4)}`;
    }
  };

  // Função para formatar valores em padrão brasileiro
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(value || 0));
  };





  // Funções para filtrar sugestões
  const getSugestoesClientes = () => {
    if (!buscaCliente) return [];
    return clientes.filter(c => 
      c.nome.toLowerCase().includes(buscaCliente.toLowerCase()) ||
      c.codigo.toLowerCase().includes(buscaCliente.toLowerCase())
    ).slice(0, 5);
  };

  const getSugestoesProdutos = () => {
    if (!buscaProduto) return [];
    return produtos.filter(p => 
      p.nome.toLowerCase().includes(buscaProduto.toLowerCase()) ||
      p.codigo.toLowerCase().includes(buscaProduto.toLowerCase())
    ).slice(0, 5);
  };

  const getSugestoesServicos = () => {
    if (!buscaServico) return [];
    return servicos.filter(s => 
      s.nome.toLowerCase().includes(buscaServico.toLowerCase()) ||
      s.codigo.toLowerCase().includes(buscaServico.toLowerCase())
    ).slice(0, 5);
  };

  // Funções para nova venda
  const selecionarCliente = (cliente) => {
    setNovaVenda({ ...novaVenda, cliente });
    setBuscaCliente(cliente.nome);
    setMostrarSugestoesCliente(false);
  };

  const adicionarProduto = (produto) => {
    // Verificar se o produto já existe na venda
    const produtoJaAdicionado = novaVenda.itens.find(item => item.codigo === produto.codigo && item.tipo === 'produto');
    
    if (produtoJaAdicionado) {
      addToast('Este produto já foi adicionado à venda!', 'error');
      setBuscaProduto('');
      setMostrarSugestoesProduto(false);
      return;
    }

    // Verificar estoque disponível
    const estoqueDisponivel = parseInt(produto.estoque || 0);
    if (estoqueDisponivel <= 0) {
      addToast('Produto sem estoque disponível!', 'error');
      setBuscaProduto('');
      setMostrarSugestoesProduto(false);
      return;
    }

    const novoItem = {
      id: Date.now(),
      tipo: 'produto',
      codigo: produto.codigo,
      nome: produto.nome,
      quantidade: 1,
      preco_venda: parseFloat(produto.valor || 0),
      preco_custo: parseFloat(produto.custo || 0),
      estoque_disponivel: estoqueDisponivel
    };
    
    setNovaVenda({
      ...novaVenda,
      itens: [...novaVenda.itens, novoItem]
    });
    
    setBuscaProduto('');
    setMostrarSugestoesProduto(false);
    addToast('Produto adicionado à venda!');
  };

  const adicionarServico = (servico) => {
    // Verificar se o serviço já existe na venda
    const servicoJaAdicionado = novaVenda.itens.find(item => item.codigo === servico.codigo && item.tipo === 'servico');
    
    if (servicoJaAdicionado) {
      addToast('Este serviço já foi adicionado à venda!', 'error');
      setBuscaServico('');
      setMostrarSugestoesServico(false);
      return;
    }

    const novoItem = {
      id: Date.now(),
      tipo: 'servico',
      codigo: servico.codigo,
      nome: servico.nome,
      quantidade: 1,
      preco_venda: parseFloat(servico.preco_hora || 0),
      preco_custo: parseFloat(servico.preco_custo || 0)
    };
    
    setNovaVenda({
      ...novaVenda,
      itens: [...novaVenda.itens, novoItem]
    });
    
    setBuscaServico('');
    setMostrarSugestoesServico(false);
    addToast('Serviço adicionado à venda!');
  };

  const atualizarItem = (itemId, campo, valor) => {
    setNovaVenda({
      ...novaVenda,
      itens: novaVenda.itens.map(item => 
        item.id === itemId ? { ...item, [campo]: valor } : item
      )
    });
  };

  const removerItem = (itemId) => {
    setNovaVenda({
      ...novaVenda,
      itens: novaVenda.itens.filter(item => item.id !== itemId)
    });
  };

  const calcularTotais = () => {
    const valorTotal = novaVenda.itens.reduce((sum, item) => 
      sum + (item.quantidade * item.preco_venda), 0
    );
    const custoTotal = novaVenda.itens.reduce((sum, item) => 
      sum + (item.quantidade * item.preco_custo), 0
    );
    const lucroTotal = valorTotal - custoTotal;
    const margemLucro = valorTotal > 0 ? ((lucroTotal / valorTotal) * 100) : 0;

    return { valorTotal, custoTotal, lucroTotal, margemLucro };
  };

  const finalizarVenda = async () => {
    if (!novaVenda.cliente || novaVenda.itens.length === 0) {
      addToast('Selecione um cliente e adicione itens à venda', 'error');
      return;
    }

    try {
      const codigoBase = getNextSaleCode();
      const { valorTotal, custoTotal, lucroTotal } = calcularTotais();
      
      // Criar vendas individuais para cada item
      const vendasParaCriar = novaVenda.itens.map((item, index) => {
        const custoItem = item.quantidade * item.preco_custo;
        const lucroItem = (item.quantidade * item.preco_venda) - custoItem;
        
        const vendaData = {
          codigo: index === 0 ? codigoBase : `${codigoBase}-${index + 1}`,
          data: novaVenda.data,
          cliente_codigo: novaVenda.cliente.codigo,
          quantidade: item.quantidade,
          valor_total: item.quantidade * item.preco_venda,
          custo_fixo: custoItem,
          lucro: lucroItem,
          observacao: novaVenda.observacao || null
        };

        if (item.tipo === 'produto') {
          vendaData.produto_codigo = item.codigo;
        } else {
          vendaData.servico_codigo = item.codigo;
        }

        return vendaData;
      });

      // Inserir vendas no banco
      const { error: insertError } = await supabase
        .from('sistema_vendas')
        .insert(vendasParaCriar);
        
      if (insertError) throw insertError;

      // Atualizar estoque dos produtos
      for (const item of novaVenda.itens) {
        if (item.tipo === 'produto') {
          const produto = produtos.find(p => p.codigo === item.codigo);
          if (produto) {
            const novoEstoque = parseInt(produto.estoque) - item.quantidade;
            
            const { error: updateError } = await supabase
              .from('sistema_estoque')
              .update({ estoque: novoEstoque })
              .eq('codigo', produto.codigo);
              
            if (updateError) throw updateError;
          }
        }
      }

      // Recarregar dados
      await Promise.all([loadVendas(), loadProdutos()]);
      
      // Limpar formulário
      setNovaVenda({
        cliente: null,
        data: new Date().toISOString().split('T')[0],
        observacao: '',
        itens: []
      });
      setBuscaCliente('');
      setShowSaleModal(false);
      
      addToast(`Venda ${codigoBase} finalizada com sucesso! Total: ${formatCurrency(valorTotal)}`);
      
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
      addToast(`Erro ao finalizar venda: ${error.message}`, 'error');
    }
  };

  // Função para excluir venda
  const handleDeleteSale = async (codigo) => {
    if (window.confirm('Tem certeza que deseja excluir esta venda?')) {
      try {
        const { error } = await supabase
          .from('sistema_vendas')
          .delete()
          .eq('codigo', codigo);
        if (error) throw error;
        
        await loadVendas();
        addToast('Venda excluída com sucesso!');
      } catch (error) {
        addToast('Erro ao excluir venda: ' + error.message, 'error');
      }
    }
  };

  // Função para editar venda
  const handleEditSale = (venda) => {
    const cliente = clientes.find(c => c.codigo === venda.cliente_codigo);
    
    setVendaEditando({
      codigo: venda.codigo,
      cliente: cliente,
      data: venda.data,
      observacao: venda.observacao || '',
      quantidade: venda.quantidade || 1,
      valor_total: parseFloat(venda.valor_total || 0),
      custo_fixo: parseFloat(venda.custo_fixo || 0),
      produto_codigo: venda.produto_codigo || '',
      servico_codigo: venda.servico_codigo || ''
    });
    
    setBuscaCliente(cliente ? cliente.nome : '');
    setShowEditSaleModal(true);
  };

  // Função para salvar edição de venda
  const handleSaveEditSale = async (e) => {
    e.preventDefault();
    
    if (!vendaEditando.cliente) {
      addToast('Selecione um cliente', 'error');
      return;
    }

    try {
      const vendaData = {
        data: vendaEditando.data,
        cliente_codigo: vendaEditando.cliente.codigo,
        quantidade: vendaEditando.quantidade,
        valor_total: vendaEditando.valor_total,
        custo_fixo: vendaEditando.custo_fixo,
        lucro: vendaEditando.valor_total - vendaEditando.custo_fixo,
        observacao: vendaEditando.observacao || null,
        produto_codigo: vendaEditando.produto_codigo || null,
        servico_codigo: vendaEditando.servico_codigo || null
      };

      const { error } = await supabase
        .from('sistema_vendas')
        .update(vendaData)
        .eq('codigo', vendaEditando.codigo);
        
      if (error) throw error;

      await loadVendas();
      setShowEditSaleModal(false);
      addToast('Venda editada com sucesso!');
      
    } catch (error) {
      console.error('Erro ao editar venda:', error);
      addToast(`Erro ao editar venda: ${error.message}`, 'error');
    }
  };

  // Filtros de busca
  const filteredClientes = useMemo(() => {
    return clientes.filter(cliente =>
      cliente.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.telefone?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clientes, searchTerm]);

  const filteredProdutos = useMemo(() => {
    return produtos.filter(produto =>
      produto.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [produtos, searchTerm]);

  const filteredServicos = useMemo(() => {
    return servicos.filter(servico =>
      servico.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      servico.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [servicos, searchTerm]);

  const filteredVendas = useMemo(() => {
    return vendas.filter(venda => {
      const clienteNome = getClienteName(venda.cliente_codigo);
      const produtoNome = venda.produto_codigo ? getProdutoName(venda.produto_codigo) : '';
      const servicoNome = venda.servico_codigo ? getServicoName(venda.servico_codigo) : '';
      
      // Filtro por texto
      const matchesSearch = venda.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clienteNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        produtoNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        servicoNome?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro por mês
      const dataVenda = new Date(venda.data);
      const mesAtual = new Date().getMonth();
      const anoAtual = new Date().getFullYear();
      
      let matchesMes = true;
      if (filtroMes === 'mes-atual') {
        matchesMes = dataVenda.getMonth() === mesAtual && dataVenda.getFullYear() === anoAtual;
      } else if (filtroMes === 'mes-passado') {
        const mesPassado = mesAtual === 0 ? 11 : mesAtual - 1;
        const anoMesPassado = mesAtual === 0 ? anoAtual - 1 : anoAtual;
        matchesMes = dataVenda.getMonth() === mesPassado && dataVenda.getFullYear() === anoMesPassado;
      } else if (filtroMes === 'ultimos-30') {
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - 30);
        matchesMes = dataVenda >= dataLimite;
      }

      // Filtro por data específica (início e fim)
      let matchesDataRange = true;
      if (dataInicio && dataFim) {
        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        matchesDataRange = dataVenda >= inicio && dataVenda <= fim;
      } else if (dataInicio) {
        const inicio = new Date(dataInicio);
        matchesDataRange = dataVenda >= inicio;
      } else if (dataFim) {
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        matchesDataRange = dataVenda <= fim;
      }

      // Filtro por tipo
      let matchesTipo = true;
      if (filtroTipo === 'produtos') {
        matchesTipo = !!venda.produto_codigo;
      } else if (filtroTipo === 'servicos') {
        matchesTipo = !!venda.servico_codigo;
      }
      
      return matchesSearch && matchesMes && matchesTipo && matchesDataRange;
    });
  }, [vendas, searchTerm, clientes, produtos, servicos, filtroMes, filtroTipo, dataInicio, dataFim]);

  // Cálculos estatísticos das vendas filtradas
  const estatisticasVendas = useMemo(() => {
    const totalVendas = filteredVendas.reduce((sum, venda) => sum + parseFloat(venda.valor_total || 0), 0);
    const totalCusto = filteredVendas.reduce((sum, venda) => sum + parseFloat(venda.custo_fixo || 0), 0);
    const totalLucro = filteredVendas.reduce((sum, venda) => sum + parseFloat(venda.lucro || 0), 0);
    const quantidadeVendas = filteredVendas.length;
    const ticketMedio = quantidadeVendas > 0 ? totalVendas / quantidadeVendas : 0;

    return {
      totalVendas,
      totalCusto,
      totalLucro,
      quantidadeVendas,
      ticketMedio
    };
  }, [filteredVendas]);

  // Função para editar
  const handleEdit = (item, type) => {
    setEditingItem(item);
    if (type === 'cliente') {
      setClientForm(item);
      setShowClientModal(true);
    } else if (type === 'produto') {
      setProductForm(item);
      setShowProductModal(true);
    } else if (type === 'servico') {
      setServiceForm(item);
      setShowServiceModal(true);
    }
  };

  // Menu lateral
  const menuItems = [
    { id: 'clientes', name: 'Clientes', icon: User },
    { id: 'produtos', name: 'Produtos', icon: Package },
    { id: 'servicos', name: 'Serviços', icon: Wrench },
    { id: 'vendas', name: 'Vendas', icon: TrendingUp },
    { id: 'importacao', name: 'Import/Export', icon: File },
  ];

  // Renderização das páginas
  const renderPage = () => {
    switch (currentPage) {
      case 'clientes':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-white">Clientes</h1>
                <p className="text-gray-400 text-sm lg:text-base">Gerencie seus clientes</p>
              </div>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setClientForm({ 
                    codigo: getNextClientCode(), 
                    nome: '', 
                    telefone: '', 
                    observacao: '', 
                    data_cadastro: new Date().toISOString().split('T')[0] 
                  });
                  setShowClientModal(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 lg:px-4 lg:py-2 rounded-lg flex items-center justify-center gap-2 text-sm lg:text-base whitespace-nowrap"
              >
                <Plus size={16} className="lg:w-5 lg:h-5" />
                Novo Cliente
              </button>
            </div>

            <div className="bg-slate-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Código</th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nome</th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden sm:table-cell">Telefone</th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden md:table-cell">Data Cadastro</th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden lg:table-cell">Observação</th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-800 divide-y divide-slate-700">
                    {filteredClientes.map((cliente) => (
                      <tr key={cliente.codigo} className="hover:bg-slate-700">
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-blue-400">{cliente.codigo}</td>
                        <td className="px-3 lg:px-6 py-4 text-xs lg:text-sm text-white font-medium">
                          <div>
                            <div className="font-medium">{cliente.nome}</div>
                            <div className="sm:hidden text-xs text-gray-400">{cliente.telefone}</div>
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-300 hidden sm:table-cell">{cliente.telefone}</td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-300 hidden md:table-cell">
                          {cliente.data_cadastro ? new Date(cliente.data_cadastro + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-3 lg:px-6 py-4 text-xs lg:text-sm text-gray-400 max-w-xs truncate hidden lg:table-cell">{cliente.observacao || '-'}</td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-400">
                          <div className="flex space-x-1 lg:space-x-2">
                            <button
                              onClick={() => handleEdit(cliente, 'cliente')}
                              className="text-blue-400 hover:text-blue-300 p-1"
                            >
                              <Edit size={14} className="lg:w-4 lg:h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClient(cliente.codigo)}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <Trash2 size={14} className="lg:w-4 lg:h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'produtos':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-white">Produtos</h1>
                <p className="text-gray-400 text-sm lg:text-base">Gerencie seu estoque de produtos</p>
              </div>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setProductForm({ codigo: getNextProductCode(), nome: '', valor: '', estoque: '', custo: '' });
                  setShowProductModal(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 lg:px-4 lg:py-2 rounded-lg flex items-center justify-center gap-2 text-sm lg:text-base whitespace-nowrap"
              >
                <Plus size={16} className="lg:w-5 lg:h-5" />
                Novo Produto
              </button>
            </div>

            <div className="bg-slate-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Código</th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nome</th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden sm:table-cell">Preço</th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden md:table-cell">Custo</th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden lg:table-cell">Estoque</th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-800 divide-y divide-slate-700">
                    {filteredProdutos.map((produto) => (
                      <tr key={produto.codigo} className="hover:bg-slate-700">
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-blue-400">{produto.codigo}</td>
                        <td className="px-3 lg:px-6 py-4 text-xs lg:text-sm text-white font-medium">
                          <div>
                            <div className="font-medium">{produto.nome}</div>
                            <div className="sm:hidden text-xs text-green-400">{formatCurrency(produto.valor)}</div>
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-green-400 hidden sm:table-cell">{formatCurrency(produto.valor)}</td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-red-400 hidden md:table-cell">{formatCurrency(produto.custo)}</td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-white hidden lg:table-cell">{produto.estoque}</td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-400">
                          <div className="flex space-x-1 lg:space-x-2">
                            <button
                              onClick={() => handleEdit(produto, 'produto')}
                              className="text-blue-400 hover:text-blue-300 p-1"
                            >
                              <Edit size={14} className="lg:w-4 lg:h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(produto.codigo)}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <Trash2 size={14} className="lg:w-4 lg:h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'servicos':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-white">Serviços</h1>
                <p className="text-gray-400 text-sm lg:text-base">Gerencie seus serviços oferecidos</p>
              </div>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setServiceForm({ codigo: getNextServiceCode(), nome: '', preco_hora: '', preco_custo: '' });
                  setShowServiceModal(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 lg:px-4 lg:py-2 rounded-lg flex items-center justify-center gap-2 text-sm lg:text-base whitespace-nowrap"
              >
                <Plus size={16} className="lg:w-5 lg:h-5" />
                Novo Serviço
              </button>
            </div>

            <div className="bg-slate-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Código</th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nome</th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden sm:table-cell">Preço/Hora</th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden md:table-cell">Custo</th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-800 divide-y divide-slate-700">
                    {filteredServicos.map((servico) => (
                      <tr key={servico.codigo} className="hover:bg-slate-700">
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-blue-400">{servico.codigo}</td>
                        <td className="px-3 lg:px-6 py-4 text-xs lg:text-sm text-white font-medium">
                          <div>
                            <div className="font-medium">{servico.nome}</div>
                            <div className="sm:hidden text-xs text-green-400">{formatCurrency(servico.preco_hora)}/h</div>
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-green-400 hidden sm:table-cell">{formatCurrency(servico.preco_hora)}</td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-red-400 hidden md:table-cell">{formatCurrency(servico.preco_custo)}</td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-400">
                          <div className="flex space-x-1 lg:space-x-2">
                            <button
                              onClick={() => handleEdit(servico, 'servico')}
                              className="text-blue-400 hover:text-blue-300 p-1"
                            >
                              <Edit size={14} className="lg:w-4 lg:h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteService(servico.codigo)}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <Trash2 size={14} className="lg:w-4 lg:h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'vendas':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-white">Vendas</h1>
                <p className="text-gray-400 text-sm lg:text-base">Gerencie suas vendas e pedidos</p>
              </div>
              <button
                onClick={() => {
                  setNovaVenda({
                    cliente: null,
                    data: new Date().toISOString().split('T')[0],
                    observacao: '',
                    itens: []
                  });
                  setBuscaCliente('');
                  setBuscaProduto('');
                  setBuscaServico('');
                  setShowSaleModal(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 lg:px-4 lg:py-2 rounded-lg flex items-center justify-center gap-2 text-sm lg:text-base font-medium"
              >
                <Plus size={16} className="lg:w-5 lg:h-5 flex-shrink-0" />
                Nova Venda
              </button>
            </div>

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <div className="bg-slate-800 p-3 lg:p-4 rounded-lg border border-green-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs lg:text-sm text-gray-400 truncate">Total em Vendas</p>
                    <p className="text-base lg:text-xl font-bold text-green-400 truncate">{formatCurrency(estatisticasVendas.totalVendas)}</p>
                  </div>
                  <TrendingUp className="h-6 w-6 lg:h-8 lg:w-8 text-green-400 flex-shrink-0 ml-2" />
                </div>
              </div>
              
              <div className="bg-slate-800 p-3 lg:p-4 rounded-lg border border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs lg:text-sm text-gray-400 truncate">Vendas do Período</p>
                    <p className="text-base lg:text-xl font-bold text-blue-400">{estatisticasVendas.quantidadeVendas}</p>
                  </div>
                  <ShoppingCart className="h-6 w-6 lg:h-8 lg:w-8 text-blue-400 flex-shrink-0 ml-2" />
                </div>
              </div>
              
              <div className="bg-slate-800 p-3 lg:p-4 rounded-lg border border-yellow-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs lg:text-sm text-gray-400 truncate">Ticket Médio</p>
                    <p className="text-base lg:text-xl font-bold text-yellow-400 truncate">{formatCurrency(estatisticasVendas.ticketMedio)}</p>
                  </div>
                  <Package className="h-6 w-6 lg:h-8 lg:w-8 text-yellow-400 flex-shrink-0 ml-2" />
                </div>
              </div>
              
              <div className="bg-slate-800 p-3 lg:p-4 rounded-lg border border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs lg:text-sm text-gray-400 truncate">Valor Líquido</p>
                    <p className="text-base lg:text-xl font-bold text-emerald-400 truncate">{formatCurrency(estatisticasVendas.totalLucro)}</p>
                  </div>
                  <TrendingUp className="h-6 w-6 lg:h-8 lg:w-8 text-emerald-400 flex-shrink-0 ml-2" />
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-slate-800 p-3 lg:p-4 rounded-lg">
              <div className="space-y-3 lg:space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar vendas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-700 text-white pl-10 pr-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
                  />
                </div>
                
                <div className="space-y-3 lg:grid lg:grid-cols-2 xl:grid-cols-4 lg:gap-3 lg:space-y-0">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Data Início</label>
                    <input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Data Fim</label>
                    <input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Período</label>
                    <select
                      value={filtroMes}
                      onChange={(e) => {
                        setFiltroMes(e.target.value);
                        if (e.target.value !== 'todos') {
                          setDataInicio('');
                          setDataFim('');
                        }
                      }}
                      className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
                    >
                      <option value="todos">Todos os meses</option>
                      <option value="mes-atual">Mês atual</option>
                      <option value="mes-passado">Mês passado</option>
                      <option value="ultimos-30">Últimos 30 dias</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Tipo</label>
                    <select
                      value={filtroTipo}
                      onChange={(e) => setFiltroTipo(e.target.value)}
                      className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
                    >
                      <option value="todos">Todos</option>
                      <option value="produtos">Produtos</option>
                      <option value="servicos">Serviços</option>
                    </select>
                  </div>
                </div>
                
                {(dataInicio || dataFim || filtroMes !== 'mes-atual' || filtroTipo !== 'todos') && (
                  <div className="flex justify-center lg:justify-end pt-2">
                    <button
                      onClick={() => {
                        setDataInicio('');
                        setDataFim('');
                        setFiltroMes('mes-atual');
                        setFiltroTipo('todos');
                      }}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-medium"
                    >
                      Limpar Filtros
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg overflow-hidden">
              {/* Versão Desktop/Tablet */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-24">Código</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-48">Cliente</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-64">Itens</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-32">Total</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-32 hidden lg:table-cell">Preço de Custo</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-32">Valor Líquido</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-28 hidden xl:table-cell">Data</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-20">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-800 divide-y divide-slate-700">
                    {filteredVendas.map((venda) => (
                      <tr key={venda.codigo} className="hover:bg-slate-700">
                        <td className="px-3 py-3 text-sm text-blue-400 font-medium">{venda.codigo}</td>
                        <td className="px-3 py-3 text-sm text-white">
                          <div className="font-medium">{getClienteName(venda.cliente_codigo)}</div>
                        </td>
                        <td className="px-3 py-3 text-sm text-white">
                          <div>
                            {venda.produto_codigo && (
                              <div className="text-blue-400">
                                {venda.quantidade || 1}x {getProdutoName(venda.produto_codigo)}
                              </div>
                            )}
                            {venda.servico_codigo && (
                              <div className="text-purple-400">
                                {venda.quantidade || 1}x {getServicoName(venda.servico_codigo)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-green-400 font-semibold">
                          {formatCurrency(venda.valor_total)}
                        </td>
                        <td className="px-3 py-3 text-sm text-red-400 font-medium hidden lg:table-cell">
                          {formatCurrency(venda.custo_fixo)}
                        </td>
                        <td className="px-3 py-3 text-sm text-emerald-400 font-semibold">
                          {formatCurrency(venda.lucro)}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-300 hidden xl:table-cell">
                          {venda.data ? new Date(venda.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleEditSale(venda)}
                              className="text-blue-400 hover:text-blue-300 p-1"
                              title="Editar venda"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteSale(venda.codigo)}
                              className="text-red-400 hover:text-red-300 p-1"
                              title="Excluir venda"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Versão Mobile - Cards */}
              <div className="md:hidden">
                <div className="space-y-3 p-3">
                  {filteredVendas.map((venda) => (
                    <div key={venda.codigo} className="bg-slate-700 rounded-lg p-4 space-y-3">
                      {/* Header do Card */}
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-medium text-blue-400">{venda.codigo}</div>
                          <div className="text-xs text-gray-400">
                            {venda.data ? new Date(venda.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditSale(venda)}
                            className="text-blue-400 hover:text-blue-300 p-1"
                            title="Editar venda"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteSale(venda.codigo)}
                            className="text-red-400 hover:text-red-300 p-1"
                            title="Excluir venda"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Cliente */}
                      <div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider">Cliente</div>
                        <div className="text-sm font-medium text-white">{getClienteName(venda.cliente_codigo)}</div>
                      </div>

                      {/* Item */}
                      <div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider">Item</div>
                        <div className="text-sm text-white">
                          {venda.produto_codigo && (
                            <div className="text-blue-400">
                              {venda.quantidade || 1}x {getProdutoName(venda.produto_codigo)}
                            </div>
                          )}
                          {venda.servico_codigo && (
                            <div className="text-purple-400">
                              {venda.quantidade || 1}x {getServicoName(venda.servico_codigo)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Valores */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-400 uppercase tracking-wider">Total</div>
                          <div className="text-sm font-semibold text-green-400">
                            {formatCurrency(venda.valor_total)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 uppercase tracking-wider">Lucro</div>
                          <div className="text-sm font-semibold text-emerald-400">
                            {formatCurrency(venda.lucro)}
                          </div>
                        </div>
                      </div>

                      {/* Custo (expandível) */}
                      <div className="border-t border-slate-600 pt-2">
                        <div className="text-xs text-gray-400 uppercase tracking-wider">Custo</div>
                        <div className="text-sm font-medium text-red-400">
                          {formatCurrency(venda.custo_fixo)}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredVendas.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-lg mb-2">📋</div>
                      <div className="text-sm">Nenhuma venda encontrada</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'importacao':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-white">Importação e Exportação</h1>
                <p className="text-gray-400 text-sm lg:text-base">Faça backup e restaure seus dados</p>
              </div>
            </div>

            {/* Cards de Ações Principais */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Exportação */}
              <div className="bg-slate-800 p-6 rounded-lg border border-green-500/30">
                <div className="flex items-center mb-4">
                  <Download className="h-6 w-6 text-green-400 mr-3" />
                  <h2 className="text-xl font-semibold text-white">Exportar Dados</h2>
                </div>
                <p className="text-gray-400 mb-6">Baixe seus dados em formato CSV para backup ou migração</p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => exportarCSV('clientes')}
                    disabled={isExporting || clientes.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <User size={16} />
                    Exportar Clientes ({clientes.length})
                  </button>
                  
                  <button
                    onClick={() => exportarCSV('produtos')}
                    disabled={isExporting || produtos.length === 0}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Package size={16} />
                    Exportar Produtos ({produtos.length})
                  </button>
                  
                  <button
                    onClick={() => exportarCSV('servicos')}
                    disabled={isExporting || servicos.length === 0}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Wrench size={16} />
                    Exportar Serviços ({servicos.length})
                  </button>
                  
                  <button
                    onClick={() => exportarCSV('vendas')}
                    disabled={isExporting || vendas.length === 0}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <TrendingUp size={16} />
                    Exportar Vendas ({vendas.length})
                  </button>
                  
                  <div className="border-t border-slate-600 pt-3">
                    <button
                      onClick={() => exportarCSV('todos')}
                      disabled={isExporting}
                      className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-4 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold transition-all"
                    >
                      <Database size={16} />
                      {isExporting ? 'Exportando...' : 'Backup Completo'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Importação */}
              <div className="bg-slate-800 p-6 rounded-lg border border-blue-500/30">
                <div className="flex items-center mb-4">
                  <Upload className="h-6 w-6 text-blue-400 mr-3" />
                  <h2 className="text-xl font-semibold text-white">Importar Dados</h2>
                </div>
                <p className="text-gray-400 mb-6">Restaure ou importe dados de arquivos CSV</p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Importar Clientes</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleFileUpload(e, 'clientes')}
                      disabled={isImporting}
                      className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-700"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Importar Produtos</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleFileUpload(e, 'produtos')}
                      disabled={isImporting}
                      className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white file:cursor-pointer hover:file:bg-purple-700"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Importar Serviços</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleFileUpload(e, 'servicos')}
                      disabled={isImporting}
                      className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-600 file:text-white file:cursor-pointer hover:file:bg-orange-700"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Importar Vendas</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleFileUpload(e, 'vendas')}
                      disabled={isImporting}
                      className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:cursor-pointer hover:file:bg-emerald-700"
                    />
                  </div>
                  
                  <div className="border-t border-slate-600 pt-3">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Restaurar Backup Completo</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleFileUpload(e, 'todos')}
                      disabled={isImporting}
                      className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-green-600 file:to-blue-600 file:text-white file:cursor-pointer hover:file:from-green-700 hover:file:to-blue-700"
                    />
                  </div>
                </div>
                
                {isImporting && (
                  <div className="mt-4 p-3 bg-blue-500/20 rounded-lg">
                    <div className="flex items-center text-blue-400">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
                      Importando dados...
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Log de Importação */}
            {importLog.length > 0 && (
              <div className="bg-slate-800 p-6 rounded-lg">
                <div className="flex items-center mb-4">
                  <FileText className="h-5 w-5 text-gray-400 mr-3" />
                  <h3 className="text-lg font-semibold text-white">Log de Importação</h3>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {importLog.map((entry, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg text-sm ${
                        entry.startsWith('✅') 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {entry}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setImportLog([])}
                  className="mt-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Limpar Log
                </button>
              </div>
            )}

            {/* Informações e Ajuda */}
            <div className="bg-slate-800 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3" />
                <h3 className="text-lg font-semibold text-white">Informações Importantes</h3>
              </div>
              
              <div className="space-y-4 text-gray-300 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-white mb-2">Exportação:</h4>
                    <ul className="space-y-1 text-xs">
                      <li>• Os arquivos são gerados em formato CSV padrão</li>
                      <li>• O backup completo inclui todas as tabelas</li>
                      <li>• Dados são exportados com codificação UTF-8</li>
                      <li>• Campos vazios são representados como valores nulos</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-white mb-2">Importação:</h4>
                    <ul className="space-y-1 text-xs">
                      <li>• Aceita apenas arquivos CSV</li>
                      <li>• Dados duplicados são atualizados (baseado no código)</li>
                      <li>• Validação automática de tipos de dados</li>
                      <li>• Process em lotes para melhor performance</li>
                    </ul>
                  </div>
                </div>
                
                <div className="border-t border-slate-600 pt-4">
                  <h4 className="font-semibold text-white mb-2">Formato dos Arquivos CSV:</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                    <div>
                      <strong>Clientes:</strong> codigo, nome, telefone, observacao, data_cadastro<br/>
                      <strong>Produtos:</strong> codigo, nome, valor, custo, estoque
                    </div>
                    <div>
                      <strong>Serviços:</strong> codigo, nome, preco_hora, preco_custo<br/>
                      <strong>Vendas:</strong> codigo, data, cliente_codigo, produto_codigo, servico_codigo, quantidade, valor_total, custo_fixo, lucro, observacao
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Estatísticas do Sistema */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Database className="mr-3" size={20} />
                Estatísticas do Sistema
              </h3>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{clientes.length}</div>
                  <div className="text-sm text-gray-300">Clientes</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{produtos.length}</div>
                  <div className="text-sm text-gray-300">Produtos</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">{servicos.length}</div>
                  <div className="text-sm text-gray-300">Serviços</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">{vendas.length}</div>
                  <div className="text-sm text-gray-300">Vendas</div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-600 text-center">
                <div className="text-lg font-bold text-green-400">
                  {clientes.length + produtos.length + servicos.length + vendas.length}
                </div>
                <div className="text-sm text-gray-300">Total de Registros</div>
              </div>
            </div>
          </div>
        );

      default:
        return <div className="text-white">Página não encontrada</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex relative">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-800 border-r border-slate-700 transform transition-transform duration-300 ease-in-out lg:transform-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6">
          <h1 className="text-xl font-bold text-blue-400">TEKINFORMÁTICA</h1>
          <p className="text-sm text-gray-400">CEO: Ricardo Moraes</p>
        </div>
        <nav className="mt-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentPage(item.id);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center px-6 py-3 text-left hover:bg-slate-700 ${
                currentPage === item.id ? 'bg-blue-600 text-white' : 'text-gray-300'
              }`}
            >
              <item.icon size={20} className="mr-3" />
              {item.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                <Menu size={20} />
              </button>
              
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-700 text-white pl-10 pr-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none w-64"
                />
              </div>
              
              <div className="sm:hidden flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-700 text-white pl-8 pr-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none w-full text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 lg:space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs lg:text-sm text-white">Tekinformática</p>
                <p className="text-xs text-gray-400">Ricardo Loja</p>
              </div>
              <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs lg:text-sm font-semibold">TE</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-white">Carregando...</div>
            </div>
          ) : (
            renderPage()
          )}
        </main>
      </div>

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>

      {/* Modal de Cliente */}
      <Modal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        title={editingItem ? 'Editar Cliente' : 'Novo Cliente'}
      >
        <form onSubmit={handleSaveClient} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Código</label>
            <input
              type="text"
              value={clientForm.codigo}
              onChange={(e) => setClientForm({ ...clientForm, codigo: e.target.value })}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              placeholder="Ex: CLI-001"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nome do Cliente</label>
            <input
              type="text"
              value={clientForm.nome}
              onChange={(e) => setClientForm({ ...clientForm, nome: e.target.value })}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              placeholder="Nome completo do cliente"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Telefone</label>
              <input
                type="tel"
                value={clientForm.telefone}
                onChange={(e) => setClientForm({ ...clientForm, telefone: e.target.value })}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                placeholder="(11) 99999-9999"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Data de Cadastro</label>
              <input
                type="date"
                value={clientForm.data_cadastro}
                onChange={(e) => setClientForm({ ...clientForm, data_cadastro: e.target.value })}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Observação</label>
            <textarea
              value={clientForm.observacao}
              onChange={(e) => setClientForm({ ...clientForm, observacao: e.target.value })}
              rows="3"
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              placeholder="Informações adicionais sobre o cliente..."
            />
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
            >
              {editingItem ? 'Atualizar' : 'Cadastrar'}
            </button>
            <button
              type="button"
              onClick={() => setShowClientModal(false)}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Produto */}
      <Modal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        title={editingItem ? 'Editar Produto' : 'Novo Produto'}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Código</label>
            <input
              type="text"
              value={productForm.codigo}
              onChange={(e) => setProductForm({ ...productForm, codigo: e.target.value })}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nome do Produto</label>
            <input
              type="text"
              value={productForm.nome}
              onChange={(e) => setProductForm({ ...productForm, nome: e.target.value })}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Preço de Venda</label>
              <input
                type="number"
                step="0.01"
                value={productForm.valor}
                onChange={(e) => setProductForm({ ...productForm, valor: e.target.value })}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Custo</label>
              <input
                type="number"
                step="0.01"
                value={productForm.custo}
                onChange={(e) => setProductForm({ ...productForm, custo: e.target.value })}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Estoque</label>
            <input
              type="number"
              value={productForm.estoque}
              onChange={(e) => setProductForm({ ...productForm, estoque: e.target.value })}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
            >
              {editingItem ? 'Atualizar' : 'Cadastrar'}
            </button>
            <button
              type="button"
              onClick={() => setShowProductModal(false)}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Serviço */}
      <Modal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        title={editingItem ? 'Editar Serviço' : 'Novo Serviço'}
      >
        <form onSubmit={handleSaveService} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Código</label>
            <input
              type="text"
              value={serviceForm.codigo}
              onChange={(e) => setServiceForm({ ...serviceForm, codigo: e.target.value })}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nome do Serviço</label>
            <input
              type="text"
              value={serviceForm.nome}
              onChange={(e) => setServiceForm({ ...serviceForm, nome: e.target.value })}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Preço por Hora</label>
              <input
                type="number"
                step="0.01"
                value={serviceForm.preco_hora}
                onChange={(e) => setServiceForm({ ...serviceForm, preco_hora: e.target.value })}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Preço de Custo</label>
              <input
                type="number"
                step="0.01"
                value={serviceForm.preco_custo}
                onChange={(e) => setServiceForm({ ...serviceForm, preco_custo: e.target.value })}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
            >
              {editingItem ? 'Atualizar' : 'Cadastrar'}
            </button>
            <button
              type="button"
              onClick={() => setShowServiceModal(false)}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Nova Venda - Redesign Completo */}
      <Modal
        isOpen={showSaleModal}
        onClose={() => setShowSaleModal(false)}
        title="Nova Venda"
        size="6xl"
      >
        <div className="space-y-6">
          {/* Header da Venda */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 bg-slate-700 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Código da Venda</label>
              <input
                type="text"
                value={getNextSaleCode()}
                readOnly
                className="w-full bg-slate-600 text-blue-400 px-3 py-2 rounded-lg border border-slate-500 font-mono text-lg"
              />
            </div>
            
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">Cliente *</label>
              <input
                type="text"
                placeholder="Digite o nome do cliente..."
                value={buscaCliente}
                onChange={(e) => {
                  setBuscaCliente(e.target.value);
                  setMostrarSugestoesCliente(e.target.value.length > 0);
                  if (!e.target.value) {
                    setNovaVenda({ ...novaVenda, cliente: null });
                  }
                }}
                className="w-full bg-slate-600 text-white px-3 py-2 rounded-lg border border-slate-500 focus:border-blue-500 focus:outline-none"
              />
              {mostrarSugestoesCliente && getSugestoesClientes().length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-slate-600 border border-slate-500 rounded-lg mt-1 z-50 max-h-48 overflow-y-auto">
                  {getSugestoesClientes().map((cliente) => (
                    <button
                      key={cliente.codigo}
                      type="button"
                      onClick={() => selecionarCliente(cliente)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-500 text-white border-b border-slate-500 last:border-b-0"
                    >
                      <div className="font-medium">{cliente.nome}</div>
                      <div className="text-xs text-gray-400">{cliente.codigo} • {cliente.telefone}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Data da Venda</label>
              <input
                type="date"
                value={novaVenda.data}
                onChange={(e) => setNovaVenda({ ...novaVenda, data: e.target.value })}
                className="w-full bg-slate-600 text-white px-3 py-2 rounded-lg border border-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Seleção de Produtos e Serviços */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Produtos */}
            <div className="bg-slate-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Package className="mr-2" size={20} />
                Produtos Disponíveis
              </h3>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar produtos..."
                  value={buscaProduto}
                  onChange={(e) => {
                    setBuscaProduto(e.target.value);
                    setMostrarSugestoesProduto(e.target.value.length > 0);
                  }}
                  className="w-full bg-slate-600 text-white pl-10 pr-4 py-2 rounded-lg border border-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(buscaProduto ? getSugestoesProdutos() : produtos.slice(0, 10)).map((produto) => {
                  const estoqueDisponivel = parseInt(produto.estoque || 0);
                  const produtoJaAdicionado = novaVenda.itens.find(item => item.codigo === produto.codigo && item.tipo === 'produto');
                  const desabilitado = estoqueDisponivel <= 0 || produtoJaAdicionado;
                  
                  return (
                    <div
                      key={produto.codigo}
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                        desabilitado ? 'bg-slate-700 opacity-60' : 'bg-slate-600 hover:bg-slate-500'
                      }`}
                    >
                      <div className="flex-1">
                        <div className={`font-medium ${desabilitado ? 'text-gray-400' : 'text-white'}`}>
                          {produto.nome}
                          {produtoJaAdicionado && <span className="ml-2 text-xs text-yellow-400">(Já adicionado)</span>}
                        </div>
                        <div className="text-sm text-gray-400">
                          {produto.codigo} • Estoque: {estoqueDisponivel} • {formatCurrency(produto.valor)}
                          {estoqueDisponivel <= 0 && <span className="ml-1 text-red-400">(Sem estoque)</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => adicionarProduto(produto)}
                        disabled={desabilitado}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          desabilitado 
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        Adicionar
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Serviços */}
            <div className="bg-slate-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Wrench className="mr-2" size={20} />
                Serviços Disponíveis
              </h3>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar serviços..."
                  value={buscaServico}
                  onChange={(e) => {
                    setBuscaServico(e.target.value);
                    setMostrarSugestoesServico(e.target.value.length > 0);
                  }}
                  className="w-full bg-slate-600 text-white pl-10 pr-4 py-2 rounded-lg border border-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(buscaServico ? getSugestoesServicos() : servicos.slice(0, 10)).map((servico) => {
                  const servicoJaAdicionado = novaVenda.itens.find(item => item.codigo === servico.codigo && item.tipo === 'servico');
                  
                  return (
                    <div
                      key={servico.codigo}
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                        servicoJaAdicionado ? 'bg-slate-700 opacity-60' : 'bg-slate-600 hover:bg-slate-500'
                      }`}
                    >
                      <div className="flex-1">
                        <div className={`font-medium ${servicoJaAdicionado ? 'text-gray-400' : 'text-white'}`}>
                          {servico.nome}
                          {servicoJaAdicionado && <span className="ml-2 text-xs text-yellow-400">(Já adicionado)</span>}
                        </div>
                        <div className="text-sm text-gray-400">
                          {servico.codigo} • {formatCurrency(servico.preco_hora)}/h
                        </div>
                      </div>
                      <button
                        onClick={() => adicionarServico(servico)}
                        disabled={servicoJaAdicionado}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          servicoJaAdicionado 
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}
                      >
                        Adicionar
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Itens da Venda */}
          {novaVenda.itens.length > 0 && (
            <div className="bg-slate-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <ShoppingCart className="mr-2" size={20} />
                Itens da Venda ({novaVenda.itens.length})
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="text-left py-2 text-gray-300">Item</th>
                      <th className="text-center py-2 text-gray-300 w-24">Qtd</th>
                      <th className="text-center py-2 text-gray-300 w-32">Preço Venda</th>
                      <th className="text-center py-2 text-gray-300 w-32">Preço Custo</th>
                      <th className="text-center py-2 text-gray-300 w-32">Total</th>
                      <th className="text-center py-2 text-gray-300 w-20">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {novaVenda.itens.map((item) => (
                      <tr key={item.id} className="border-b border-slate-600">
                        <td className="py-3">
                          <div className="flex items-center">
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                              item.tipo === 'produto' ? 'bg-blue-400' : 'bg-purple-400'
                            }`} />
                            <div>
                              <div className="font-medium text-white">{item.nome}</div>
                              <div className="text-sm text-gray-400">
                                {item.codigo} • {item.tipo === 'produto' ? 'Produto' : 'Serviço'}
                                {item.tipo === 'produto' && ` • Estoque: ${item.estoque_disponivel}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <input
                            type="number"
                            min="1"
                            max={item.tipo === 'produto' ? item.estoque_disponivel : undefined}
                            value={item.quantidade}
                            onChange={(e) => atualizarItem(item.id, 'quantidade', parseInt(e.target.value) || 1)}
                            className="w-16 bg-slate-600 text-white text-center px-2 py-1 rounded border border-slate-500 focus:border-blue-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-3 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={item.preco_venda}
                            onChange={(e) => atualizarItem(item.id, 'preco_venda', parseFloat(e.target.value) || 0)}
                            className="w-24 bg-slate-600 text-green-400 text-center px-2 py-1 rounded border border-slate-500 focus:border-blue-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-3 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={item.preco_custo}
                            onChange={(e) => atualizarItem(item.id, 'preco_custo', parseFloat(e.target.value) || 0)}
                            className="w-24 bg-slate-600 text-red-400 text-center px-2 py-1 rounded border border-slate-500 focus:border-blue-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-3 text-center">
                          <span className="font-semibold text-blue-400">
                            {formatCurrency(item.quantidade * item.preco_venda)}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => removerItem(item.id)}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Resumo Financeiro */}
          {novaVenda.itens.length > 0 && (
            <div className="bg-gradient-to-r from-slate-700 to-slate-600 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Calculator className="mr-2" size={20} />
                Resumo Financeiro
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {formatCurrency(calcularTotais().valorTotal)}
                  </div>
                  <div className="text-sm text-gray-300">Total da Venda</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {formatCurrency(calcularTotais().custoTotal)}
                  </div>
                  <div className="text-sm text-gray-300">Custo Total</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {formatCurrency(calcularTotais().lucroTotal)}
                  </div>
                  <div className="text-sm text-gray-300">Lucro Bruto</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {calcularTotais().margemLucro.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-300">Margem de Lucro</div>
                </div>
              </div>
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Observações</label>
            <textarea
              value={novaVenda.observacao}
              onChange={(e) => setNovaVenda({ ...novaVenda, observacao: e.target.value })}
              rows="3"
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              placeholder="Informações adicionais sobre a venda..."
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={finalizarVenda}
              disabled={!novaVenda.cliente || novaVenda.itens.length === 0}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 px-6 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <Check size={20} />
              Finalizar Venda
            </button>
            <button
              type="button"
              onClick={() => setShowSaleModal(false)}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-medium"
            >
              Cancelar
            </button>
          </div>

          {/* Mensagem de Validação */}
          {(!novaVenda.cliente || novaVenda.itens.length === 0) && (
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3">
              <div className="flex items-center text-yellow-400">
                <AlertTriangle size={16} className="mr-2" />
                <span className="text-sm">
                  {!novaVenda.cliente && "Selecione um cliente. "}
                  {novaVenda.itens.length === 0 && "Adicione pelo menos um item à venda."}
                </span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal de Edição de Venda */}
      <Modal
        isOpen={showEditSaleModal}
        onClose={() => setShowEditSaleModal(false)}
        title="Editar Venda"
        size="4xl"
      >
        <form onSubmit={handleSaveEditSale} className="space-y-6">
          {/* Header da Venda */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 bg-slate-700 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Código da Venda</label>
              <input
                type="text"
                value={vendaEditando.codigo}
                readOnly
                className="w-full bg-slate-600 text-blue-400 px-3 py-2 rounded-lg border border-slate-500 font-mono text-lg"
              />
            </div>
            
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">Cliente *</label>
              <input
                type="text"
                placeholder="Digite o nome do cliente..."
                value={buscaCliente}
                onChange={(e) => {
                  setBuscaCliente(e.target.value);
                  setMostrarSugestoesCliente(e.target.value.length > 0);
                  if (!e.target.value) {
                    setVendaEditando({ ...vendaEditando, cliente: null });
                  }
                }}
                className="w-full bg-slate-600 text-white px-3 py-2 rounded-lg border border-slate-500 focus:border-blue-500 focus:outline-none"
              />
              {mostrarSugestoesCliente && getSugestoesClientes().length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-slate-600 border border-slate-500 rounded-lg mt-1 z-50 max-h-48 overflow-y-auto">
                  {getSugestoesClientes().map((cliente) => (
                    <button
                      key={cliente.codigo}
                      type="button"
                      onClick={() => {
                        setVendaEditando({ ...vendaEditando, cliente });
                        setBuscaCliente(cliente.nome);
                        setMostrarSugestoesCliente(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-500 text-white border-b border-slate-500 last:border-b-0"
                    >
                      <div className="font-medium">{cliente.nome}</div>
                      <div className="text-xs text-gray-400">{cliente.codigo} • {cliente.telefone}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Data da Venda</label>
              <input
                type="date"
                value={vendaEditando.data}
                onChange={(e) => setVendaEditando({ ...vendaEditando, data: e.target.value })}
                className="w-full bg-slate-600 text-white px-3 py-2 rounded-lg border border-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Detalhes da Venda */}
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Detalhes da Venda</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={vendaEditando.quantidade}
                  onChange={(e) => setVendaEditando({ ...vendaEditando, quantidade: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-600 text-white px-3 py-2 rounded-lg border border-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Valor Total</label>
                <input
                  type="number"
                  step="0.01"
                  value={vendaEditando.valor_total}
                  onChange={(e) => setVendaEditando({ ...vendaEditando, valor_total: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-600 text-green-400 px-3 py-2 rounded-lg border border-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Custo Fixo</label>
                <input
                  type="number"
                  step="0.01"
                  value={vendaEditando.custo_fixo}
                  onChange={(e) => setVendaEditando({ ...vendaEditando, custo_fixo: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-600 text-red-400 px-3 py-2 rounded-lg border border-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Lucro</label>
                <input
                  type="text"
                  value={formatCurrency(vendaEditando.valor_total - vendaEditando.custo_fixo)}
                  readOnly
                  className="w-full bg-slate-600 text-emerald-400 px-3 py-2 rounded-lg border border-slate-500 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Informações do Item */}
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Item da Venda</h3>
            
            <div className="space-y-4">
              {vendaEditando.produto_codigo && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Produto</label>
                  <div className="flex items-center p-3 bg-slate-600 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mr-3"></div>
                    <div>
                      <div className="font-medium text-white">{getProdutoName(vendaEditando.produto_codigo)}</div>
                      <div className="text-sm text-gray-400">Código: {vendaEditando.produto_codigo}</div>
                    </div>
                  </div>
                </div>
              )}
              
              {vendaEditando.servico_codigo && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Serviço</label>
                  <div className="flex items-center p-3 bg-slate-600 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-purple-400 mr-3"></div>
                    <div>
                      <div className="font-medium text-white">{getServicoName(vendaEditando.servico_codigo)}</div>
                      <div className="text-sm text-gray-400">Código: {vendaEditando.servico_codigo}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Observações</label>
            <textarea
              value={vendaEditando.observacao}
              onChange={(e) => setVendaEditando({ ...vendaEditando, observacao: e.target.value })}
              rows="3"
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              placeholder="Informações adicionais sobre a venda..."
            />
          </div>

          {/* Resumo Financeiro */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-600 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Resumo Financeiro</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {formatCurrency(vendaEditando.valor_total)}
                </div>
                <div className="text-sm text-gray-300">Total da Venda</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">
                  {formatCurrency(vendaEditando.custo_fixo)}
                </div>
                <div className="text-sm text-gray-300">Custo Total</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(vendaEditando.valor_total - vendaEditando.custo_fixo)}
                </div>
                <div className="text-sm text-gray-300">Lucro Líquido</div>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              disabled={!vendaEditando.cliente}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 px-6 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <Check size={20} />
              Salvar Alterações
            </button>
            <button
              type="button"
              onClick={() => setShowEditSaleModal(false)}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-medium"
            >
              Cancelar
            </button>
          </div>

          {/* Mensagem de Validação */}
          {!vendaEditando.cliente && (
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3">
              <div className="flex items-center text-yellow-400">
                <AlertTriangle size={16} className="mr-2" />
                <span className="text-sm">Selecione um cliente para continuar.</span>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};

export default SistemaGerenciamento;