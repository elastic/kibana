import _ from 'lodash';
import ansicolors from 'ansicolors';
import { readFileSync as read } from 'fs';
import { safeLoad } from 'js-yaml';

import { fromRoot } from '../../utils';

const warnAboutDeprecation = _.memoize(function (key, message) {
  console.log(ansicolors.red('WARNING:'), message);
});

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
  verify_ssl: 'elasticsearch.ssl.verify',
};

const deprecatedSettings = {
  'server.xsrf.token': 'server.xsrf.token is deprecated. It is no longer used when providing xsrf protection.'
};

export default function (paths) {
  if (!paths) return {};

  const files = [].concat(paths).map(path => {
    return safeLoad(read(path, 'utf8'));
  });

  return _.transform(files, function applyConfigFile(config, file) {
    _.forOwn(file, function apply(val, key) {
      // transform legeacy options into new namespaced versions
      if (legacySettingMap.hasOwnProperty(key)) {
        const replacement = legacySettingMap[key];
        warnAboutDeprecation(key, `Config key "${key}" is deprecated. It has been replaced with "${replacement}"`);
        key = replacement;
      }

      if (_.isPlainObject(val)) {
        _.forOwn(val, function (subVal, subKey) {
          apply(subVal, key + '.' + subKey);
        });
      }
      else if (_.isArray(val)) {
        _.set(config, key, []);
        val.forEach((subVal, i) => {
          apply(subVal, key + '.' + i);
        });
      }
      else {
        if (deprecatedSettings[key]) {
          warnAboutDeprecation(key, deprecatedSettings[key]);
        }

        _.set(config, key, val);
      }
    });
  }, {});
}
