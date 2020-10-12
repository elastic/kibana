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

import fs from 'fs';
import { join as joinPath } from 'path';
import { Logger } from '@kbn/logging';
import { MetricsCollector, OpsOsMetrics } from './types';

type OsCgroupMetrics = Pick<OpsOsMetrics, 'cpu' | 'cpuacct'>;

interface OsCgroupMetricsCollectorOptions {
  logger: Logger;
  cpuPath?: string;
  cpuAcctPath?: string;
}

export class OsCgroupMetricsCollector implements MetricsCollector<OsCgroupMetrics> {
  /**  Used to prevent unnecessary file reads on systems not using cgroups. */
  private noCgroupPresent = false;
  private cpuPath?: string;
  private cpuAcctPath?: string;

  constructor(private readonly options: OsCgroupMetricsCollectorOptions) {}

  public async collect(): Promise<OsCgroupMetrics> {
    try {
      if (this.noCgroupPresent) {
        return {};
      }

      await this.initializePaths();
      if (!this.cpuAcctPath || !this.cpuPath) {
        return {};
      }

      const [cpuAcctUsage, cpuFsPeriod, cpuFsQuota, cpuStat] = await Promise.all([
        readCPUAcctUsage(this.cpuAcctPath),
        readCPUFsPeriod(this.cpuPath),
        readCPUFsQuota(this.cpuPath),
        readCPUStat(this.cpuPath),
      ]);

      return {
        cpuacct: {
          control_group: this.cpuAcctPath,
          usage_nanos: cpuAcctUsage,
        },

        cpu: {
          control_group: this.cpuPath,
          cfs_period_micros: cpuFsPeriod,
          cfs_quota_micros: cpuFsQuota,
          stat: cpuStat,
        },
      };
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

  private async initializePaths() {
    // Perform this setup lazily on the first collect call and then memoize the results.
    // Makes the assumption this data doesn't change while the process is running.
    if (this.cpuPath && this.cpuAcctPath) {
      return;
    }

    // Only read the file if both options are undefined.
    if (!this.options.cpuPath || !this.options.cpuAcctPath) {
      const cgroups = await readControlGroups();
      this.cpuPath = this.options.cpuPath || cgroups[GROUP_CPU];
      this.cpuAcctPath = this.options.cpuAcctPath || cgroups[GROUP_CPUACCT];
    } else {
      this.cpuPath = this.options.cpuPath;
      this.cpuAcctPath = this.options.cpuAcctPath;
    }

    // prevents undefined cgroup paths
    if (!this.cpuPath || !this.cpuAcctPath) {
      this.noCgroupPresent = true;
    }
  }
}

const CONTROL_GROUP_RE = new RegExp('\\d+:([^:]+):(/.*)');
const CONTROLLER_SEPARATOR_RE = ',';

const PROC_SELF_CGROUP_FILE = '/proc/self/cgroup';
const PROC_CGROUP_CPU_DIR = '/sys/fs/cgroup/cpu';
const PROC_CGROUP_CPUACCT_DIR = '/sys/fs/cgroup/cpuacct';

const GROUP_CPUACCT = 'cpuacct';
const CPUACCT_USAGE_FILE = 'cpuacct.usage';

const GROUP_CPU = 'cpu';
const CPU_FS_PERIOD_US_FILE = 'cpu.cfs_period_us';
const CPU_FS_QUOTA_US_FILE = 'cpu.cfs_quota_us';
const CPU_STATS_FILE = 'cpu.stat';

async function readControlGroups() {
  const data = await fs.promises.readFile(PROC_SELF_CGROUP_FILE);

  return data
    .toString()
    .split(/\n/)
    .reduce((acc, line) => {
      const matches = line.match(CONTROL_GROUP_RE);

      if (matches !== null) {
        const controllers = matches[1].split(CONTROLLER_SEPARATOR_RE);
        controllers.forEach((controller) => {
          acc[controller] = matches[2];
        });
      }

      return acc;
    }, {} as Record<string, string>);
}

async function fileContentsToInteger(path: string) {
  const data = await fs.promises.readFile(path);
  return parseInt(data.toString(), 10);
}

function readCPUAcctUsage(controlGroup: string) {
  return fileContentsToInteger(joinPath(PROC_CGROUP_CPUACCT_DIR, controlGroup, CPUACCT_USAGE_FILE));
}

function readCPUFsPeriod(controlGroup: string) {
  return fileContentsToInteger(joinPath(PROC_CGROUP_CPU_DIR, controlGroup, CPU_FS_PERIOD_US_FILE));
}

function readCPUFsQuota(controlGroup: string) {
  return fileContentsToInteger(joinPath(PROC_CGROUP_CPU_DIR, controlGroup, CPU_FS_QUOTA_US_FILE));
}

async function readCPUStat(controlGroup: string) {
  const stat = {
    number_of_elapsed_periods: -1,
    number_of_times_throttled: -1,
    time_throttled_nanos: -1,
  };

  try {
    const data = await fs.promises.readFile(
      joinPath(PROC_CGROUP_CPU_DIR, controlGroup, CPU_STATS_FILE)
    );
    return data
      .toString()
      .split(/\n/)
      .reduce((acc, line) => {
        const fields = line.split(/\s+/);

        switch (fields[0]) {
          case 'nr_periods':
            acc.number_of_elapsed_periods = parseInt(fields[1], 10);
            break;

          case 'nr_throttled':
            acc.number_of_times_throttled = parseInt(fields[1], 10);
            break;

          case 'throttled_time':
            acc.time_throttled_nanos = parseInt(fields[1], 10);
            break;
        }

        return acc;
      }, stat);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return stat;
    }

    throw err;
  }
}
