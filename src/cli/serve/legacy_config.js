import { noop, transform } from 'lodash';

// legacySettings allow kibana 4.2+ to accept the same config file that people
// used for kibana 4.0 and 4.1. These settings are transformed to their modern
// equivalents at the very begining of the process
export const legacySettings = {
  // server
  port: 'server.port',
  host: 'server.host',
  pid_file: 'pid.file',
  ssl_cert_file: 'server.ssl.certificate',
  'server.ssl.cert': 'server.ssl.certificate',
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

// transform legacy options into new namespaced versions
export function rewriteLegacyConfig(object, log = noop) {
  return transform(object, (clone, val, key) => {
    if (legacySettings.hasOwnProperty(key)) {
      const replacement = legacySettings[key];
      log(`Config key "${key}" is deprecated. It has been replaced with "${replacement}"`);
      clone[replacement] = val;
    } else {
      clone[key] = val;
    }
  }, {});
}
