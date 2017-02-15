import expect from 'expect.js';
import mockFs from 'mock-fs';
import { getAllStats, readControlGroups, readCPUStat } from '../cgroup';

describe('Control Group', function () {
  const cGroupContents = [
    '11:blkio:/user.slice/elastic',
    '10:cpuset:/elastic',
    '9:pids:/user.slice/user-1000.slice/elastic',
    '8:cpu,cpuacct:/user.slice/elastic',
    '7:memory:/user.slice/elastic',
    '6:net_cls,net_prio:/elastic',
    '5:hugetlb:/elastic',
    '4:freezer:/elastic',
    '3:perf_event:/elastic',
    '2:devices:/user.slice/elastic',
    '1:name=systemd:/user.slice/user-1000.slice/session-88.scope/elastic'
  ].join('\n');

  const cpuStatContents = [
    'nr_periods 0',
    'nr_throttled 10',
    'throttled_time 20'
  ].join('\n');

  afterEach(() => {
    mockFs.restore();
  });

  describe('readControlGroups', () => {
    it('parses the file', async () => {
      mockFs({ '/proc/self/cgroup': cGroupContents });
      const cGroup = await readControlGroups();

      expect(cGroup).to.eql({
        'blkio': '/user.slice/elastic',
        'cpu': '/user.slice/elastic',
        'cpuacct': '/user.slice/elastic',
        'cpuset': '/elastic',
        'devices': '/user.slice/elastic',
        'freezer': '/elastic',
        'hugetlb': '/elastic',
        'memory': '/user.slice/elastic',
        'name=systemd': '/user.slice/user-1000.slice/session-88.scope/elastic',
        'net_cls': '/elastic',
        'net_prio': '/elastic',
        'perf_event': '/elastic',
        'pids': '/user.slice/user-1000.slice/elastic'
      });
    });
  });

  describe('readCPUStat', () => {
    it('parses the file', async () => {
      mockFs({ '/sys/fs/cgroup/cpu/fakeGroup/cpu.stat': cpuStatContents });
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
    const files = {
      '/proc/self/cgroup': cGroupContents,
      '/sys/fs/cgroup/cpuacct/user.slice/elastic/cpuacct.usage': '357753491408',
      '/sys/fs/cgroup/cpuacct/user.slice/elastic/cpu.cfs_period_us': '100000',
      '/sys/fs/cgroup/cpuacct/user.slice/elastic/cpu.cfs_quota_us': '5000',
      '/sys/fs/cgroup/cpu/user.slice/elastic/cpu.stat': cpuStatContents
    };

    it('extracts control group stats', async () => {
      mockFs(files);
      const stats = await getAllStats();

      expect(stats).to.eql({
        cpuacct: {
          control_group: '/user.slice/elastic',
          usage_nanos: 357753491408,
        },
        cpu: {
          control_group: '/user.slice/elastic',
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
        '/proc/self/cgroup': cGroupContents,
        '/sys/fs/cgroup/cpu/user.slice/elastic/cpu.stat': cpuStatContents
      });
      const stats = await getAllStats();
      mockFs.restore();

      expect(stats).to.be.null;
    });

    it('returns null if cpuStat file is missing', async () => {
      mockFs({
        '/proc/self/cgroup': cGroupContents,
        '/sys/fs/cgroup/cpuacct/user.slice/elastic/cpuacct.usage': '357753491408',
        '/sys/fs/cgroup/cpuacct/user.slice/elastic/cpu.cfs_period_us': '100000',
        '/sys/fs/cgroup/cpuacct/user.slice/elastic/cpu.cfs_quota_us': '5000',
      });
      const stats = await getAllStats();

      expect(stats).to.be.null;
    });
  });
});
