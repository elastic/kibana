module.exports = (kibana) => new kibana.Plugin({
  uiExports: {
    app: {
      id: 'login',
      main: 'plugins/login/login',
      hidden: true,
      autoload: kibana.autoload.styles
    }
  }
});