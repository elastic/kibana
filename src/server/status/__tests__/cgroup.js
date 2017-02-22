import expect from 'expect.js';
import mockFs from 'mock-fs';
import { getAllStats, readControlGroups, readCPUStat } from '../cgroup';

describe('Control Group', function () {
  const hierarchy = Math.random().toString(36).substring(7);

  const cGroupContents = [
    '10:freezer:/',
    '9:net_cls,net_prio:/',
    '8:pids:/',
    '7:blkio:/',
    '6:memory:/',
    '5:devices:/user.slice',
    '4:hugetlb:/',
    '3:perf_event:/',
    '2:cpu,cpuacct,cpuset:/' + hierarchy,
    '1:name=systemd:/user.slice/user-1000.slice/session-2359.scope'
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
        freezer: '/',
        net_cls: '/',
        net_prio: '/',
        pids: '/',
        blkio: '/',
        memory: '/',
        devices: '/user.slice',
        hugetlb: '/',
        perf_event: '/',
        cpu: `/${hierarchy}`,
        cpuacct: `/${hierarchy}`,
        cpuset: `/${hierarchy}`,
        'name=systemd': '/user.slice/user-1000.slice/session-2359.scope'
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
    const cpuAcctDir = `/sys/fs/cgroup/cpuacct/${hierarchy}`;
    const cpuDir = `/sys/fs/cgroup/cpu/${hierarchy}`;
    const files = {
      '/proc/self/cgroup': cGroupContents,
      [`${cpuAcctDir}/cpuacct.usage`]: '357753491408',
      [`${cpuAcctDir}/cpu.cfs_period_us`]: '100000',
      [`${cpuAcctDir}/cpu.cfs_quota_us`]: '5000',
      [`${cpuDir}/cpu.stat`]: cpuStatContents,
    };

    it('extracts control group stats', async () => {
      mockFs(files);
      const stats = await getAllStats();

      expect(stats).to.eql({
        cpuacct: {
          control_group: `/${hierarchy}`,
          usage_nanos: 357753491408,
        },
        cpu: {
          control_group: `/${hierarchy}`,
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
        [`${cpuDir}/cpu.stat`]: cpuStatContents
      });
      const stats = await getAllStats();
      mockFs.restore();

      expect(stats).to.be.null;
    });

    it('returns null if cpuStat file is missing', async () => {
      mockFs({
        '/proc/self/cgroup': cGroupContents,
        [`${cpuAcctDir}/cpuacct.usage`]: '357753491408',
        [`${cpuAcctDir}/cpu.cfs_period_us`]: '100000',
        [`${cpuAcctDir}/cpu.cfs_quota_us`]: '5000'
      });
      const stats = await getAllStats();

      expect(stats).to.be.null;
    });
  });
});
