module.exports = function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      app: {
        id: 'appSwitcher',
        main: 'plugins/appSwitcher/appSwitcher',
        hidden: true,
        autoload: kibana.autoload.styles
      }
    }
  });
};
