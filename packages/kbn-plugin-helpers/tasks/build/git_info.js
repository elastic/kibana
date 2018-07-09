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

const execFileSync = require('child_process').execFileSync;

module.exports = function gitInfo(rootPath) {
  try {
    const LOG_SEPARATOR = '||';
    const commitCount = execFileSync('git', ['rev-list', '--count', 'HEAD'], {
      cwd: rootPath,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    });
    const logLine = execFileSync('git', ['log', '--pretty=%h' + LOG_SEPARATOR + '%cD', '-n', '1'], {
      cwd: rootPath,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).split(LOG_SEPARATOR);

    return {
      count: commitCount.trim(),
      sha: logLine[0].trim(),
      date: logLine[1].trim(),
    };
  } catch (e) {
    return {};
  }
};
