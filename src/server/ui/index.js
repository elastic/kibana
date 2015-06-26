module.exports = function (kibana, server, config) {
  var _ = require('lodash');
  var join = require('path').join;

  // setup jade for templates
  server.views({
    path: join(__dirname, 'views'),
    engines: {
      jade: require('jade')
    }
  });

  return kibana.mixin(
    require('./helpers'),
    require('./statics'),
    require('./apps')
  );

};
