module.exports = kibana => new kibana.Plugin({
  uiExports: {
    app: {
      name: 'test_app',
      main: 'plugins/test_app/index.js',
      injectVars() {
        return {
          from_test_app: true
        };
      }
    }
  }
});
