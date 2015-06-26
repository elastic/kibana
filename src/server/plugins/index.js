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

  server.exposeStaticDir('/plugins/{id}/{path*}', function (req) {
    var id = req.params.id;
    var plugin = _.get(server.plugins, [id, 'plugin']);
    return (plugin && plugin.publicDir) ? plugin.publicDir : Boom.notFound();
  });

  return Promise.try(scan, [server, scanDirs])
  .then(function (foundPaths) {
    return load(kibana, _.union(foundPaths, absolutePaths));
  });
};
