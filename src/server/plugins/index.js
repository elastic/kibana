module.exports = function (kbnServer, server, config) {
  var _ = require('lodash');
  var Promise = require('bluebird');
  var Boom = require('boom');
  var join = require('path').join;

  var scan = require('./scan');
  var load = require('./load');

  var scanDirs = [].concat(config.get('plugins.scanDirs'));
  var absolutePaths = [].concat(config.get('plugins.paths'));

  return Promise.try(scan, [server, scanDirs])
  .then(function (foundPaths) {
    return load(kbnServer, _.union(foundPaths, absolutePaths));
  })
  .then(function () {

    if (config.get('plugins.optimize')) {
      kbnServer.mixin(require('./optimize'));
      server.exposeStaticDir('/plugins/{path*}', join(__dirname, 'bundles'));
    } else {
      server.exposeStaticDir('/plugins/{id}/{path*}', function (req) {
        var id = req.params.id;
        var plugin = _.get(server.plugins, [id, 'plugin']);
        return (plugin && plugin.publicDir) ? plugin.publicDir : Boom.notFound();
      });
    }

  });
};
