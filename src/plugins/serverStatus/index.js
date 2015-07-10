module.exports = function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      app: {
        title: 'Server Status',
        main: 'plugins/serverStatus/serverStatus',
        hidden: true,

        defaultModules: {
          angular: [],
          require: [
            'chrome',
            'angular-bootstrap'
          ]
          .concat(kibana.autoload.styles)
        }
      },

      loaders: [
        { test: /\/nvd3\//, loader: 'exports?nv' },
        { test: /\/angular-nvd3\//, loader: 'imports?angular,d3' }
      ]
    }
  });
};

