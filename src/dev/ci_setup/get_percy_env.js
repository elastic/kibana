/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
