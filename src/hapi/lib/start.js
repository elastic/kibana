var Promise = require('bluebird');
var Hapi = require('hapi');
var requirePlugins = require('./require_plugins');
var validatePlugin = require('./validate_plugin');
var extendHapi = require('./extend_hapi');

module.exports = function (plugins) {
  // Plugin authors can use this to add plugins durring development
  plugins = plugins || [];

  if (plugins.length && !plugins.every(validatePlugin)) {
    return Promise.reject(new Error('Plugins must have a name attribute.'));
  }

  // Initalize the Hapi server
  var server = new Hapi.Server();

  // Extend Hapi with Kibana
  extendHapi(server);

  // Create a new connection
  server.connection({ host: server.config().host, port: server.config().port });

  // Load external plugins
  var externalPlugins = [];
  if (server.config().external_plugins_folder) {
    externalPlugins = requirePlugins(server.config().external_plugins_folder);
  }

  // Load the plugins
  return server.loadKibanaPlugins(externalPlugins.concat(plugins))
  .then(function () {
    // Start the server
    return new Promise(function (resolve, reject) {
      server.start(function (err) {
        if (err) return reject(err);
        server.log('server', 'Server running at ' + server.info.uri);
        resolve(server);
      });
    });
  })
  .catch(function (err) {
    server.log('fatal', err);
    return Promise.reject(err);
  });
};
