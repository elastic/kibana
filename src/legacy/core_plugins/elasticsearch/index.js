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
import { Cluster } from './lib/cluster';
import { createProxy } from './lib/create_proxy';

export default function (kibana) {
  return new kibana.Plugin({
    require: ['kibana'],

    uiExports: {
      injectDefaultVars(server) {
        return {
          esRequestTimeout: server.core.es.requestTimeout.asMilliseconds(),
          esShardTimeout: server.core.es.shardTimeout.asMilliseconds(),
          esApiVersion: server.core.es.apiVersion,
        };
      }
    },

    init(server) {
      const clusters = new Map();

      const adminCluster = new Cluster(server.core.es.adminClient);
      const dataCluster = new Cluster(server.core.es.dataClient);
      server.expose('getCluster', (name) => {
        if (name === 'admin') {
          return adminCluster;
        }

        if (name === 'data') {
          return dataCluster;
        }

        return clusters.get(name);
      });

      server.expose('createCluster', (name, config) => {
        if (clusters.has(name)) {
          throw new Error(`cluster '${name}' already exists`);
        }

        const cluster = new Cluster(server.core.es.createClient(name, config));
        clusters.set(name, cluster);

        return cluster;
      });

      server.events.on('stop', () => {
        for (const [name, cluster] of clusters) {
          cluster.close();
          clusters.delete(name);
        }
      });

      createProxy(server);

      // Set up the health check service and start it.
      const { start, waitUntilReady } = healthCheck(this, server);
      server.expose('waitUntilReady', waitUntilReady);
      start();
    }
  });

}
