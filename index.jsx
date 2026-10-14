import React, { useState, useEffect } from 'react';

// Catalogue initial des services
const INITIAL_SERVICES = [
  { id: 1, name: 'Connexion Internet (1 Heure)', price: 300, category: 'Cyber' },
  { id: 2, name: 'Connexion Internet (Journée)', price: 1000, category: 'Cyber' },
  { id: 3, name: 'Impression N&B (Page)', price: 50, category: 'Impression' },
  { id: 4, name: 'Impression Couleur (Page)', price: 200, category: 'Impression' },
  { id: 5, name: 'Photocopie', price: 50, category: 'Impression' },
  { id: 6, name: 'Saisie / Secrétariat (Page)', price: 500, category: 'Bureautique' },
  { id: 7, name: 'Infographie / Flyer', price: 5000, category: 'Design' },
  { id: 8, name: 'Wi-Fi Ticket (1 Semaine)', price: 2500, category: 'Réseau' },
];

export default function CaisseManKo() {
  const [role, setRole] = useState('Contributeur');
  const [activeTab, setActiveTab] = useState('caisse'); // 'caisse', 'bilan', 'tarifs'
  
  // Catalogue avec persistance locale
  const [services, setServices] = useState(() => {
    const saved = localStorage.getItem('manko_services');
    return saved ? JSON.parse(saved) : INITIAL_SERVICES;
  });

  // Historique des ventes avec persistance locale
  const [salesHistory, setSalesHistory] = useState(() => {
    const saved = localStorage.getItem('manko_sales');
    return saved ? JSON.parse(saved) : [];
  });

  const [clientName, setClientName] = useState('');
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Espèces'); // 'Espèces', 'Mobile Money', 'Carte'
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // États pour l'ajout/modification de tarifs (Admin)
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('Cyber');

  // Sauvegarde automatique dans localStorage
  useEffect(() => {
    localStorage.setItem('manko_services', JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    localStorage.setItem('manko_sales', JSON.stringify(salesHistory));
  }, [salesHistory]);

  const addToCart = (service) => {
    const existing = cart.find((item) => item.id === service.id);
    if (existing) {
      setCart(cart.map((item) => item.id === service.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...service, quantity: 1 }]);
    }
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map((item) => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalToPay = Math.max(0, subtotal - discount);
  const changeDue = (paymentMethod === 'Espèces' && amountReceived) ? Math.max(0, parseFloat(amountReceived) - totalToPay) : 0;

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleValidateSale = () => {
    if (cart.length === 0) return;

    const newSale = {
      id: Date.now(),
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      client: clientName || 'Client de passage',
      items: [...cart],
      subtotal,
      discount,
      total: totalToPay,
      paymentMethod,
      amountReceived: paymentMethod === 'Espèces' ? (parseFloat(amountReceived) || totalToPay) : totalToPay,
      changeDue: paymentMethod === 'Espèces' ? changeDue : 0
    };

    setSalesHistory([newSale, ...salesHistory]);
    window.print();

    setCart([]);
    setClientName('');
    setDiscount(0);
    setAmountReceived('');
    setPaymentMethod('Espèces');
    setSuccessMessage('Vente enregistrée et stockée avec succès !');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Gestion des tarifs par l'administrateur
  const handleAddService = (e) => {
    e.preventDefault();
    if (!newServiceName || !newServicePrice) return;

    const newItem = {
      id: Date.now(),
      name: newServiceName,
      price: parseFloat(newServicePrice),
      category: newServiceCategory
    };

    setServices([...services, newItem]);
    setNewServiceName('');
    setNewServicePrice('');
    setSuccessMessage('Nouveau service ajouté au catalogue !');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDeleteService = (id) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce service ?')) {
      setServices(services.filter(s => s.id !== id));
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (salesHistory.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,ID;Heure;Client;Articles;Sous-total;Remise;Total (FCFA);Mode de Paiement\r\n";

    salesHistory.forEach((sale) => {
      const itemsList = sale.items.map(i => `${i.name} (x${i.quantity})`).join(' | ');
      const row = [
        sale.id,
        sale.date,
        `"${sale.client}"`,
        `"${itemsList}"`,
        sale.subtotal,
        sale.discount,
        sale.total,
        sale.paymentMethod
      ];
      csvContent += row.join(";") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bilan_caisse_manko_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalRevenue = salesHistory.reduce((acc, sale) => acc + sale.total, 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6 font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #thermal-receipt, #thermal-receipt * { visibility: visible; }
          #thermal-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 58mm;
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            color: #000;
            padding: 5px;
            background: #fff;
          }
        }
      `}} />

      {/* En-tête */}
      <header className="flex flex-col md:flex-row justify-between items-center border-b border-slate-800 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-wide text-amber-400">Cyber chez Man'ko</h1>
          <p className="text-sm text-slate-400">Facturation · Tech & Culture Hub</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-4 md:mt-0">
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setActiveTab('caisse')}
              className={`px-3 py-1.5 rounded-md transition-all ${activeTab === 'caisse' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'}`}
            >
              Caisse
            </button>
            <button
              onClick={() => setActiveTab('bilan')}
              className={`px-3 py-1.5 rounded-md transition-all ${activeTab === 'bilan' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'}`}
            >
              Bilan ({salesHistory.length})
            </button>
            {role === 'Admin' && (
              <button
                onClick={() => setActiveTab('tarifs')}
                className={`px-3 py-1.5 rounded-md transition-all ${activeTab === 'tarifs' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'}`}
              >
                Gérer Tarifs ⚙️
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Rôle :</span>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                if (e.target.value !== 'Admin' && activeTab === 'tarifs') setActiveTab('caisse');
              }}
              className="bg-slate-800 border border-slate-700 text-xs rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-amber-400"
            >
              <option value="Lecteur">Lecture seule</option>
              <option value="Contributeur">Contributeur</option>
              <option value="Admin">Administrateur</option>
            </select>
          </div>
        </div>
      </header>

      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded mb-6 text-sm flex items-center justify-between">
          <span>{successMessage}</span>
        </div>
      )}

      {/* 1. ONGLET CAISSE */}
      {activeTab === 'caisse' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-200">Tarifs & Services</h2>
                <input
                  type="text"
                  placeholder="Rechercher un service..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-sm rounded-lg px-3 py-1.5 w-64 text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredServices.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => role !== 'Lecteur' && addToCart(service)}
                    disabled={role === 'Lecteur'}
                    className={`text-left p-3 rounded-lg border transition-all flex justify-between items-center ${
                      role === 'Lecteur' ? 'opacity-50 cursor-not-allowed border-slate-800 bg-slate-900/50' : 'border-slate-700 bg-slate-800 hover:border-amber-400'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-sm text-slate-100">{service.name}</p>
                      <span className="text-xs text-slate-400">{service.category}</span>
                    </div>
                    <span className="font-bold text-amber-400 text-sm">{service.price} F</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col justify-between shadow-xl">
            <div>
              <h2 className="text-lg font-semibold mb-4 text-slate-200 border-b border-slate-700 pb-2">Reçu en cours</h2>
              <div className="mb-4">
                <label className="block text-xs text-slate-400 mb-1">Client (facultatif)</label>
                <input
                  type="text"
                  placeholder="Nom ou contact"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-sm rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto mb-4 pr-1">
                {cart.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">Aucun service sélectionné</p>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-slate-900/60 p-2 rounded border border-slate-800 text-sm">
                      <div className="flex-1 pr-2">
                        <p className="text-slate-200 text-xs font-medium">{item.name}</p>
                        <span className="text-xs text-amber-400">{item.price * item.quantity} F</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 bg-slate-800 rounded border border-slate-700 text-xs">-</button>
                        <span className="text-xs font-semibold w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 bg-slate-800 rounded border border-slate-700 text-xs">+</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2 border-t border-slate-700 pt-3 text-sm">
                <div className="flex justify-between text-slate-400 text-xs">
                  <span>Sous-total</span><span>{subtotal} F</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Remise (FCFA)</span>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex justify-between font-bold text-base text-slate-100 pt-2 border-t border-slate-700/50">
                  <span>Total à payer</span><span className="text-amber-400">{totalToPay} F</span>
                </div>

                {/* Mode de Paiement */}
                <div className="pt-2">
                  <label className="block text-xs text-slate-400 mb-1">Mode de paiement</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-xs rounded px-2 py-1.5 text-slate-100 focus:outline-none focus:border-amber-400"
                  >
                    <option value="Espèces">Espèces</option>
                    <option value="Mobile Money">Mobile Money (Wave / Orange)</option>
                    <option value="Carte">Carte Bancaire</option>
                  </select>
                </div>

                {/* Montant reçu uniquement si Espèces */}
                {paymentMethod === 'Espèces' && (
                  <div className="pt-2">
                    <label className="block text-xs text-slate-400 mb-1">Montant reçu (FCFA)</label>
                    <input
                      type="number"
                      placeholder="Ex: 5000"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-sm rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-400"
                    />
                    {amountReceived && (
                      <div className="flex justify-between text-xs mt-2 text-emerald-400 font-medium">
                        <span>Monnaie à rendre :</span><span>{changeDue} F</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <button
                onClick={handleValidateSale}
                disabled={cart.length === 0 || role === 'Lecteur'}
                className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all shadow-md ${
                  cart.length === 0 || role === 'Lecteur'
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold'
                }`}
              >
                Valider & Imprimer le Reçu 🖨️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ONGLET BILAN */}
      {activeTab === 'bilan' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
              <p className="text-xs text-slate-400">Chiffre d'Affaires Global</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{totalRevenue} F</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
              <p className="text-xs text-slate-400">Nombre de Reçus</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">{salesHistory.length}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
              <p className="text-xs text-slate-400">Stockage</p>
              <p className="text-sm font-semibold text-emerald-400 mt-2">Persistant (Local)</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex flex-col justify-between">
              <p className="text-xs text-slate-400">Archivage</p>
              <button
                onClick={handleExportCSV}
                disabled={salesHistory.length === 0}
                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  salesHistory.length === 0 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                Exporter le Bilan (CSV) 📊
              </button>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-base font-semibold mb-4 text-slate-200">Journal des Ventes</h3>
            {salesHistory.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">Aucune vente enregistrée.</p>
            ) : (
              <div className="space-y-3">
                {salesHistory.map((sale) => (
                  <div key={sale.id} className="bg-slate-900/70 border border-slate-800 p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 font-mono">{sale.date}</span>
                        <span className="text-sm font-medium text-slate-200">Client : {sale.client}</span>
                        <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">{sale.paymentMethod}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        {sale.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-amber-400">{sale.total} F</span>
                      {sale.paymentMethod === 'Espèces' && (
                        <p className="text-xs text-slate-500">Reçu: {sale.amountReceived} F | Monnaie: {sale.changeDue} F</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. ONGLET GESTION DES TARIFS (ADMIN) */}
      {activeTab === 'tarifs' && role === 'Admin' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 h-fit">
            <h3 className="text-base font-semibold mb-4 text-slate-200">Ajouter un service</h3>
            <form onSubmit={handleAddService} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nom du service</label>
                <input
                  type="text"
                  placeholder="Ex: Scan de documents"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Prix (FCFA)</label>
                <input
                  type="number"
                  placeholder="Ex: 100"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Catégorie</label>
                <select
                  value={newServiceCategory}
                  onChange={(e) => setNewServiceCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="Cyber">Cyber</option>
                  <option value="Impression">Impression</option>
                  <option value="Bureautique">Bureautique</option>
                  <option value="Design">Design</option>
                  <option value="Réseau">Réseau</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg transition-all"
              >
                Ajouter au catalogue
              </button>
            </form>
          </div>

          <div className="md:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-base font-semibold mb-4 text-slate-200">Catalogue Actuel des Tarifs</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {services.map((s) => (
                <div key={s.id} className="flex justify-between items-center bg-slate-900/60 p-3 rounded border border-slate-800 text-sm">
                  <div>
                    <p className="font-medium text-slate-200">{s.name}</p>
                    <span className="text-xs text-slate-400">Catégorie : {s.category}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-amber-400">{s.price} F</span>
                    <button
                      onClick={() => handleDeleteService(s.id)}
                      className="text-red-400 hover:text-red-300 text-xs bg-red-500/10 border border-red-500/20 px-2 py-1 rounded"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODÈLE DE REÇU THERMIQUE MASQUÉ */}
      {cart.length > 0 && (
        <div id="thermal-receipt" className="hidden">
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: '0', fontSize: '14px', fontWeight: 'bold' }}>CYBER CHEZ MAN'KO</h3>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>Tech & Culture Hub</p>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>Reçu de Caisse</p>
          </div>
          <p style={{ margin: '5px 0', borderBottom: '1px dashed #000', paddingBottom: '3px', fontSize: '10px' }}>
            Date : {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}<br />
            Client : {clientName || 'Passage'}<br />
            Paiement : {paymentMethod}
          </p>
          <div style={{ margin: '5px 0', borderBottom: '1px dashed #000', paddingBottom: '5px', fontSize: '11px' }}>
            {cart.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span>{item.name} x{item.quantity}</span>
                <span>{item.price * item.quantity}F</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '11px', margin: '5px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Sous-total:</span><span>{subtotal} F</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Remise:</span><span>-{discount} F</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', margin: '4px 0' }}>
              <span>TOTAL:</span><span>{totalToPay} F</span>
            </div>
            {paymentMethod === 'Espèces' && amountReceived && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Reçu:</span><span>{amountReceived} F</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Monnaie:</span><span>{changeDue} F</span>
                </div>
              </>
            )}
          </div>
          <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '10px' }}>
            <p style={{ margin: '2px 0' }}>Merci de votre visite !</p>
            <p style={{ margin: '2px 0' }}>À bientôt chez Man'ko</p>
          </div>
        </div>
      )}
    </div>
  );
}