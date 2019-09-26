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

import os from 'os';
import v8 from 'v8';
import { get, isObject, merge } from 'lodash';
import { keysToSnakeCaseShallow } from '../../../utils/case_conversion';
import { getAllStats as cGroupStats } from './cgroup';
import { getOSInfo } from './get_os_info';

const requestDefaults = {
  disconnects: 0,
  statusCodes: {},
  total: 0,
};

export class Metrics {
  constructor(config, server) {
    this.config = config;
    this.server = server;
    this.checkCGroupStats = true;
  }

  static getStubMetrics() {
    return {
      process: {
        memory: {
          heap: {}
        }
      },
      os: {
        cpu: {},
        memory: {}
      },
      response_times: {},
      requests: {
      }
    };
  }

  async capture(hapiEvent) {
    const timestamp = new Date().toISOString();
    const event = await this.captureEvent(hapiEvent);
    const cgroup = await this.captureCGroupsIfAvailable();

    const metrics = {
      last_updated: timestamp,
      collection_interval_in_millis: this.config.get('ops.interval')
    };

    return merge(metrics, event, cgroup);
  }

  async captureEvent(hapiEvent) {
    const heapStats = v8.getHeapStatistics();
    const port = this.config.get('server.port');
    const avgInMillis = get(hapiEvent, ['responseTimes', port, 'avg']); // sadly, it's possible for this to be NaN
    const maxInMillis = get(hapiEvent, ['responseTimes', port, 'max']);

    return {
      process: {
        memory: {
          heap: {
            // https://nodejs.org/docs/latest-v8.x/api/process.html#process_process_memoryusage
            total_in_bytes: get(hapiEvent, 'psmem.heapTotal'),
            used_in_bytes: get(hapiEvent, 'psmem.heapUsed'),
            size_limit: heapStats.heap_size_limit
          },
          resident_set_size_in_bytes: get(hapiEvent, 'psmem.rss'),
        },
        event_loop_delay: get(hapiEvent, 'psdelay'),
        pid: process.pid,
        uptime_in_millis: process.uptime() * 1000
      },
      os: {
        load: {
          '1m': get(hapiEvent, 'osload.0'),
          '5m': get(hapiEvent, 'osload.1'),
          '15m': get(hapiEvent, 'osload.2')
        },
        memory: {
          total_in_bytes: os.totalmem(),
          free_in_bytes: os.freemem(),
          used_in_bytes: get(hapiEvent, 'osmem.total') - get(hapiEvent, 'osmem.free')
        },
        uptime_in_millis: os.uptime() * 1000,
        ...(await getOSInfo())
      },
      response_times: {
        avg_in_millis: isNaN(avgInMillis) ? undefined : avgInMillis, // convert NaN to undefined
        max_in_millis: maxInMillis
      },
      requests: {
        ...requestDefaults,
        ...keysToSnakeCaseShallow(get(hapiEvent, ['requests', port]))
      },
      concurrent_connections: hapiEvent.concurrent_connections
    };
  }

  async captureCGroups() {
    try {
      const cgroup = await cGroupStats({
        cpuPath: this.config.get('cpu.cgroup.path.override'),
        cpuAcctPath: this.config.get('cpuacct.cgroup.path.override')
      });

      if (isObject(cgroup)) {
        return {
          os: {
            cgroup
          }
        };
      }
    } catch (e) {
      this.server.log(['error', 'metrics', 'cgroup'], e);
    }
  }

  async captureCGroupsIfAvailable() {
    if (this.checkCGroupStats === true) {
      const cgroup = await this.captureCGroups();

      if (isObject(cgroup)) {
        return cgroup;
      }

      this.checkCGroupStats = false;
    }
  }
}
