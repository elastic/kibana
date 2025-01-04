/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import { join as joinPath } from 'path';
import type { OsCgroupMetrics } from './types';

const CPU_STATS_FILE = 'cpu.stat';
const CPUACCT_USAGE_FILE = 'cpuacct.usage';
const CPU_FS_QUOTA_US_FILE = 'cpu.cfs_quota_us';
const PROC_CGROUP_CPU_DIR = '/sys/fs/cgroup/cpu';
const CPU_FS_PERIOD_US_FILE = 'cpu.cfs_period_us';
const PROC_CGROUP_CPUACCT_DIR = '/sys/fs/cgroup/cpuacct';

interface Arg {
  cpuPath: string;
  cpuAcctPath: string;
}

export async function gatherV1CgroupMetrics({
  cpuAcctPath,
  cpuPath,
}: Arg): Promise<OsCgroupMetrics> {
  const [cpuAcctUsage, cpuFsPeriod, cpuFsQuota, cpuStat] = await Promise.all([
    readCPUAcctUsage(cpuAcctPath),
    readCPUFsPeriod(cpuPath),
    readCPUFsQuota(cpuPath),
    readCPUStat(cpuPath),
  ]);

  return {
    cpuacct: {
      control_group: cpuAcctPath,
      usage_nanos: cpuAcctUsage,
    },

    cpu: {
      control_group: cpuPath,
      cfs_period_micros: cpuFsPeriod,
      cfs_quota_micros: cpuFsQuota,
      stat: cpuStat,
    },
  };
}

async function fileContentsToInteger(path: string) {
  const data = await fs.readFile(path);
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
    const data = await fs.readFile(joinPath(PROC_CGROUP_CPU_DIR, controlGroup, CPU_STATS_FILE));
    return data
      .toString()
      .split(/\n/)
      .reduce((acc, line) => {
        const [key, value] = line.split(/\s+/);

        switch (key) {
          case 'nr_periods':
            acc.number_of_elapsed_periods = parseInt(value, 10);
            break;
          case 'nr_throttled':
            acc.number_of_times_throttled = parseInt(value, 10);
            break;
          case 'throttled_time':
            acc.time_throttled_nanos = parseInt(value, 10);
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
