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
import Oppsy from 'oppsy';
import { cloneDeep } from 'lodash';
import { getOSInfo } from './lib/get_os_info';

export function statusMixin(kbnServer, server, config) {
  kbnServer.status = new ServerStatus(kbnServer.server);

  const statsCollector = getOpsStatsCollector(server, kbnServer);
  const { collectorSet } = server.usage;
  collectorSet.register(statsCollector);

  const metrics = new Metrics(config, server);

  const oppsy = new Oppsy(server);
  oppsy.on('ops', event => {
    // Oppsy has a bad race condition that will modify this data before
    // we ship it off to the buffer. Let's create our copy first.
    event = cloneDeep(event);
    // Oppsy used to provide this, but doesn't anymore. Grab it ourselves.
    server.listener.getConnections((_, count) => {
      event.concurrent_connections = count;

      // captures (performs transforms on) the latest event data and stashes
      // the metrics for status/stats API payload
      metrics.capture(event).then(data => {
        kbnServer.metrics = data;
      });
    });
  });
  oppsy.start(config.get('ops.interval'));

  server.events.on('stop', () => {
    oppsy.stop();
  });

  // init routes
  registerStatusPage(kbnServer, server, config);
  registerStatusApi(kbnServer, server, config);
  registerStatsApi(kbnServer, server, config);

  // expore shared functionality
  server.decorate('server', 'getOSInfo', getOSInfo);
}
