/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import mockFs from 'mock-fs';
import { gatherV2CgroupMetrics } from './v2';

describe('gatherV2CgroupMetrics', () => {
  afterEach(() => mockFs.restore());

  it('collects default cgroup data for "root"', async () => {
    mockFs({
      '/proc/self/cgroup': `0::/`,
      '/sys/fs/cgroup/cpu.max': 'max 100000', // "max" is a special no-value value
      '/sys/fs/cgroup/cpu.stat': `usage_usec 185247
user_usec 59279
system_usec 125968
nr_periods 123
nr_throttled 1
throttled_usec 123123`,
      '/sys/fs/cgroup/memory.current': '9000',
      '/sys/fs/cgroup/memory.swap.current': '42',
    });

    const metrics = await gatherV2CgroupMetrics('/');
    expect(metrics).toMatchInlineSnapshot(`
        Object {
          "cgroup_memory": Object {
            "current_in_bytes": 9000,
            "swap_current_in_bytes": 42,
          },
          "cpu": Object {
            "cfs_period_micros": 100000,
            "cfs_quota_micros": -1,
            "control_group": "/",
            "stat": Object {
              "number_of_elapsed_periods": 123,
              "number_of_times_throttled": 1,
              "time_throttled_nanos": 123123,
            },
          },
          "cpuacct": Object {
            "control_group": "/",
            "usage_nanos": 185247,
          },
        }
       `);
  });

  it('collects default cgroup data', async () => {
    mockFs({
      '/proc/self/cgroup': `0::/mypath`,
      '/sys/fs/cgroup/mypath/cpu.max': '111 100000',
      '/sys/fs/cgroup/mypath/cpu.stat': `usage_usec 185247
user_usec 59279
system_usec 125968
nr_periods 123
nr_throttled 1
throttled_usec 123123`,
      '/sys/fs/cgroup/mypath/memory.current': '9876',
      '/sys/fs/cgroup/mypath/memory.swap.current': '132645',
    });

    const metrics = await gatherV2CgroupMetrics('/mypath');
    expect(metrics).toMatchInlineSnapshot(`
        Object {
          "cgroup_memory": Object {
            "current_in_bytes": 9876,
            "swap_current_in_bytes": 132645,
          },
          "cpu": Object {
            "cfs_period_micros": 100000,
            "cfs_quota_micros": 111,
            "control_group": "/mypath",
            "stat": Object {
              "number_of_elapsed_periods": 123,
              "number_of_times_throttled": 1,
              "time_throttled_nanos": 123123,
            },
          },
          "cpuacct": Object {
            "control_group": "/mypath",
            "usage_nanos": 185247,
          },
        }
       `);
  });
});
