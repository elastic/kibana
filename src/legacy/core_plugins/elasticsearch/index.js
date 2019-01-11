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
import { clientLogger } from './lib/client_logger';
import { createClusters } from './lib/create_clusters';
import { createProxy } from './lib/create_proxy';
import filterHeaders from './lib/filter_headers';

export default function (kibana) {
  return new kibana.Plugin({
    require: ['kibana'],

    uiExports: {
      injectDefaultVars(server) {
        const bwcConfig = server.core.es.bwc.config;
        return {
          esRequestTimeout: bwcConfig.requestTimeout.asMilliseconds(),
          esShardTimeout: bwcConfig.shardTimeout.asMilliseconds(),
          esApiVersion: bwcConfig.apiVersion,
        };
      }
    },

    init(server) {
      const clusters = createClusters(server);

      server.expose('getCluster', clusters.get);
      server.expose('createCluster', clusters.create);

      server.expose('filterHeaders', filterHeaders);
      server.expose('ElasticsearchClientLogging', clientLogger(server));

      createProxy(server);

      // Set up the health check service and start it.
      const { start, waitUntilReady } = healthCheck(this, server);
      server.expose('waitUntilReady', waitUntilReady);
      start();
    }
  });

}
