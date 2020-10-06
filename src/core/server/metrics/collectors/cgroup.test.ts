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

import mockFs from 'mock-fs';
import { loggerMock } from '@kbn/logging/target/mocks';
import { OsCgroupMetricsCollector } from './cgroup';

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

  it('collects default cgroup data', async () => {
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

    const collector = new OsCgroupMetricsCollector({ logger: loggerMock.create() });
    expect(await collector.collect()).toMatchInlineSnapshot(`
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

  it('collects override cgroup data', async () => {
    mockFs({
      '/proc/self/cgroup': `
123:memory:/groupname
123:cpu:/groupname
123:cpuacct:/groupname
      `,
      '/sys/fs/cgroup/cpuacct/xxcustomcpuacctxx/cpuacct.usage': '111',
      '/sys/fs/cgroup/cpu/xxcustomcpuxx/cpu.cfs_period_us': '222',
      '/sys/fs/cgroup/cpu/xxcustomcpuxx/cpu.cfs_quota_us': '333',
      '/sys/fs/cgroup/cpu/xxcustomcpuxx/cpu.stat': `
nr_periods 444
nr_throttled 555
throttled_time 666
      `,
    });

    const collector = new OsCgroupMetricsCollector({
      logger: loggerMock.create(),
      cpuAcctPath: 'xxcustomcpuacctxx',
      cpuPath: 'xxcustomcpuxx',
    });
    expect(await collector.collect()).toMatchInlineSnapshot(`
      Object {
        "cpu": Object {
          "cfs_period_micros": 222,
          "cfs_quota_micros": 333,
          "control_group": "xxcustomcpuxx",
          "stat": Object {
            "number_of_elapsed_periods": 444,
            "number_of_times_throttled": 555,
            "time_throttled_nanos": 666,
          },
        },
        "cpuacct": Object {
          "control_group": "xxcustomcpuacctxx",
          "usage_nanos": 111,
        },
      }
    `);
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
});
