/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import os from 'os';
import type { LinuxOs } from 'getos';
import getosAsync from 'getos';
import { promisify } from 'util';
import type { Logger } from '@kbn/logging';
import type { MetricsCollector, OpsOsMetrics } from '@kbn/core-metrics-server';
import {
  type Attributes,
  type BatchObservableResult,
  type Observable,
  metrics,
  ValueType,
} from '@opentelemetry/api';
import { OsCgroupMetricsCollector } from './cgroup';

const getos = promisify(getosAsync);

export interface OsMetricsCollectorOptions {
  logger: Logger;
  cpuPath?: string;
  cpuAcctPath?: string;
}

export class OsMetricsCollector implements MetricsCollector<OpsOsMetrics> {
  private readonly cgroupCollector: OsCgroupMetricsCollector;
  private readonly log: Logger;

  constructor(options: OsMetricsCollectorOptions) {
    this.cgroupCollector = new OsCgroupMetricsCollector({
      ...options,
      logger: options.logger.get('cgroup'),
    });
    this.log = options.logger;
  }

  public async collect(): Promise<OpsOsMetrics> {
    const platform = os.platform();
    const load = os.loadavg();

    const osMetrics: OpsOsMetrics = {
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

    return osMetrics;
  }

  public reset() {}

  public registerMetrics() {
    const meter = metrics.getMeter('kibana.os');

    // https://opentelemetry.io/docs/specs/semconv/registry/attributes/os/#operating-system-attributes
    const platform = os.platform();
    const attributes: Attributes = {
      'os.type': os.platform(),
      'os.version': os.release(),
    };
    this.getDistroStats(platform)
      .then(({ distroRelease }) => {
        attributes['os.name'] = distroRelease;
      })
      .catch((err) => {
        this.log.error(`Could not determine distro name due to error: [${err.toString()}]`);
      });

    // https://opentelemetry.io/docs/specs/semconv/system/system-metrics/
    meter
      .createObservableGauge('system.uptime', {
        description: 'The time the system has been running.',
        unit: 's',
        valueType: ValueType.DOUBLE,
      })
      .addCallback((result) => {
        result.observe(os.uptime(), attributes);
      });

    meter
      .createObservableUpDownCounter('system.cpu.logical.count', {
        description: 'The number of logical CPUs.',
        unit: '1',
        valueType: ValueType.INT,
      })
      .addCallback((result) => {
        result.observe(os.cpus().length, attributes);
      });

    meter
      .createObservableGauge('system.cpu.load', {
        description: 'The CPU load average.',
        unit: '1',
        valueType: ValueType.DOUBLE,
      })
      .addCallback((result) => {
        const load = os.loadavg();
        result.observe(load[0], { ...attributes, 'system.cpu.load.window': '1m' });
        result.observe(load[1], { ...attributes, 'system.cpu.load.window': '5m' });
        result.observe(load[2], { ...attributes, 'system.cpu.load.window': '15m' });
      });

    const memoryMetrics = {
      limit: meter.createObservableUpDownCounter('system.memory.limit', {
        description: 'Total virtual memory available in the system.',
        unit: 'By',
        valueType: ValueType.INT,
      }),
      usage: meter.createObservableUpDownCounter('system.memory.usage', {
        description: 'Reports memory in use by state.',
        unit: 'By',
        valueType: ValueType.INT,
      }),
    };

    meter.addBatchObservableCallback((result) => {
      const limit = os.totalmem();
      const free = os.freemem();
      const used = limit - free;
      result.observe(memoryMetrics.limit, limit, attributes);
      result.observe(memoryMetrics.usage, used, { ...attributes, 'system.memory.state': 'used' });
      result.observe(memoryMetrics.usage, free, { ...attributes, 'system.memory.state': 'free' });
    }, Object.values(memoryMetrics));

    const cgroupMetrics = {
      accountingUsage: meter.createObservableGauge('system.cgroup.cpuacct.usage', {
        description:
          'The amount of time in nanoseconds that the cgroup has been scheduled in user mode.',
        unit: 'ns',
        valueType: ValueType.INT,
      }),
      cfsPeriod: meter.createObservableGauge('system.cgroup.cfs.period', {
        description: 'OS CPU cgroup: the length of the cfs period in microseconds',
        unit: 'us',
        valueType: ValueType.INT,
      }),
      cfsQuota: meter.createObservableGauge('system.cgroup.cfs.quota', {
        description: 'OS CPU cgroup: total available run-time within a cfs period in microseconds',
        unit: 'us',
        valueType: ValueType.INT,
      }),
      cfsElapsed: meter.createObservableGauge('system.cgroup.cfs.elapsed', {
        description: 'OS CPU cgroup: number of cfs periods that elapsed',
        unit: '1',
        valueType: ValueType.INT,
      }),
      cfsThrottled: meter.createObservableGauge('system.cgroup.cfs.throttled', {
        description: 'OS CPU cgroup: number of times the cgroup has been throttled',
        unit: '1',
        valueType: ValueType.INT,
      }),
      cgroupThrottled: meter.createObservableGauge('system.cgroup.throttled.time', {
        description:
          'OS CPU cgroup: total amount of time the cgroup has been throttled for in nanoseconds',
        unit: 'ns',
        valueType: ValueType.INT,
      }),
      cgroupMemory: meter.createObservableGauge('system.cgroup.memory.usage', {
        description:
          'OS CPU cgroup: total amount of memory currently being used by the cgroup and its descendants',
        unit: 'By',
        valueType: ValueType.INT,
      }),
      cgroupSwap: meter.createObservableGauge('system.cgroup.swap.usage', {
        description:
          'OS CPU cgroup: total amount of swap currently being used by the cgroup and its descendants',
        unit: 'By',
        valueType: ValueType.INT,
      }),
    };

    function observeMetricIfSet(
      result: BatchObservableResult,
      metric: Observable,
      value: number | undefined,
      attrs: Attributes
    ) {
      if (value !== undefined) {
        result.observe(metric, value, attrs);
      }
    }

    meter.addBatchObservableCallback(async (result) => {
      const collectedMetrics = await this.cgroupCollector.collect();
      const cgroupAttributes = {
        ...attributes,
        'system.cgroup.name': collectedMetrics.cpuacct?.control_group,
      };
      observeMetricIfSet(
        result,
        cgroupMetrics.accountingUsage,
        collectedMetrics.cpuacct?.usage_nanos,
        cgroupAttributes
      );
      observeMetricIfSet(
        result,
        cgroupMetrics.cfsPeriod,
        collectedMetrics.cpu?.cfs_period_micros,
        cgroupAttributes
      );
      observeMetricIfSet(
        result,
        cgroupMetrics.cfsQuota,
        collectedMetrics.cpu?.cfs_quota_micros,
        cgroupAttributes
      );
      observeMetricIfSet(
        result,
        cgroupMetrics.cfsElapsed,
        collectedMetrics.cpu?.stat.number_of_elapsed_periods,
        cgroupAttributes
      );
      observeMetricIfSet(
        result,
        cgroupMetrics.cfsThrottled,
        collectedMetrics.cpu?.stat.number_of_times_throttled,
        cgroupAttributes
      );
      observeMetricIfSet(
        result,
        cgroupMetrics.cgroupThrottled,
        collectedMetrics.cpu?.stat.time_throttled_nanos,
        cgroupAttributes
      );
      observeMetricIfSet(
        result,
        cgroupMetrics.cgroupMemory,
        collectedMetrics.cgroup_memory?.current_in_bytes,
        cgroupAttributes
      );
      observeMetricIfSet(
        result,
        cgroupMetrics.cgroupSwap,
        collectedMetrics.cgroup_memory?.swap_current_in_bytes,
        cgroupAttributes
      );
    }, Object.values(cgroupMetrics));
  }

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
