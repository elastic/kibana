let _ = require('lodash');
let fs = require('fs');
let yaml = require('js-yaml');

let utils = require('requirefrom')('src/utils');
let fromRoot = utils('fromRoot');

let legacySettingMap = {
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
  tilemap_url: 'tilemap.url',
  tilemap_min_zoom: 'tilemap.options.minZoom',
  tilemap_max_zoom: 'tilemap.options.maxZoom',
  tilemap_attribution: 'tilemap.options.attribution',
  tilemap_subdomains: 'tilemap.options.subdomains',
  verify_ssl: 'elasticsearch.ssl.verify',
};

const deprecatedSettings = {
  'server.xsrf.token': 'server.xsrf.token is deprecated. It is no longer used when providing xsrf protection.'
};

module.exports = function (path) {
  if (!path) return {};

  let file = yaml.safeLoad(fs.readFileSync(path, 'utf8'));

  function apply(config, val, key) {
    if (_.isPlainObject(val)) {
      _.forOwn(val, function (subVal, subKey) {
        apply(config, subVal, key + '.' + subKey);
      });
    }
    else if (_.isArray(val)) {
      config[key] = [];
      val.forEach((subVal, i) => {
        apply(config, subVal, key + '.' + i);
      });
    }
    else {
      _.set(config, key, val);
    }
  }

  _.each(deprecatedSettings, function (message, setting) {
    if (_.has(file, setting)) console.error(message);
  });

  // transform legeacy options into new namespaced versions
  return _.transform(file, function (config, val, key) {
    if (legacySettingMap.hasOwnProperty(key)) {
      key = legacySettingMap[key];
    }

    apply(config, val, key);
  }, {});
};

