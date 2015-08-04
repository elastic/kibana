module.exports = function (kbnServer, server, config) {
  var _ = require('lodash');
  var Promise = require('bluebird');
  var Boom = require('boom');
  var { join } = require('path');

  server.exposeStaticDir('/plugins/{id}/{path*}', function (req) {
    var id = req.params.id;
    var plugin = kbnServer.plugins.byId[id];
    return (plugin && plugin.publicDir) ? plugin.publicDir : Boom.notFound();
  });

  server.method('kbnPluginById', function (id, next) {
    if (kbnServer.plugins.byId[id]) {
      next(null, kbnServer.plugins.byId[id]);
    } else {
      next(Boom.notFound(`no plugin with the id "${id}"`));
    }
  });

  return kbnServer.mixin(
    require('./scan'),
    require('./load')
  );
};
