'use strict';

module.exports = function (kbnServer, server, config) {
  let _ = require('lodash');
  let Boom = require('boom');
  let formatUrl = require('url').format;

  let uiExports = kbnServer.uiExports;
  let apps = uiExports.apps;
  let hiddenApps = uiExports.apps.hidden;

  // serve the app switcher
  server.route({
    path: '/apps',
    method: 'GET',
    handler: function (req, reply) {
      let switcher = hiddenApps.byId.switcher;
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
      let id = req.params.id;
      let app = apps.byId[id];
      if (!app) return reply(Boom.notFound('Unkown app ' + id));

      if (kbnServer.status.isGreen()) {
        return reply.renderApp(app);
      } else {
        return reply.renderStatusPage();
      }

    }
  });
};
