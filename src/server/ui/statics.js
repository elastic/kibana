module.exports = function (kbnServer, server, config) {
  server.exposeStaticDir('/ui/{path*}', require('./assets').root);
};
