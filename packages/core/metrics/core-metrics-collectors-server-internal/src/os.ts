/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import os from 'os';
import getosAsync, { LinuxOs } from 'getos';
import { promisify } from 'util';
import type { Logger } from '@kbn/logging';
import type { OpsOsMetrics, MetricsCollector } from '@kbn/core-metrics-server';
import { OsCgroupMetricsCollector } from './cgroup';

const getos = promisify(getosAsync);

export interface OsMetricsCollectorOptions {
  logger: Logger;
  cpuPath?: string;
  cpuAcctPath?: string;
}

export class OsMetricsCollector implements MetricsCollector<OpsOsMetrics> {
  private readonly cgroupCollector: OsCgroupMetricsCollector;

  constructor(options: OsMetricsCollectorOptions) {
    this.cgroupCollector = new OsCgroupMetricsCollector({
      ...options,
      logger: options.logger.get('cgroup'),
    });
  }

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
      ...(await this.getDistroStats(platform)),
      ...(await this.cgroupCollector.collect()),
    };

    return metrics;
  }

  public reset() {}

  private async getDistroStats(
    platform: string
  ): Promise<Pick<OpsOsMetrics, 'distro' | 'distroRelease'>> {
    if (platform === 'linux') {
      try {
        const distro = (await getos()) as LinuxOs;
        // getos values can sometimes contain newline characters
        const dist = removeNewlines(distro.dist);
        const release = removeNewlines(distro.release);
        return {
          distro: dist,
          distroRelease: `${dist}-${release}`,
        };
      } catch (e) {
        // ignore errors
      }
    }

    return {};
  }
}

const removeNewlines = (str: string) => str.replace(/[\n]/g, '');
