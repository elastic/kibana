module.exports = function (server) {
  server.decorate('server', 'config', require('./config'));
  server.decorate('server', 'loadKibanaPlugins', require('./plugins/load_kibana_plugins'));
};
