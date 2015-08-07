module.exports = function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      app: {
        id: 'switcher',
        main: 'plugins/appSwitcher/appSwitcher',
        hidden: true,
        autoload: kibana.autoload.styles
      }
    }
  });
};
