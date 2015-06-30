module.exports = function (kbnServer, server, config) {
  var _ = require('lodash');
  var Boom = require('boom');

  var UiExports = require('./lib/UiExports');
  var UiApp = require('./lib/UiApp');

  // export manager
  var uiExports = kbnServer.uiExports = new UiExports();
  var switcherApp = new UiApp(uiExports, null, {
    id: 'appSwitcher',
    title: 'Apps',
    main: 'appSwitcher/index',
    defaultModules: {
      angular: [],
      require: ['chrome']
    }
  });

  // serve the app switcher
  server.route({
    path: '/apps',
    method: 'GET',
    handler: function (req, reply) {
      return reply.renderApp(switcherApp);
    }
  });

  // serve the app switcher
  server.route({
    path: '/api/apps',
    method: 'GET',
    handler: function (req, reply) {
      return reply(_.values(uiExports.apps));
    }
  });

  server.route({
    path: '/app/{id}',
    method: 'GET',
    handler: function (req, reply) {
      var id = req.params.id;
      var app = uiExports.apps[id];
      if (!app) return reply(Boom.notFound('Unkown app ' + id));

      return reply.renderApp(app);
    }
  });
};
