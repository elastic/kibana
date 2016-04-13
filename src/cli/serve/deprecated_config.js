import { forOwn, has, transform } from 'lodash';
import { red } from 'ansicolors';
import { memoize } from 'lodash';

const logWarning = memoize(function (key, message) {
  console.log(red('WARNING:'), message);
});

const legacySettings = {
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

const deprecatedSettings = {
  'server.xsrf.token': 'server.xsrf.token is deprecated. It is no longer used when providing xsrf protection.'
};

// transform legacy options into new namespaced versions
export function rewriteDeprecatedConfig(object) {
  const rewritten = transform(object, (clone, val, key) => {
    if (legacySettings.hasOwnProperty(key)) {
      const replacement = legacySettings[key];
      logWarning(key, `Config key "${key}" is deprecated. It has been replaced with "${replacement}"`);
      clone[replacement] = val;
    } else {
      clone[key] = val;
    }
  });

  forOwn(deprecatedSettings, (msg, key) => {
    if (has(rewritten, key)) {
      logWarning(key, msg);
    }
  });

  return rewritten;
}
