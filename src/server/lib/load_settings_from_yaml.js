var fs = require('fs');
var yaml = require('js-yaml');
module.exports = function (path) {
  var config = yaml.safeLoad(fs.readFileSync(path, 'utf8'));
  var settings = {};
  if (config.port) settings['kibana.server.port'] = config.port;
  if (config.host) settings['kibana.server.host'] = config.host;
  if (config.elasticsearch_url) settings['elasticsearch.url'] = config.elasticsearch_url;
  if (config.elasticsearch_preserve_host) settings['elasticsearch.preserveHost'] = config.elasticsearch_preserve_host;
  if (config.config_index) settings['config.index'] = config.config_index;
  if (config.config_elasticsearch_username) settings['elasticsearch.username'] = config.config_elasticsearch_username;
  if (config.config_elasticsearch_password) settings['elasticsearch.password'] = config.config_elasticsearch_password;
  if (config.config_elasticsearch_client_crt) settings['elasticsearch.ssl.cert'] = config.config_elasticsearch_client_crt;
  if (config.config_elasticsearch_client_key) settings['elasticsearch.ssl.key'] = config.config_elasticsearch_client_key;
  if (config.ca) settings['elasticsearch.ssl.ca'] = config.ca;
  if (config.verify_ssl) settings['elasticsearch.ssl.verify'] = config.verify_ssl;
  if (config.default_app_id) settings['kibana.defaultAppId'] = config.default_app_id;
  if (config.ping_timeout) settings['elastcsearch.pingTimeout'] = config.ping_timeout;
  if (config.request_timeout) settings['elastcsearch.requestTimeout'] = config.request_timeout;
  if (config.shard_timeout) settings['elastcsearch.shardTimeout'] = config.shard_timeout;
  if (config.startup_timeout) settings['elastcsearch.startupTimeout'] = config.startup_timeout;
  if (config.ssl_cert_file) settings['kibana.server.ssl.cert'] = config.ssl_cert_file;
  if (config.ssl_key_file) settings['kibana.server.ssl.key'] = config.ssl_key_file;
  if (config.pid_file) settings['config.server.pidFile'] = config.pid_file;
  if (config.log_file) settings['logging.file'] = config.log_file;
  if (config.bundled_plugin_ids) settings['kibana.bundledPluginIds'] = config.bundled_plugin_ids;
  return settings;
};

