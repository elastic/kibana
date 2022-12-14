/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import mockFs from 'mock-fs';
import { loggerMock } from '@kbn/logging-mocks';
import { OsCgroupMetricsCollector } from '.';

describe('OsCgroupMetricsCollector', () => {
  afterEach(() => mockFs.restore());

  it('returns empty object when no cgroup file present', async () => {
    mockFs({
      '/proc/self': {
        /** empty directory */
      },
    });

    const logger = loggerMock.create();
    const collector = new OsCgroupMetricsCollector({ logger });
    expect(await collector.collect()).toEqual({});
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns empty object and logs error on an EACCES error', async () => {
    mockFs({
      '/proc/self/cgroup': `
123:memory:/groupname
123:cpu:/groupname
123:cpuacct:/groupname
      `,
      '/sys/fs/cgroup': mockFs.directory({ mode: parseInt('0000', 8) }),
    });

    const logger = loggerMock.create();

    const collector = new OsCgroupMetricsCollector({ logger });
    expect(await collector.collect()).toEqual({});
    expect(logger.error).toHaveBeenCalledWith(
      "cgroup metrics could not be read due to error: [Error: EACCES, permission denied '/sys/fs/cgroup/cpuacct/groupname/cpuacct.usage']"
    );
  });

  describe('cgroup v2', () => {
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
      });

      const collector = new OsCgroupMetricsCollector({ logger: loggerMock.create() });

      expect(await collector.collect()).toMatchInlineSnapshot(`
        Object {
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
      });

      const collector = new OsCgroupMetricsCollector({ logger: loggerMock.create() });

      expect(await collector.collect()).toMatchInlineSnapshot(`
        Object {
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

    it('collects override cgroup data', async () => {
      mockFs({
        '/proc/self/cgroup': `0::/`,
        '/sys/fs/cgroup/override/cpu.max': 'max 100000', // "max" is a special no-value value
        '/sys/fs/cgroup/override/cpu.stat': `usage_usec 185247
user_usec 59279
system_usec 125968
nr_periods 123
nr_throttled 1
throttled_usec 123123`,
      });

      const collector = new OsCgroupMetricsCollector({
        logger: loggerMock.create(),
        cpuPath: 'override',
        cpuAcctPath: 'override',
      });

      expect(await collector.collect()).toMatchInlineSnapshot(`
        Object {
          "cpu": Object {
            "cfs_period_micros": 100000,
            "cfs_quota_micros": -1,
            "control_group": "override",
            "stat": Object {
              "number_of_elapsed_periods": 123,
              "number_of_times_throttled": 1,
              "time_throttled_nanos": 123123,
            },
          },
          "cpuacct": Object {
            "control_group": "override",
            "usage_nanos": 185247,
          },
        }
       `);
    });
  });
});
