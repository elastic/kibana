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
import { first } from 'rxjs/operators';
import { Cluster } from './server/lib/cluster';
import { createProxy } from './server/lib/create_proxy';

export default function (kibana) {
  let defaultVars;

  return new kibana.Plugin({
    require: [],

    uiExports: { injectDefaultVars: () => defaultVars },

    async init(server) {
      // All methods that ES plugin exposes are synchronous so we should get the first
      // value from all observables here to be able to synchronously return and create
      // cluster clients afterwards.
      const { client } = server.newPlatform.setup.core.elasticsearch.legacy;
      const adminCluster = new Cluster(client);
      const dataCluster = new Cluster(client);

      const esConfig = await server.newPlatform.__internals.elasticsearch.legacy.config$
        .pipe(first())
        .toPromise();

      defaultVars = {
        esRequestTimeout: esConfig.requestTimeout.asMilliseconds(),
        esShardTimeout: esConfig.shardTimeout.asMilliseconds(),
        esApiVersion: esConfig.apiVersion,
      };

      const clusters = new Map();
      server.expose('getCluster', (name) => {
        if (name === 'admin') {
          return adminCluster;
        }

        if (name === 'data') {
          return dataCluster;
        }

        return clusters.get(name);
      });

      server.events.on('stop', () => {
        for (const cluster of clusters.values()) {
          cluster.close();
        }

        clusters.clear();
      });

      createProxy(server);
    },
  });
}
