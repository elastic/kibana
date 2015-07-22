'use strict';

module.exports = function devModePlugin(kibana) {
  let _ = require('lodash');
  let webpack = require('webpack');

  // let bundle = require('../../server/optimize/testBundler');
  let istanbul = require('./istanbul');
  let kibanaSrcFilter = require('./kibanaSrcFilter');
  let resolve = require('path').resolve;
  let extname = require('path').extname;
  let relative = require('path').relative;
  let Boom = require('boom');

  let fromRoot = require('../../utils/fromRoot');
  let pathContains = require('../../utils/pathContains');
  let UiApp = require('../../server/ui/UiApp');

  const SRC = fromRoot('src');
  const UI = fromRoot('src/ui');

  // if (!kibana.config.get('env.dev')) return;

  return new kibana.Plugin({
    init: function (server, options) {
      return kibana.mixin(function (kbnServer) {

        let TestHarnessBuilder = require('./TestHarnessBuilder')(kbnServer);

        server.ext('onPreHandler', istanbul({ root: SRC, displayRoot: SRC, filter: kibanaSrcFilter }));
        server.ext('onPreHandler', istanbul({ root: UI,  displayRoot: SRC, filter: kibanaSrcFilter }));
        server.setupViews(resolve(__dirname, 'views'));

        server.redirectToSlash('/tests/plugins/{pluginId}');

        let currentBuilder = null;
        server.decorate('reply', 'renderTestPart', function (basePath, part, mimeType) {
          let reply = this;

          if (!currentBuilder || currentBuilder.path !== basePath) {
            currentBuilder = new TestHarnessBuilder(basePath);
          }

          currentBuilder.render().then(function (output) {
            if (!output || !output.bundle) {
              return reply(Boom.create(500, 'failed to build test bundle'));
            }

            return reply(output[part]).type(mimeType);
          });
        });

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
                autoload: {
                  angular: [],
                  require: []
                }
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

      });
    },

    uiExports: {
      spyModes: [
        'plugins/devMode/visDebugSpyPanel'
      ],

      modules: {
        ngMock$: 'plugins/devMode/ngMock',
        sinon$: {
          path: fromRoot('node_modules/sinon/pkg/sinon.js'),
          parse: false
        },
        fixtures: fromRoot('src/fixtures'),
        testUtils: fromRoot('src/testUtils'),
        mocha$: {
          path: fromRoot('node_modules/mocha/mocha.js'),
          exports: 'window.mocha',
          imports: 'mochaStyles'
        },
        mochaStyles$: fromRoot('node_modules/mocha/mocha.css'),
        'angular-mocks': {
          path: require.resolve('angular-mocks'),
          imports: 'angular,mocha'
        },
      },

      loaders: [
        { test: /\/__tests__\//, loader: 'imports?mocha' }
      ]
    }
  });
};
