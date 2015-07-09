module.exports = function devServerPlugin(kibana) {
  var _ = require('lodash');
  var KbnServer = require('../server/KbnServer');

  var glob = require('glob');
  var join = require('path').join;
  var basename = require('path').basename;
  var relative = require('path').relative;
  var normalize = require('path').normalize;

  var ROOT = join(__dirname, '..', '..', '..');
  var fromRoot = function () {
    return normalize(join([ROOT].concat(_.toArray(arguments))));
  };

  var SRC = fromRoot('src');
  var NODE_MODULES = fromRoot('node_modules');
  var UI = fromRoot('src/ui');
  var TEST = fromRoot('test');
  var UNIT = fromRoot('test/unit');
  var SPECS = fromRoot('test/unit/specs/**/*.js');
  var istanbul = require('./lib/istanbul');
  var amdWrapper = require('./lib/amd_wrapper');
  var kibanaSrcFilter = require('./lib/kibana_src_filter');

  return new kibana.Plugin({
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
