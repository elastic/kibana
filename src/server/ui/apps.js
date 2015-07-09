module.exports = function (kbnServer, server, config) {
  var _ = require('lodash');
  var Boom = require('boom');
  var uiExports = kbnServer.uiExports;
  var apps = uiExports.apps;
  var hiddenApps = uiExports.apps.hidden;

  // serve the app switcher
  server.route({
    path: '/apps',
    method: 'GET',
    handler: function (req, reply) {
      var switcher = hiddenApps.byId.switcher;
      if (!switcher) return reply(Boom.notFound('app switcher not installed'));
      return reply.renderApp(switcher);
    }
  });

  // serve the app switcher
  server.route({
    path: '/api/apps',
    method: 'GET',
    handler: function (req, reply) {
      return reply(apps);
    }
  });

  server.route({
    path: '/app/{id}',
    method: 'GET',
    handler: function (req, reply) {
      var id = req.params.id;
      var app = apps.byId[id];
      if (!app) return reply(Boom.notFound('Unkown app ' + id));

      return reply.renderApp(app);
    }
  });
};
