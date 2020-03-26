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

export function cGroups(hierarchy) {
  if (!hierarchy) {
    hierarchy = Math.random()
      .toString(36)
      .substring(7);
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
    '1:name=systemd:/user.slice/user-1000.slice/session-2359.scope',
  ].join('\n');

  const cpuStatContents = ['nr_periods 0', 'nr_throttled 10', 'throttled_time 20'].join('\n');

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
    },
  };
}

class FSError extends Error {
  constructor(fileName, code) {
    super('Stub File System Stub Error: ' + fileName);
    this.code = code;
    this.stack = null;
  }
}

let _mockFiles = Object.create({});

export const setMockFiles = mockFiles => {
  _mockFiles = Object.create({});
  if (mockFiles) {
    const files = Object.keys(mockFiles);
    for (const file of files) {
      _mockFiles[file] = mockFiles[file];
    }
  }
};

export const readFileMock = (fileName, callback) => {
  if (_mockFiles.hasOwnProperty(fileName)) {
    callback(null, _mockFiles[fileName]);
  } else {
    const err = new FSError(fileName, 'ENOENT');
    callback(err, null);
  }
};
