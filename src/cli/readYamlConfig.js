var _ = require('lodash');
var fs = require('fs');
var yaml = require('js-yaml');
var fromRoot = require('../utils/fromRoot');

var legacySettingMap = {
  // server
  port: 'server.port',
  host: 'server.host',
  pid_file: 'pid.file',
  ssl_cert_file: 'server.ssl.cert',
  ssl_key_file: 'server.ssl.key',

  // logging
  log_file: 'logging.dest',

  // kibana
  kibana_index: 'kibana.index',
  default_app_id: 'kibana.defaultAppId',

  // es
  ca: 'elasticsearch.ssl.ca',
  elasticsearch_preserve_host: 'elasticsearch.preserveHost',
  elasticsearch_url: 'elasticsearch.url',
  kibana_elasticsearch_client_crt: 'elasticsearch.ssl.cert',
  kibana_elasticsearch_client_key: 'elasticsearch.ssl.key',
  kibana_elasticsearch_password: 'elasticsearch.password',
  kibana_elasticsearch_username: 'elasticsearch.username',
  ping_timeout: 'elasticsearch.pingTimeout',
  request_timeout: 'elasticsearch.requestTimeout',
  shard_timeout: 'elasticsearch.shardTimeout',
  startup_timeout: 'elasticsearch.startupTimeout',
  verify_ssl: 'elasticsearch.ssl.verify',
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

