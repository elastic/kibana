import fs from 'fs';
import { promisify } from 'bluebird';
import { join as joinPath } from 'path';

// Logic from elasticsearch/core/src/main/java/org/elasticsearch/monitor/os/OsProbe.java

const CONTROL_GROUP_RE = new RegExp('\\d+:([^:]+):(/.*)');
const CONTROLLER_SEPERATOR_RE = ',';

const PROC_SELF_CGROUP_FILE = '/proc/self/cgroup';
const PROC_CGROUP_CPU_DIR = '/sys/fs/cgroup/cpu';
const PROC_CGROUP_CPUACCT_DIR = '/sys/fs/cgroup/cpuacct';

const GROUP_CPUACCT = 'cpuacct';
const CPUACCT_USAGE_FILE = 'cpuacct.usage';

const GROUP_CPU = 'cpu';
const CPU_FS_PERIOD_US_FILE = 'cpu.cfs_period_us';
const CPU_FS_QUOTA_US_FILE = 'cpu.cfs_quota_us';

const CPU_STATS_FILE = 'cpu.stat';

const readFile = promisify(fs.readFile);

export function readControlGroups() {
  return readFile(PROC_SELF_CGROUP_FILE)
    .then(data => {
      const response = {};

      data.toString().split(/\n/).forEach(line => {
        const matches = line.match(CONTROL_GROUP_RE);

        if (matches === null) {
          return;
        }

        const controllers = matches[1].split(CONTROLLER_SEPERATOR_RE);
        controllers.forEach(controller => {
          response[controller] = matches[2];
        });
      });

      return response;
    });
}

function fileContentsToInteger(path) {
  return readFile(path).then(data => {
    return parseInt(data.toString());
  });
}

function readCPUAcctUsage(controlGroup) {
  return fileContentsToInteger(joinPath(PROC_CGROUP_CPUACCT_DIR, controlGroup, CPUACCT_USAGE_FILE));
}

function readCPUFsPeriod(controlGroup) {
  return fileContentsToInteger(joinPath(PROC_CGROUP_CPUACCT_DIR, controlGroup, CPU_FS_PERIOD_US_FILE));
}

function readCPUFsQuota(controlGroup) {
  return fileContentsToInteger(joinPath(PROC_CGROUP_CPUACCT_DIR, controlGroup, CPU_FS_QUOTA_US_FILE));
}

export function readCPUStat(controlGroup) {
  return new Promise((resolve, reject) => {
    const stat = {
      number_of_elapsed_periods: -1,
      number_of_times_throttled: -1,
      time_throttled_nanos: -1
    };

    readFile(joinPath(PROC_CGROUP_CPU_DIR, controlGroup, CPU_STATS_FILE)).then(data => {
      data.toString().split(/\n/).forEach(line => {
        const fields = line.split(/\s+/);

        switch(fields[0]) {
          case 'nr_periods':
            stat.number_of_elapsed_periods = parseInt(fields[1]);
            break;

          case 'nr_throttled':
            stat.number_of_times_throttled = parseInt(fields[1]);
            break;

          case 'throttled_time':
            stat.time_throttled_nanos = parseInt(fields[1]);
            break;
        }
      });

      resolve(stat);
    }).catch(err => {
      if (err.code === 'ENOENT') {
        return resolve(stat);
      }

      reject(err);
    });
  });
}

export function getAllStats() {
  return readControlGroups().then(groups => {
    return Promise.all([
      readCPUAcctUsage(groups[GROUP_CPUACCT]),
      readCPUFsPeriod(groups[GROUP_CPU]),
      readCPUFsQuota(groups[GROUP_CPU]),
      readCPUStat(groups[GROUP_CPU])
    ]).then(([ cpuAcctUsage, cpuFsPeriod, cpuFsQuota, cpuStat ]) => {
      const stats = {
        cpuacct: {
          control_group: groups[GROUP_CPUACCT],
          usage_nanos: cpuAcctUsage
        },

        cpu: {
          control_group: groups[GROUP_CPU],
          cfs_period_micros: cpuFsPeriod,
          cfs_quota_micros: cpuFsQuota,
          stat: cpuStat
        }
      };

      return stats;
    }).catch(throwUnlessFileNotFound);
  }).catch(throwUnlessFileNotFound);

  function throwUnlessFileNotFound(err) {
    if (err.code === 'ENOENT') {
      return null;
    }

    throw err;
  }
}
