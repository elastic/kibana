import _ , { partial } from 'lodash';
import { createTransform, Deprecations } from '../../deprecation';

const { rename, unused } = Deprecations;

const serverSslEnabled = (settings, log) => {
  const has = partial(_.has, settings);
  const set = partial(_.set, settings);

  if (!has('server.ssl.enabled') && has('server.ssl.certificate') && has('server.ssl.key')) {
    set('server.ssl.enabled', true);
    log('Enabling ssl by only specifying server.ssl.certificate and server.ssl.key is deprecated. Please set server.ssl.enabled to true');
  }
};

const deprecations = [
  //server
  rename('port' ,'server.port'),
  rename('host', 'server.host'),
  rename('pid_file', 'pid.file'),
  rename('ssl_cert_file', 'server.ssl.certificate'),
  rename('server.ssl.cert', 'server.ssl.certificate'),
  rename('ssl_key_file',  'server.ssl.key'),
  unused('server.xsrf.token'),
  serverSslEnabled,

  // logging
  rename('log_file', 'logging.dest'),

  // kibana
  rename('kibana_index', 'kibana.index'),
  rename('default_app_id', 'kibana.defaultAppId'),

  // es
  rename('ca', 'elasticsearch.ssl.ca'),
  rename('elasticsearch_preserve_host', 'elasticsearch.preserveHost'),
  rename('elasticsearch_url', 'elasticsearch.url'),
  rename('kibana_elasticsearch_client_crt', 'elasticsearch.ssl.cert'),
  rename('kibana_elasticsearch_client_key', 'elasticsearch.ssl.key'),
  rename('kibana_elasticsearch_password', 'elasticsearch.password'),
  rename('kibana_elasticsearch_username', 'elasticsearch.username'),
  rename('ping_timeout', 'elasticsearch.pingTimeout'),
  rename('request_timeout', 'elasticsearch.requestTimeout'),
  rename('shard_timeout', 'elasticsearch.shardTimeout'),
  rename('startup_timeout', 'elasticsearch.startupTimeout'),
  rename('verify_ssl', 'elasticsearch.ssl.verify'),

  // tilemap
  rename('tilemap_url', 'tilemap.url'),
  rename('tilemap_min_zoom', 'tilemap.options.minZoom'),
  rename('tilemap_max_zoom', 'tilemap.options.maxZoom'),
  rename('tilemap_attribution', 'tilemap.options.attribution'),
  rename('tilemap_subdomains', 'tilemap.options.subdomains')
];

export const transformDeprecations = createTransform(deprecations);
