import expect from 'expect.js';
import mockFs from 'mock-fs';
import { cGroups as cGroupsFsStub } from './fs_stubs';
import { getAllStats, readControlGroups, readCPUStat } from '../cgroup';

describe('Control Group', function () {
  const fsStub = cGroupsFsStub();

  afterEach(() => {
    mockFs.restore();
  });

  describe('readControlGroups', () => {
    it('parses the file', async () => {
      mockFs({ '/proc/self/cgroup': fsStub.cGroupContents });
      const cGroup = await readControlGroups();

      expect(cGroup).to.eql({
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
        'name=systemd': '/user.slice/user-1000.slice/session-2359.scope'
      });
    });
  });

  describe('readCPUStat', () => {
    it('parses the file', async () => {
      mockFs({ '/sys/fs/cgroup/cpu/fakeGroup/cpu.stat': fsStub.cpuStatContents });
      const cpuStat = await readCPUStat('fakeGroup');

      expect(cpuStat).to.eql({
        number_of_elapsed_periods: 0,
        number_of_times_throttled: 10,
        time_throttled_nanos:  20
      });
    });

    it('returns default stats for missing file', async () => {
      mockFs();
      const cpuStat = await readCPUStat('fakeGroup');

      expect(cpuStat).to.eql({
        number_of_elapsed_periods: -1,
        number_of_times_throttled: -1,
        time_throttled_nanos:  -1
      });
    });
  });

  describe('getAllStats', () => {
    it('can override the cpu group path', async () => {
      mockFs({
        '/proc/self/cgroup': fsStub.cGroupContents,
        [`${fsStub.cpuAcctDir}/cpuacct.usage`]: '357753491408',
        '/sys/fs/cgroup/cpu/docker/cpu.cfs_period_us': '100000',
        '/sys/fs/cgroup/cpu/docker/cpu.cfs_quota_us': '5000',
        '/sys/fs/cgroup/cpu/docker/cpu.stat': fsStub.cpuStatContents,
      });

      const stats = await getAllStats({ cpuPath: '/docker' });

      expect(stats).to.eql({
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
            time_throttled_nanos: 20
          }
        }
      });
    });

    it('handles an undefined control group', async () => {
      mockFs({
        '/proc/self/cgroup': '',
        [`${fsStub.cpuAcctDir}/cpuacct.usage`]: '357753491408',
        [`${fsStub.cpuDir}/cpu.stat`]: fsStub.cpuStatContents,
        [`${fsStub.cpuDir}/cpu.cfs_period_us`]: '100000',
        [`${fsStub.cpuDir}/cpu.cfs_quota_us`]: '5000'
      });

      const stats = await getAllStats();

      expect(stats).to.be(null);
    });

    it('can override the cpuacct group path', async () => {
      mockFs({
        '/proc/self/cgroup': fsStub.cGroupContents,
        '/sys/fs/cgroup/cpuacct/docker/cpuacct.usage': '357753491408',
        [`${fsStub.cpuDir}/cpu.cfs_period_us`]: '100000',
        [`${fsStub.cpuDir}/cpu.cfs_quota_us`]: '5000',
        [`${fsStub.cpuDir}/cpu.stat`]: fsStub.cpuStatContents,
      });

      const stats = await getAllStats({ cpuAcctPath: '/docker' });

      expect(stats).to.eql({
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
            time_throttled_nanos: 20
          }
        }
      });
    });

    it('extracts control group stats', async () => {
      mockFs(fsStub.files);
      const stats = await getAllStats();

      expect(stats).to.eql({
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
            time_throttled_nanos: 20
          }
        }
      });
    });

    it('returns null when all files are missing', async () => {
      mockFs({});
      const stats = await getAllStats();
      expect(stats).to.be.null;
    });

    it('returns null if CPU accounting files are missing', async () => {
      mockFs({
        '/proc/self/cgroup': fsStub.cGroupContents,
        [`${fsStub.cpuDir}/cpu.stat`]: fsStub.cpuStatContents
      });
      const stats = await getAllStats();

      expect(stats).to.be.null;
    });

    it('returns null if cpuStat file is missing', async () => {
      mockFs({
        '/proc/self/cgroup': fsStub.cGroupContents,
        [`${fsStub.cpuAcctDir}/cpuacct.usage`]: '357753491408',
        [`${fsStub.cpuDir}/cpu.cfs_period_us`]: '100000',
        [`${fsStub.cpuDir}/cpu.cfs_quota_us`]: '5000'
      });
      const stats = await getAllStats();

      expect(stats).to.be.null;
    });
  });
});
