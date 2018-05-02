import { compact, get, has, set } from 'lodash';
import { unset } from '../../utils';

import healthCheck from './lib/health_check';
import { createDataCluster } from './lib/create_data_cluster';
import { createAdminCluster } from './lib/create_admin_cluster';
import { clientLogger } from './lib/client_logger';
import { createClusters } from './lib/create_clusters';
import filterHeaders from './lib/filter_headers';

import { createProxy } from './lib/create_proxy';

const DEFAULT_REQUEST_HEADERS = [ 'authorization' ];

export default function (kibana) {
  return new kibana.Plugin({
    require: ['kibana'],
    config(Joi) {
      const { array, boolean, number, object, string, ref } = Joi;

      const sslSchema = object({
        verificationMode: string().valid('none', 'certificate', 'full').default('full'),
        certificateAuthorities: array().single().items(string()),
        certificate: string(),
        key: string(),
        keyPassphrase: string()
      }).default();

      return object({
        enabled: boolean().default(true),
        url: string().uri({ scheme: ['http', 'https'] }).default('http://localhost:9200'),
        preserveHost: boolean().default(true),
        username: string(),
        password: string(),
        shardTimeout: number().default(30000),
        requestTimeout: number().default(30000),
        requestHeadersWhitelist: array().items().single().default(DEFAULT_REQUEST_HEADERS),
        customHeaders: object().default({}),
        pingTimeout: number().default(ref('requestTimeout')),
        startupTimeout: number().default(5000),
        logQueries: boolean().default(false),
        ssl: sslSchema,
        apiVersion: Joi.string().default('master'),
        healthCheck: object({
          delay: number().default(2500)
        }).default(),
        tribe: Joi.object({
          url: Joi.string().uri({ scheme: ['http', 'https'] }),
          preserveHost: Joi.boolean().default(true),
          username: Joi.string(),
          password: Joi.string(),
          shardTimeout: Joi.number().default(0),
          requestTimeout: Joi.number().default(30000),
          requestHeadersWhitelist: Joi.array().items().single().default(DEFAULT_REQUEST_HEADERS),
          customHeaders: Joi.object().default({}),
          pingTimeout: Joi.number().default(Joi.ref('requestTimeout')),
          startupTimeout: Joi.number().default(5000),
          logQueries: Joi.boolean().default(false),
          ssl: sslSchema,
          apiVersion: Joi.string().default('master'),
        }).default()
      }).default();
    },

    deprecations({ rename }) {
      const sslVerify = (basePath) => {
        const getKey = (path) => {
          return compact([basePath, path]).join('.');
        };

        return (settings, log) => {
          const sslSettings = get(settings, getKey('ssl'));

          if (!has(sslSettings, 'verify')) {
            return;
          }

          const verificationMode = get(sslSettings, 'verify') ? 'full' : 'none';
          set(sslSettings, 'verificationMode', verificationMode);
          unset(sslSettings, 'verify');

          log(`Config key "${getKey('ssl.verify')}" is deprecated. It has been replaced with "${getKey('ssl.verificationMode')}"`);
        };
      };

      return [
        rename('ssl.ca', 'ssl.certificateAuthorities'),
        rename('ssl.cert', 'ssl.certificate'),
        sslVerify(),
        rename('tribe.ssl.ca', 'tribe.ssl.certificateAuthorities'),
        rename('tribe.ssl.cert', 'tribe.ssl.certificate'),
        sslVerify('tribe')
      ];
    },

    uiExports: {
      injectDefaultVars(server, options) {
        return {
          esRequestTimeout: options.requestTimeout,
          esShardTimeout: options.shardTimeout,
          esApiVersion: options.apiVersion,
          esDataIsTribe: get(options, 'tribe.url') ? true : false,
        };
      }
    },

    init(server) {
      const clusters = createClusters(server);

      server.expose('getCluster', clusters.get);
      server.expose('createCluster', clusters.create);

      server.expose('filterHeaders', filterHeaders);
      server.expose('ElasticsearchClientLogging', clientLogger(server));

      createDataCluster(server);
      createAdminCluster(server);

      createProxy(server, 'POST', '/{index}/_search');
      createProxy(server, 'POST', '/_msearch');

      // Set up the health check service and start it.
      const { start, waitUntilReady } = healthCheck(this, server);
      server.expose('waitUntilReady', waitUntilReady);
      start();
    }
  });

}
