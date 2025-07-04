/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import mockFs from 'mock-fs';
import { gatherV1CgroupMetrics } from './v1';

describe('gatherV1CgroupMetrics', () => {
  afterEach(() => mockFs.restore());

  it('collects cgroup data', async () => {
    mockFs({
      '/proc/self/cgroup': `
123:memory:/groupname
123:cpu:/groupname
123:cpuacct:/groupname
      `,
      '/sys/fs/cgroup/cpuacct/groupname/cpuacct.usage': '111',
      '/sys/fs/cgroup/cpu/groupname/cpu.cfs_period_us': '222',
      '/sys/fs/cgroup/cpu/groupname/cpu.cfs_quota_us': '333',
      '/sys/fs/cgroup/cpu/groupname/cpu.stat': `
nr_periods 444
nr_throttled 555
throttled_time 666
      `,
    });

    expect(await gatherV1CgroupMetrics({ cpuAcctPath: '/groupname', cpuPath: '/groupname' }))
      .toMatchInlineSnapshot(`
      Object {
        "cpu": Object {
          "cfs_period_micros": 222,
          "cfs_quota_micros": 333,
          "control_group": "/groupname",
          "stat": Object {
            "number_of_elapsed_periods": 444,
            "number_of_times_throttled": 555,
            "time_throttled_nanos": 666,
          },
        },
        "cpuacct": Object {
          "control_group": "/groupname",
          "usage_nanos": 111,
        },
      }
    `);
  });
});
