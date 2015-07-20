module.exports = function (kbnServer, server, config) {
  var _ = require('lodash');
  var join = require('path').join;

  return kbnServer.mixin(
    require('./exports'),
    require('./helpers'),
    function () {
      server.setupViews(join(__dirname, 'views'));
      server.exposeStaticDir('/ui/{path*}', require('./assets').root);
    },
    require('./apps')
  );

};
