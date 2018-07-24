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
import { Metrics } from './lib/metrics';
import { registerStatusPage, registerStatusApi, registerStatsApi } from './routes';
import { getOpsStatsCollector } from './collectors';

export function statusMixin(kbnServer, server, config) {
  kbnServer.status = new ServerStatus(kbnServer.server);

  const statsCollector = getOpsStatsCollector(server, kbnServer);
  const { collectorSet } = server.usage;
  collectorSet.register(statsCollector);

  const { ['even-better']: evenBetter } = server.plugins;

  if (evenBetter) {
    const metrics = new Metrics(config, server);

    evenBetter.monitor.on('ops', event => {
      metrics.capture(event).then(data => { kbnServer.metrics = data; }); // captures (performs transforms on) the latest event data and stashes the metrics for status/stats API payload
    });
  }

  // init routes
  registerStatusPage(kbnServer, server, config);
  registerStatusApi(kbnServer, server, config);
  registerStatsApi(kbnServer, server, config);
}
