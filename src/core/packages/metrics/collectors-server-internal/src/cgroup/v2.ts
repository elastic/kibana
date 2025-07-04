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

const PROC_CGROUP2_DIR = '/sys/fs/cgroup';
const CPU_STATS_FILE = 'cpu.stat';
const CPU_MAX_FILE = 'cpu.max';
const MEMORY_CURRENT_FILE = 'memory.current';
const MEMORY_SWAP_CURRENT_FILE = 'memory.swap.current';

const getCGroupFilePath = (group: string, fileName: string): string => {
  return joinPath(PROC_CGROUP2_DIR, group, fileName);
};

export async function gatherV2CgroupMetrics(group: string): Promise<OsCgroupMetrics> {
  const [{ usage_nanos: usageNanos, ...stat }, cpuMax, memoryCurrent, swapCurrent] =
    await Promise.all([
      readCPUStat(group),
      readCPUMax(group),
      readMemoryCurrent(group),
      readSwapCurrent(group),
    ]);

  return {
    cpu: {
      ...cpuMax,
      control_group: group,
      stat,
    },
    cpuacct: {
      control_group: group,
      usage_nanos: usageNanos,
    },
    cgroup_memory: {
      current_in_bytes: memoryCurrent,
      swap_current_in_bytes: swapCurrent,
    },
  };
}

interface CPUMax {
  cfs_period_micros: number;
  cfs_quota_micros: number;
}

async function readMemoryCurrent(group: string): Promise<number> {
  const rawMemoryCurrent = (await fs.readFile(getCGroupFilePath(group, MEMORY_CURRENT_FILE)))
    .toString()
    .trim();
  return parseInt(rawMemoryCurrent, 10);
}

async function readSwapCurrent(group: string): Promise<number> {
  const rawMemoryCurrent = (await fs.readFile(getCGroupFilePath(group, MEMORY_SWAP_CURRENT_FILE)))
    .toString()
    .trim();
  return parseInt(rawMemoryCurrent, 10);
}

async function readCPUMax(group: string): Promise<CPUMax> {
  const [quota, period] = (await fs.readFile(getCGroupFilePath(group, CPU_MAX_FILE)))
    .toString()
    .trim()
    .split(/\s+/);
  return {
    cfs_quota_micros: quota === 'max' ? -1 : parseInt(quota, 10),
    cfs_period_micros: parseInt(period, 10),
  };
}

type CPUStat = Required<OsCgroupMetrics>['cpu']['stat'] & { usage_nanos: number };

async function readCPUStat(group: string): Promise<CPUStat> {
  const stat: CPUStat = {
    number_of_elapsed_periods: -1,
    number_of_times_throttled: -1,
    time_throttled_nanos: -1,
    usage_nanos: -1,
  };
  return (await fs.readFile(getCGroupFilePath(group, CPU_STATS_FILE)))
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
        case 'throttled_usec':
          acc.time_throttled_nanos = parseInt(value, 10);
          break;
        // In V2 cpuacct also lives in cpu.stat
        case 'usage_usec':
          acc.usage_nanos = parseInt(value, 10);
          break;
      }
      return stat;
    }, stat);
}
