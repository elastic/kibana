export default kibana => new kibana.Plugin({
  uiExports: {
    app: {
      name: 'test_app',
      main: 'plugins/test_app/index.js',
    },

    injectDefaultVars() {
      return {
        from_defaults: true
      };
    }
  },
  init(server) {
    server.injectUiAppVars('test_app', () => ({
      from_test_app: true
    }));
  }
});
