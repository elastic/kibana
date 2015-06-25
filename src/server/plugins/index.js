module.exports = function (kibana) {
  var _ = require('lodash');
  var scan = require('./scan');
  var load = require('./load');
  var Promise = require('bluebird');
  var Boom = require('boom');
  var join = require('path').join;

  var server = kibana.server;
  var config = server.config();

  var scanDirs = [].concat(config.get('kibana.pluginScanDirs'));
  var absolutePaths = [].concat(config.get('kibana.pluginPaths'));

  server.route({
    path: '/plugins/{id}/{path*}',
    method: 'GET',
    handler: function (req, reply) {
      var id = req.params.id;
      var path = req.params.path;
      var plugin = _.get(server.plugins, [id, 'plugin']);
      if (!plugin || !plugin.publicDir || !path) {
        return reply(Boom.notFound());
      }

      return reply.file(join(plugin.publicDir, path));
    }
  });

  return Promise.try(scan, [server, scanDirs])
  .then(function (foundPaths) {
    return load(kibana, _.union(foundPaths, absolutePaths));
  });
};
