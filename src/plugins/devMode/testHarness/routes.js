'use strict';

module.exports = function (server, kbnServer) {
  let resolve = require('path').resolve;

  let fromRoot = require('../../../utils/fromRoot');
  let UiApp = require('../../../server/ui/UiApp');

  let srcPath = fromRoot('src');

  server.redirectToSlash('/tests/plugins/{pluginId}');

  server.route({
    path: '/tests',
    method: 'GET',
    handler: function (req, reply) {
      return reply.renderApp(new UiApp(kbnServer.uiExports, {
        id: 'tests'
      }), 'testHarness');
    }
  });

  server.route({
    path: '/tests/bundle.js',
    method: 'GET',
    handler: function (req, reply) {
      return reply.renderTestPart(srcPath, 'bundle', 'application/javascript');
    }
  });

  server.route({
    path: '/tests/a6b5151f.bundle.js.map',
    method: 'GET',
    handler: function (req, reply) {
      return reply.renderTestPart(srcPath, 'sourceMap', 'text/plain');
    }
  });

  server.route({
    path: '/tests/style.css',
    method: 'GET',
    handler: function (req, reply) {
      return reply.renderTestPart(srcPath, 'style', 'text/css');
    }
  });
};
