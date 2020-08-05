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

const isPr = !!process.env.ghprbPullId;
if (isPr && !(process.env.PR_TARGET_BRANCH && process.env.PR_SOURCE_BRANCH)) {
  throw new Error(
    'getPercyEnv: Unable to determine percy environment in prs without [PR_TARGET_BRANCH] and [PR_SOURCE_BRANCH] environment variables'
  );
}

let branch;
if (isPr) {
  branch = process.env.PR_SOURCE_BRANCH;
} else {
  if (!process.env.branch_specifier) {
    throw new Error('getPercyEnv: [branch_specifier] environment variable required');
  }

  branch = process.env.branch_specifier.split('refs/heads/')[1];

  if (!branch) {
    throw new Error(
      `getPercyEnv: [branch_specifier=${process.env.branch_specifier}] must start with 'refs/heads/'`
    );
  }
}

console.log(`export PERCY_PARALLEL_TOTAL=2;`);
console.log(
  `export PERCY_PARALLEL_NONCE="${shortCommit}/${isPr ? 'PR' : branch}/${process.env.BUILD_ID}";`
);
console.log(`export PERCY_BRANCH="${branch}";`);
// percy snapshots always target pkg.branch, so that feature branches can be based on master/7.x/etc.
console.log(`export PERCY_TARGET_BRANCH="${isPr ? process.env.PR_TARGET_BRANCH : pkg.branch}";`);
