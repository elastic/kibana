/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import healthCheck from './lib/health_check';
import { createDataCluster } from './lib/create_data_cluster';
import { createAdminCluster } from './lib/create_admin_cluster';
import { clientLogger } from './lib/client_logger';
import { createClusters } from './lib/create_clusters';
import { createProxy } from './lib/create_proxy';
import filterHeaders from './lib/filter_headers';

const DEFAULT_REQUEST_HEADERS = ['authorization'];

export default function (kibana) {
  return new kibana.Plugin({
    require: ['kibana'],
    config(Joi) {
      const sslSchema = Joi.object({
        verificationMode: Joi.string().valid('none', 'certificate', 'full').default('full'),
        certificateAuthorities: Joi.array().single().items(Joi.string()),
        certificate: Joi.string(),
        key: Joi.string(),
        keyPassphrase: Joi.string(),
        alwaysPresentCertificate: Joi.boolean().default(false),
      }).default();

      return Joi.object({
        enabled: Joi.boolean().default(true),
        sniffOnStart: Joi.boolean().default(false),
        sniffInterval: Joi.number().allow(false).default(false),
        sniffOnConnectionFault: Joi.boolean().default(false),
        hosts: Joi.array().items(Joi.string().uri({ scheme: ['http', 'https'] })).single().default('http://localhost:9200'),
        preserveHost: Joi.boolean().default(true),
        username: Joi.string(),
        password: Joi.string(),
        shardTimeout: Joi.number().default(30000),
        requestTimeout: Joi.number().default(30000),
        requestHeadersWhitelist: Joi.array().items().single().default(DEFAULT_REQUEST_HEADERS),
        customHeaders: Joi.object().default({}),
        pingTimeout: Joi.number().default(Joi.ref('requestTimeout')),
        startupTimeout: Joi.number().default(5000),
        logQueries: Joi.boolean().default(false),
        ssl: sslSchema,
        apiVersion: Joi.string().default('master'),
        healthCheck: Joi.object({
          delay: Joi.number().default(2500)
        }).default(),
      }).default();
    },

    uiExports: {
      injectDefaultVars(server, options) {
        return {
          esRequestTimeout: options.requestTimeout,
          esShardTimeout: options.shardTimeout,
          esApiVersion: options.apiVersion,
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

      createProxy(server);

      // Set up the health check service and start it.
      const { start, waitUntilReady } = healthCheck(this, server);
      server.expose('waitUntilReady', waitUntilReady);
      start();
    }
  });

}
