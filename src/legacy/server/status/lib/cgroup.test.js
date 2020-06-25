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

jest.mock('fs', () => ({
  readFile: jest.fn(),
}));

import fs from 'fs';
import { cGroups as cGroupsFsStub, setMockFiles, readFileMock } from './__mocks__/_fs_stubs';
import { getAllStats, readControlGroups, readCPUStat } from './cgroup';

describe('Control Group', function () {
  const fsStub = cGroupsFsStub();

  beforeAll(() => {
    fs.readFile.mockImplementation(readFileMock);
  });

  afterEach(() => {
    setMockFiles();
  });

  describe('readControlGroups', () => {
    it('parses the file', async () => {
      setMockFiles({ '/proc/self/cgroup': fsStub.cGroupContents });
      const cGroup = await readControlGroups();

      expect(cGroup).toEqual({
        freezer: '/',
        net_cls: '/',
        net_prio: '/',
        pids: '/',
        blkio: '/',
        memory: '/',
        devices: '/user.slice',
        hugetlb: '/',
        perf_event: '/',
        cpu: `/${fsStub.hierarchy}`,
        cpuacct: `/${fsStub.hierarchy}`,
        cpuset: `/${fsStub.hierarchy}`,
        'name=systemd': '/user.slice/user-1000.slice/session-2359.scope',
      });
    });
  });

  describe('readCPUStat', () => {
    it('parses the file', async () => {
      setMockFiles({ '/sys/fs/cgroup/cpu/fakeGroup/cpu.stat': fsStub.cpuStatContents });
      const cpuStat = await readCPUStat('fakeGroup');

      expect(cpuStat).toEqual({
        number_of_elapsed_periods: 0,
        number_of_times_throttled: 10,
        time_throttled_nanos: 20,
      });
    });

    it('returns default stats for missing file', async () => {
      setMockFiles();
      const cpuStat = await readCPUStat('fakeGroup');

      expect(cpuStat).toEqual({
        number_of_elapsed_periods: -1,
        number_of_times_throttled: -1,
        time_throttled_nanos: -1,
      });
    });
  });

  describe('getAllStats', () => {
    it('can override the cpu group path', async () => {
      setMockFiles({
        '/proc/self/cgroup': fsStub.cGroupContents,
        [`${fsStub.cpuAcctDir}/cpuacct.usage`]: '357753491408',
        '/sys/fs/cgroup/cpu/docker/cpu.cfs_period_us': '100000',
        '/sys/fs/cgroup/cpu/docker/cpu.cfs_quota_us': '5000',
        '/sys/fs/cgroup/cpu/docker/cpu.stat': fsStub.cpuStatContents,
      });

      const stats = await getAllStats({ cpuPath: '/docker' });

      expect(stats).toEqual({
        cpuacct: {
          control_group: `/${fsStub.hierarchy}`,
          usage_nanos: 357753491408,
        },
        cpu: {
          control_group: '/docker',
          cfs_period_micros: 100000,
          cfs_quota_micros: 5000,
          stat: {
            number_of_elapsed_periods: 0,
            number_of_times_throttled: 10,
            time_throttled_nanos: 20,
          },
        },
      });
    });

    it('handles an undefined control group', async () => {
      setMockFiles({
        '/proc/self/cgroup': '',
        [`${fsStub.cpuAcctDir}/cpuacct.usage`]: '357753491408',
        [`${fsStub.cpuDir}/cpu.stat`]: fsStub.cpuStatContents,
        [`${fsStub.cpuDir}/cpu.cfs_period_us`]: '100000',
        [`${fsStub.cpuDir}/cpu.cfs_quota_us`]: '5000',
      });

      const stats = await getAllStats();

      expect(stats).toBe(null);
    });

    it('can override the cpuacct group path', async () => {
      setMockFiles({
        '/proc/self/cgroup': fsStub.cGroupContents,
        '/sys/fs/cgroup/cpuacct/docker/cpuacct.usage': '357753491408',
        [`${fsStub.cpuDir}/cpu.cfs_period_us`]: '100000',
        [`${fsStub.cpuDir}/cpu.cfs_quota_us`]: '5000',
        [`${fsStub.cpuDir}/cpu.stat`]: fsStub.cpuStatContents,
      });

      const stats = await getAllStats({ cpuAcctPath: '/docker' });

      expect(stats).toEqual({
        cpuacct: {
          control_group: '/docker',
          usage_nanos: 357753491408,
        },
        cpu: {
          control_group: `/${fsStub.hierarchy}`,
          cfs_period_micros: 100000,
          cfs_quota_micros: 5000,
          stat: {
            number_of_elapsed_periods: 0,
            number_of_times_throttled: 10,
            time_throttled_nanos: 20,
          },
        },
      });
    });

    it('extracts control group stats', async () => {
      setMockFiles(fsStub.files);
      const stats = await getAllStats();

      expect(stats).toEqual({
        cpuacct: {
          control_group: `/${fsStub.hierarchy}`,
          usage_nanos: 357753491408,
        },
        cpu: {
          control_group: `/${fsStub.hierarchy}`,
          cfs_period_micros: 100000,
          cfs_quota_micros: 5000,
          stat: {
            number_of_elapsed_periods: 0,
            number_of_times_throttled: 10,
            time_throttled_nanos: 20,
          },
        },
      });
    });

    it('returns null when all files are missing', async () => {
      setMockFiles();
      const stats = await getAllStats();
      expect(stats).toBeNull();
    });

    it('returns null if CPU accounting files are missing', async () => {
      setMockFiles({
        '/proc/self/cgroup': fsStub.cGroupContents,
        [`${fsStub.cpuDir}/cpu.stat`]: fsStub.cpuStatContents,
      });
      const stats = await getAllStats();

      expect(stats).toBeNull();
    });

    it('returns -1 stat values if cpuStat file is missing', async () => {
      setMockFiles({
        '/proc/self/cgroup': fsStub.cGroupContents,
        [`${fsStub.cpuAcctDir}/cpuacct.usage`]: '357753491408',
        [`${fsStub.cpuDir}/cpu.cfs_period_us`]: '100000',
        [`${fsStub.cpuDir}/cpu.cfs_quota_us`]: '5000',
      });
      const stats = await getAllStats();

      expect(stats).toEqual({
        cpu: {
          cfs_period_micros: 100000,
          cfs_quota_micros: 5000,
          control_group: `/${fsStub.hierarchy}`,
          stat: {
            number_of_elapsed_periods: -1,
            number_of_times_throttled: -1,
            time_throttled_nanos: -1,
          },
        },
        cpuacct: {
          control_group: `/${fsStub.hierarchy}`,
          usage_nanos: 357753491408,
        },
      });
    });
  });
});
