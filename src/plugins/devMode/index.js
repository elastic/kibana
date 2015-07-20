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

  const SRC = fromRoot('src');
  const UI = fromRoot('src/ui');

  // if (!kibana.config.get('env.dev')) return;

  return new kibana.Plugin({
    init: function (server, options) {
      server.ext('onPreHandler', istanbul({ root: SRC, displayRoot: SRC, filter: kibanaSrcFilter }));
      server.ext('onPreHandler', istanbul({ root: UI,  displayRoot: SRC, filter: kibanaSrcFilter }));

      server.setupViews(__dirname);

      let TestHarnessBuilder; // initialized in mixin below
      let currentBuilder = null;

      function getBuilder(path) {
        if (!currentBuilder || currentBuilder.path !== path) {
          currentBuilder = new TestHarnessBuilder(path);
        }
        return currentBuilder;
      }

      server.decorate('reply', 'renderTestHarness', function (path) {
        let reply = this;

        getBuilder(path).render().then(function (output) {
          if (!output || !output.bundle) {
            return reply(Boom.create(500, 'failed to build test bundle'));
          }

          return reply(output.bundle).type('application/javascript');
        });
      });

      server.decorate('reply', 'renderTestHarnessSourceMap', function (path) {
        let reply = this;

        getBuilder(path).render().then(function (output) {
          if (!output) {
            return reply(Boom.create(500, 'failed to build test bundle'));
          }

          if (!output.map) {
            return reply(Boom.notFound());
          }

          reply(output.map);
        });
      });

      server.redirectToSlash('/tests/plugins/{pluginId}');

      server.route({
        path: '/tests/plugins/{pluginId}/',
        method: 'GET',
        config: {
          pre: [
            'kbnPluginById(params.pluginId)'
          ],
          handler: function (req, reply) {
            return reply.view('testHarness.jade', {
              bundlePath: `/testBundle/plugins/${req.params.pluginId}/`,
            });
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
            return reply.renderTestHarness(req.pre.kbnPluginById.publicDir);
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
            return reply.renderTestHarnessSourceMap(req.pre.kbnPluginById.publicDir);
          }
        }
      });

      return kibana.mixin(function (kbnServer) {
        TestHarnessBuilder = require('./TestHarnessBuilder')(kbnServer);
      });
    },

    uiExports: {
      spyModes: [
        'plugins/devMode/visDebugSpyPanel'
      ],

      modules: {
        sinon$: {
          path: fromRoot('node_modules/sinon/pkg/sinon.js'),
          parse: false
        },
        fixtures: fromRoot('src/fixtures'),
        testUtils: fromRoot('src/testUtils'),
        mocha$: {
          path: fromRoot('node_modules/mocha/mocha.js'),
          exports: 'window.mocha'
        },
        'angular-mocks': {
          path: require.resolve('angular-mocks'),
          imports: 'angular,mocha'
        },
      }
    }
  });
};
