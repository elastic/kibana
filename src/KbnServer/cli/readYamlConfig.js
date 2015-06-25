var _ = require('lodash');
var fs = require('fs');
var yaml = require('js-yaml');

var legacySettingMap = {
  port: 'kibana.server.port',
  host: 'kibana.server.host',
  elasticsearch_url: 'elasticsearch.url',
  elasticsearch_preserve_host: 'elasticsearch.preserveHost',
  config_index: 'config.index',
  config_elasticsearch_username: 'elasticsearch.username',
  config_elasticsearch_password: 'elasticsearch.password',
  config_elasticsearch_client_crt: 'elasticsearch.ssl.cert',
  config_elasticsearch_client_key: 'elasticsearch.ssl.key',
  ca: 'elasticsearch.ssl.ca',
  verify_ssl: 'elasticsearch.ssl.verify',
  default_app_id: 'kibana.defaultAppId',
  ping_timeout: 'elastcsearch.pingTimeout',
  request_timeout: 'elastcsearch.requestTimeout',
  shard_timeout: 'elastcsearch.shardTimeout',
  startup_timeout: 'elastcsearch.startupTimeout',
  ssl_cert_file: 'kibana.server.ssl.cert',
  ssl_key_file: 'kibana.server.ssl.key',
  pid_file: 'config.server.pidFile',
  log_file: 'logging.file',
  bundled_plugin_ids: 'kibana.bundledPluginIds'
};

module.exports = function (path) {
  if (!path) return {};

  var file = yaml.safeLoad(fs.readFileSync(path, 'utf8'));

  // transform legeacy options into new namespaced versions
  return _.transform(file, function (config, val, key) {
    if (legacySettingMap.hasOwnProperty(key)) {
      key = legacySettingMap[key];
    }

    _.set(config, key, val);
  }, {});
};

