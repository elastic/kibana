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

const execa = require('execa');
const pkg = require('../../../package.json');

const { stdout: commit } = execa.sync('git', ['rev-parse', 'HEAD']);
const shortCommit = commit.slice(0, 8);

const isPr = process.env.JOB_NAME.includes('elastic+kibana+pull-request');
let branch = process.env.PR_TARGET_BRANCH;

if (!isPr) {
  if (!process.env.branch_specifier) {
    throw new Error('Unable to determine PERCY_BRANCH without a [branch_specifier]');
  }

  [, branch] = process.env.branch_specifier.split('refs/heads/');
  if (!branch) {
    throw new Error(
      `Unable to determine PERCY_BRANCH from [branch_specifier=${process.env.branch_specifier}], expected it to start with [refs/heads/]`
    );
  }
}

console.log(`export PERCY_PARALLEL_TOTAL=2;`);
console.log(`export PERCY_PARALLEL_NONCE="${shortCommit}/${isPr ? 'PR' : pkg.branch}/${process.env.BUILD_ID}";`);
console.log(`export PERCY_BRANCH="${branch}";`);
