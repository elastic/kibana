export function cGroups(hierarchy) {
  if (!hierarchy) {
    hierarchy = Math.random().toString(36).substring(7);
  }

  const cpuAcctDir = `/sys/fs/cgroup/cpuacct/${hierarchy}`;
  const cpuDir = `/sys/fs/cgroup/cpu/${hierarchy}`;

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

  return {
    hierarchy,
    cGroupContents,
    cpuStatContents,
    cpuAcctDir,
    cpuDir,
    files: {
      '/proc/self/cgroup': cGroupContents,
      [`${cpuAcctDir}/cpuacct.usage`]: '357753491408',
      [`${cpuDir}/cpu.cfs_period_us`]: '100000',
      [`${cpuDir}/cpu.cfs_quota_us`]: '5000',
      [`${cpuDir}/cpu.stat`]: cpuStatContents,
    }
  };
}
