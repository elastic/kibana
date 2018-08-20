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
import { get, isObject, merge } from 'lodash';
import { keysToSnakeCaseShallow } from '../../../utils/case_conversion';
import { getAllStats as cGroupStats } from './cgroup';

export class Metrics {
  constructor(config, server) {
    this.config = config;
    this.server = server;
    this.checkCGroupStats = true;
  }

  static getStubMetrics() {
    return {
      process: {
        mem: {}
      },
      os: {
        cpu: {},
        mem: {}
      },
      response_times: {},
      requests: {
        status_codes: {}
      },
      sockets: {
        http: {},
        https: {}
      }
    };
  }

  async capture(hapiEvent) {
    const timestamp = new Date().toISOString();
    const event = this.captureEvent(hapiEvent);
    const cgroup = await this.captureCGroupsIfAvailable();

    const metrics = {
      last_updated: timestamp,
      collection_interval_in_millis: this.config.get('ops.interval'),
      uptime_in_millis: event.process.uptime_ms, // TODO: deprecate this field, data should only have process.uptime_ms
    };

    return merge(metrics, event, cgroup);
  }

  captureEvent(hapiEvent) {
    const port = this.config.get('server.port');

    const avgInMillis = get(hapiEvent, ['responseTimes', port, 'avg']); // sadly, it's possible for this to be NaN
    const maxInMillis = get(hapiEvent, ['responseTimes', port, 'max']);

    return {
      process: {
        mem: {
          // https://nodejs.org/docs/latest-v8.x/api/process.html#process_process_memoryusage
          heap_max_in_bytes: get(hapiEvent, 'psmem.heapTotal'),
          heap_used_in_bytes: get(hapiEvent, 'psmem.heapUsed'),
          resident_set_size_in_bytes: get(hapiEvent, 'psmem.rss'),
          external_in_bytes: get(hapiEvent, 'psmem.external')
        },
        pid: process.pid,
        uptime_ms: process.uptime() * 1000
      },
      os: {
        cpu: {
          load_average: {
            '1m': get(hapiEvent, 'osload.0'),
            '5m': get(hapiEvent, 'osload.1'),
            '15m': get(hapiEvent, 'osload.2')
          }
        },
        mem: {
          free_in_bytes: os.freemem(),
          total_in_bytes: os.totalmem()
        }
      },
      response_times: {
        // TODO: rename to use `_ms` suffix per beats naming conventions
        avg_in_millis: isNaN(avgInMillis) ? undefined : avgInMillis, // convert NaN to undefined
        max_in_millis: maxInMillis
      },
      requests: keysToSnakeCaseShallow(get(hapiEvent, ['requests', port])),
      concurrent_connections: get(hapiEvent, ['concurrents', port]),
      sockets: get(hapiEvent, 'sockets'),
      event_loop_delay: get(hapiEvent, 'psdelay')
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
