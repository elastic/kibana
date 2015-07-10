module.exports = function (kibana) {
  return new kibana.Plugin({

    init: function (server, options) {
      var app = this.app;

      server.expose('app', app);

      server.route({
        path: '/status',
        method: 'GET',
        handler: function (req, reply) {
          return reply.renderApp(app);
        }
      });

    },

    uiExports: {
      app: {
        title: 'Server Status',
        main: 'plugins/serverStatus/serverStatus',
        hidden: false,

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
        { test: /\/angular-nvd3\//, loader: 'imports?angular,d3' }
      ]
    }
  });
};

