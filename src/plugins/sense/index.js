module.exports = function (kibana) {
  return new kibana.Plugin({
    exports: {
      app: {
        title: 'Sense',
        description: 'like cURL, but for elasticsearch and helpfull',
        icon: 'plugins/sense/icon.png',
        main: 'plugins/sense/sense'
      }
    }
  });
};
