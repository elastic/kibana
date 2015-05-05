var _ = require('lodash');
var Promise = require('bluebird');
var Hapi = require('hapi');
var requirePlugins = require('./plugins/require_plugins');
var validatePlugin = require('./plugins/validate_plugin');
var extendHapi = require('./extend_hapi');
var join = require('path').join;


module.exports = function (settings, plugins) {
  // Plugin authors can use this to add plugins durring development
  plugins = plugins || [];

  if (plugins.length && !plugins.every(validatePlugin)) {
    return Promise.reject(new Error('Plugins must have a name attribute.'));
  }

  // Initalize the Hapi server
  var server = new Hapi.Server();

  // Extend Hapi with Kibana
  extendHapi(server);

  var config = server.config();
  if (settings) config.set(settings);

  // Create a new connection
  server.connection({
    host: config.get('kibana.server.host'),
    port: config.get('kibana.server.port')
  });

  // Load external plugins
  var externalPlugins = [];
  var externalPluginsFolder = config.get('kibana.externalPluginsFolder');
  if (externalPluginsFolder) {
    externalPlugins = _([externalPluginsFolder])
      .flatten()
      .map(requirePlugins)
      .flatten()
      .value();
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
    console.log(err.stack);
    return Promise.reject(err);
  });
};
