'use strict';

module.exports = function devModePlugin(kibana) {
  if (!kibana.config.get('env.dev')) return;

  let _ = require('lodash');
  let webpack = require('webpack');
  let fromRoot = require('../../utils/fromRoot');

  return new kibana.Plugin({
    init: function (server, options) {
      let istanbul = require('./istanbul');
      let kibanaSrcFilter = require('./kibanaSrcFilter');
      let fromRoot = require('../../utils/fromRoot');
      const SRC = fromRoot('src');
      const UI = fromRoot('src/ui');

      server.ext('onPreHandler', istanbul({ root: SRC, displayRoot: SRC, filter: kibanaSrcFilter }));
      server.ext('onPreHandler', istanbul({ root: UI,  displayRoot: SRC, filter: kibanaSrcFilter }));

      return kibana.mixin(require('./testHarness')(server));
    },

    uiExports: {
      spyModes: [
        'plugins/devMode/visDebugSpyPanel'
      ],

      modules: {
        ngMock$: 'plugins/devMode/ngMock',
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
