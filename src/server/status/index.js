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

import ServerStatus from './server_status';
import { MetricsCollector } from './metrics_collector';
import { Metrics } from './metrics_collector/metrics';
import { registerStatusPage, registerStatusApi, registerStatsApi } from './routes';

export function statusMixin(kbnServer, server, config) {
  const collector = new MetricsCollector(server, config);
  kbnServer.status = new ServerStatus(kbnServer.server);

  const { ['even-better']: evenBetter } = server.plugins;

  if (evenBetter) {
    const metrics = new Metrics(config, server);

    evenBetter.monitor.on('ops', event => {
      // for status API (to deprecate in next major)
      metrics.capture(event).then(data => { kbnServer.metrics = data; });

      // for metrics API (replacement API)
      collector.collect(event); // collect() is async, but here we aren't depending on the return value
    });
  }

  // init routes
  registerStatusPage(kbnServer, server, config);
  registerStatusApi(kbnServer, server, config);
  registerStatsApi(kbnServer, server, config, collector);
}
