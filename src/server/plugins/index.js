module.exports = function (kbnServer, server, config) {
  var _ = require('lodash');
  var Promise = require('bluebird');
  var Boom = require('boom');
  var join = require('path').join;

  server.exposeStaticDir('/plugins/{id}/{path*}', function (req) {
    var id = req.params.id;
    var plugin = kbnServer.plugins.byId[id];
    return (plugin && plugin.publicDir) ? plugin.publicDir : Boom.notFound();
  });

  return kbnServer.mixin(
    require('./scan'),
    require('./load')
  );
};
