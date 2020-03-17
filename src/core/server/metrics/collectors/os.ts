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
import getosAsync, { LinuxOs } from 'getos';
import { promisify } from 'util';
import { OpsOsMetrics, MetricsCollector } from './types';

const getos = promisify(getosAsync);

export class OsMetricsCollector implements MetricsCollector<OpsOsMetrics> {
  public async collect(): Promise<OpsOsMetrics> {
    const platform = os.platform();
    const load = os.loadavg();

    const metrics: OpsOsMetrics = {
      platform,
      platformRelease: `${platform}-${os.release()}`,
      load: {
        '1m': load[0],
        '5m': load[1],
        '15m': load[2],
      },
      memory: {
        total_in_bytes: os.totalmem(),
        free_in_bytes: os.freemem(),
        used_in_bytes: os.totalmem() - os.freemem(),
      },
      uptime_in_millis: os.uptime() * 1000,
    };

    if (platform === 'linux') {
      try {
        const distro = (await getos()) as LinuxOs;
        metrics.distro = distro.dist;
        metrics.distroRelease = `${distro.dist}-${distro.release}`;
      } catch (e) {
        // ignore errors
      }
    }

    return metrics;
  }

  public reset() {}
}
