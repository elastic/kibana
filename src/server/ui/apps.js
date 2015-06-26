module.exports = function (kibana, server, config) {
  var _ = require('lodash');
  var Boom = require('boom');

  var defaultModuleIds = require('./lib/defaultModuleIds');
  var UiExports = require('./lib/UiExports');
  var UiApp = require('./lib/UiApp');

  // export manager
  kibana.uiExports = new UiExports(defaultModuleIds());
  var switcherApp = new UiApp(kibana.uiExports, null, {
    id: 'appSwitcher',
    main: 'appSwitcher/index'
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
      return reply(_.values(kibana.uiExports.apps));
    }
  });

  server.route({
    path: '/app/{id}',
    method: 'GET',
    handler: function (req, reply) {
      var id = req.params.id;
      var app = kibana.uiExports.apps[id];
      if (!app) return reply(Boom.notFound('Unkown app ' + id));

      return reply.renderApp(app);
    }
  });
};
