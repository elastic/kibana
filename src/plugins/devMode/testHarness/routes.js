'use strict';

module.exports = function (server, kbnServer) {
  let resolve = require('path').resolve;

  let UiApp = require('../../../server/ui/UiApp');

  server.setupViews(resolve(__dirname, 'views'));
  server.redirectToSlash('/tests/plugins/{pluginId}');

  server.route({
    path: '/tests/plugins/{pluginId}/',
    method: 'GET',
    config: {
      pre: [
        'kbnPluginById(params.pluginId)'
      ],
      handler: function (req, reply) {
        let pluginId = req.params.pluginId;

        let app = new UiApp(kbnServer.uiExports, {
          id: `tests/plugins/${pluginId}`,
          main: `/testBundle/plugins/${pluginId}/`,
          autoload: []
        });

        return reply.renderApp(app, 'testHarness');
      }
    }
  });

  server.route({
    path: '/testBundle/plugins/{pluginId}/',
    method: 'GET',
    config: {
      pre: [
        'kbnPluginById(params.pluginId)'
      ],
      handler: function (req, reply) {
        return reply.renderTestPart(req.pre.kbnPluginById.publicDir, 'bundle', 'application/javascript');
      }
    }
  });

  server.route({
    path: '/testBundle/plugins/{pluginId}/*.map',
    method: 'GET',
    config: {
      pre: [
        'kbnPluginById(params.pluginId)'
      ],
      handler: function (req, reply) {
        return reply.renderTestPart(req.pre.kbnPluginById.publicDir, 'sourceMap', 'text/plain');
      }
    }
  });

  server.route({
    path: '/testBundle/plugins/{pluginId}/css',
    method: 'GET',
    config: {
      pre: [
        'kbnPluginById(params.pluginId)'
      ],
      handler: function (req, reply) {
        return reply.renderTestPart(req.pre.kbnPluginById.publicDir, 'style', 'text/css');
      }
    }
  });
};
