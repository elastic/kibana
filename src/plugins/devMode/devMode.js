'use strict';

module.exports = function devModePlugin(kibana) {
  let _ = require('lodash');

  let glob = require('glob');
  let join = require('path').join;
  let basename = require('path').basename;
  let relative = require('path').relative;
  let normalize = require('path').normalize;
  let istanbul = require('./istanbul');
  let amdWrapper = require('./amdWrapper');
  let kibanaSrcFilter = require('./kibanaSrcFilter');


  let fromRoot = require('../../utils/fromRoot');
  const ROOT = fromRoot('.');
  const SRC = fromRoot('src');
  const NODE_MODULES = fromRoot('node_modules');
  const UI = fromRoot('src/ui');
  const TEST = fromRoot('test');
  const UNIT = fromRoot('test/unit');
  const SPECS = fromRoot('test/unit/specs/**/*.js');

  return new kibana.Plugin({

    initCondition: function (config) {
      return config.get('env.dev');
    },

    init: function (server, options) {
      server.ext('onPreHandler', istanbul({ root: SRC, displayRoot: SRC, filter: kibanaSrcFilter }));
      server.ext('onPreHandler', istanbul({ root: UI, displayRoot: SRC, filter: kibanaSrcFilter }));

      server.exposeStaticDir('/test/{paths*}', TEST);
      server.route({
        path: '/amd-wrap/{paths*}',
        method: 'GET',
        handler: amdWrapper({ root: ROOT })
      });

      server.route({
        path: '/specs',
        method: 'GET',
        handler: function (request, reply) {
          glob(SPECS, function (err, files) {
            if (err) return reply(err);

            reply(
              files
              .filter(function (filename) {
                return basename(filename).charAt(0) !== '_';
              })
              .map(function (filename) {
                return relative(UNIT, filename).replace(/\\/g, '/').replace(/\.js$/, '');
              })
            );
          });
        }
      });
    }
  });
};
