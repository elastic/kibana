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

import { combineLatest } from 'rxjs';
import { first, map } from 'rxjs/operators';
import healthCheck from './lib/health_check';
import { Cluster } from './lib/cluster';
import { createProxy } from './lib/create_proxy';
import { handleESError } from './lib/handle_es_error';

export default function (kibana) {
  let defaultVars;

  return new kibana.Plugin({
    require: ['kibana'],

    uiExports: { injectDefaultVars: () => defaultVars },

    async init(server) {
      // All methods that ES plugin exposes are synchronous so we should get the first
      // value from all observables here to be able to synchronously return and create
      // cluster clients afterwards.
      const [esConfig, adminCluster, dataCluster] = await combineLatest(
        server.newPlatform.__internals.elasticsearch.legacy.config$,
        server.newPlatform.setup.core.elasticsearch.adminClient$,
        server.newPlatform.setup.core.elasticsearch.dataClient$
      ).pipe(
        first(),
        map(([config, adminClusterClient, dataClusterClient]) => [
          config,
          new Cluster(adminClusterClient),
          new Cluster(dataClusterClient)
        ])
      ).toPromise();

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

      server.expose('createCluster', (name, clientConfig = {}) => {
        // NOTE: Not having `admin` and `data` clients provided by the core in `clusters`
        // map implicitly allows to create custom `data` and `admin` clients. This is
        // allowed intentionally to support custom `admin` cluster client created by the
        // x-pack/monitoring bulk uploader. We should forbid that as soon as monitoring
        // bulk uploader is refactored, see https://github.com/elastic/kibana/issues/31934.
        if (clusters.has(name)) {
          throw new Error(`cluster '${name}' already exists`);
        }

        const cluster = new Cluster(server.newPlatform.setup.core.elasticsearch.createClient(name, clientConfig));

        clusters.set(name, cluster);

        return cluster;
      });

      server.events.on('stop', () => {
        for (const cluster of clusters.values()) {
          cluster.close();
        }

        clusters.clear();
      });

      server.expose('handleESError', handleESError);

      createProxy(server);

      // Set up the health check service and start it.
      const { start, waitUntilReady } = healthCheck(
        this,
        server,
        esConfig.healthCheckDelay.asMilliseconds(),
        esConfig.ignoreVersionMismatch
      );
      server.expose('waitUntilReady', waitUntilReady);
      start();
    },
  });
}
