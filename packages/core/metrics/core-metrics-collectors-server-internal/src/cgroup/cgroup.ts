/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger } from '@kbn/logging';
import type { MetricsCollector } from '@kbn/core-metrics-server';

import { gatherV1CgroupMetrics } from './v1';
import { gatherV2CgroupMetrics } from './v2';
import { gatherInfo } from './gather_info';
import { GROUP_CPU, GROUP_CPUACCT } from './constants';
import { OsCgroupMetrics } from './types';

interface OsCgroupMetricsCollectorOptions {
  logger: Logger;
  cpuPath?: string;
  cpuAcctPath?: string;
}

export class OsCgroupMetricsCollector implements MetricsCollector<OsCgroupMetrics> {
  /**  Used to prevent unnecessary file reads on systems not using cgroups. */
  private noCgroupPresent = false;
  /** Are resources being managed by cgroup2? */
  private isCgroup2 = false;
  private cpuPath?: string;
  private cpuAcctPath?: string;

  constructor(private readonly options: OsCgroupMetricsCollectorOptions) {}

  public async collect(): Promise<OsCgroupMetrics> {
    try {
      if (this.noCgroupPresent) {
        return {};
      }

      await this.initializePaths();
      if (!this.hasPaths()) {
        return {};
      }

      const args = { cpuAcctPath: this.cpuAcctPath!, cpuPath: this.cpuPath! };
      // "await" to handle any errors here.
      return await (this.isCgroup2 ? gatherV2CgroupMetrics(args) : gatherV1CgroupMetrics(args));
    } catch (err) {
      this.noCgroupPresent = true;

      if (err.code !== 'ENOENT') {
        this.options.logger.error(
          `cgroup metrics could not be read due to error: [${err.toString()}]`
        );
      }

      return {};
    }
  }

  public reset() {}

  private hasPaths(): boolean {
    return Boolean(this.cpuPath && this.cpuAcctPath);
  }

  private async initializePaths(): Promise<void> {
    if (this.hasPaths()) return;

    const { data: cgroups, v2 } = await gatherInfo();
    this.isCgroup2 = v2;
    this.cpuPath = this.options.cpuPath || cgroups[GROUP_CPU];
    this.cpuAcctPath = this.options.cpuAcctPath || cgroups[GROUP_CPUACCT];

    // prevents undefined cgroup paths
    this.noCgroupPresent = Boolean(!this.cpuPath || !this.cpuAcctPath);
  }
}
