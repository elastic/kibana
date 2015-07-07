module.exports = function (kbnServer, server, config) {
  var _ = require('lodash');
  var join = require('path').join;

  // setup jade for templates
  server.views({
    path: join(__dirname, 'views'),
    isCached: config.get('optimize.viewCaching'),
    engines: {
      jade: require('jade')
    }
  });

  return kbnServer.mixin(
    require('./exports'),
    require('./helpers'),
    require('./statics'),
    require('./apps')
  );

};
