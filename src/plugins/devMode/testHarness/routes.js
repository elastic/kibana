'use strict';

module.exports = function (server, kbnServer) {
  let resolve = require('path').resolve;

  let src = require('requirefrom')('src');
  let fromRoot = src('utils/fromRoot');
  let UiApp = src('server/ui/UiApp');

  let srcPath = fromRoot('src');

  server.redirectToSlash('/tests/plugins/{pluginId}');
  server.exposeStaticFile('/tests/mocha.js', fromRoot('node_modules/mocha/mocha.js'));
  server.exposeStaticFile('/tests/mocha.css', fromRoot('node_modules/mocha/mocha.css'));

  server.route({
    path: '/tests',
    method: 'GET',
    handler: function (req, reply) {
      return reply.renderApp(new UiApp(kbnServer.uiExports, {
        id: 'tests',
        templateName: 'testHarness',
        requireOptimizeGreen: false
      }));
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
