var _ = require('lodash');
var Promise = require('bluebird');
var Hapi = require('hapi');
var requirePlugins = require('./lib/plugins/require_plugins');
var extendHapi = require('./lib/extend_hapi');
var join = require('path').join;

function Kibana(settings, plugins) {
  this.server = new Hapi.Server();

  // Extend Hapi with Kibana
  extendHapi(this.server);

  var config = this.server.config();
  if (settings) config.set(settings);

  // Load external plugins
  this.plugins = [];
  var externalPluginsFolder = config.get('kibana.externalPluginsFolder');
  if (externalPluginsFolder) {
    this.plugins = _([externalPluginsFolder])
      .flatten()
      .map(requirePlugins)
      .flatten()
      .value();
  }

  this.plugins = this.plugins.concat(plugins);

}

Kibana.prototype.listen = function () {
  var config = this.server.config();
  var self = this;
  // Create a new connection
  this.server.connection({
    host: config.get('kibana.server.host'),
    port: config.get('kibana.server.port')
  });

  return this.server.loadKibanaPlugins(this.plugins)
  .then(function () {
    // Start the server
    return new Promise(function (resolve, reject) {
      self.server.start(function (err) {
        if (err) return reject(err);
        self.server.log('server', 'Server running at ' + self.server.info.uri);
        resolve(self.server);
      });
    });
  })
  .catch(function (err) {
    self.server.log('fatal', err);
    console.log(err.stack);
    return Promise.reject(err);
  });
};

Kibana.Plugin = require('./lib/plugins/plugin');
module.exports = Kibana;

if (require.main === module) {
  var kibana = new Kibana();
  kibana.listen().catch(function (err) {
    process.exit(1);
  });
}
