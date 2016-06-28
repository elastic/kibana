
  function expiry() {
    return Expiry.forge.apply(Expiry, arguments);
  }

  expiry.Expiry = Expiry;

  expiry.VERSION = '<%= pkg.version %>';

  return expiry;
}));
