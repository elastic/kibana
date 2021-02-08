/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Inspired on https://github.com/buildbuddy-io/buildbuddy/blob/master/workspace_status.sh
// This script will be run bazel when building process starts to
// generate key-value information that represents the status of the
// workspace. The output should be like
//
// KEY1 VALUE1
// KEY2 VALUE2
//
// If the script exits with non-zero code, it's considered as a failure
// and the output will be discarded.

(async () => {
  const execa = require('execa');
  const os = require('os');

  async function runCmd(cmd, args) {
    try {
      return await execa(cmd, args);
    } catch (e) {
      return { exitCode: 1 };
    }
  }

  // Git repo
  const kbnGitOriginName = process.env.KBN_GIT_ORIGIN_NAME || 'origin';
  const repoUrlCmdResult = await runCmd('git', [
    'config',
    '--get',
    `remote.${kbnGitOriginName}.url`,
  ]);
  if (repoUrlCmdResult.exitCode === 0) {
    // Only output REPO_URL when found it
    console.log(`REPO_URL ${repoUrlCmdResult.stdout}`);
  }

  // Commit SHA
  const commitSHACmdResult = await runCmd('git', ['rev-parse', 'HEAD']);
  if (commitSHACmdResult.exitCode !== 0) {
    process.exit(1);
  }
  console.log(`COMMIT_SHA ${commitSHACmdResult.stdout}`);

  // Git branch
  const gitBranchCmdResult = await runCmd('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (gitBranchCmdResult.exitCode !== 0) {
    process.exit(1);
  }
  console.log(`GIT_BRANCH ${gitBranchCmdResult.stdout}`);

  // Tree status
  const treeStatusCmdResult = await runCmd('git', ['diff-index', '--quiet', 'HEAD', '--']);
  const treeStatusVarStr = 'GIT_TREE_STATUS';
  if (treeStatusCmdResult.exitCode === 0) {
    console.log(`${treeStatusVarStr} Clean`);
  } else {
    console.log(`${treeStatusVarStr} Modified`);
  }

  // Host
  if (process.env.CI) {
    const hostCmdResult = await runCmd('hostname');
    const hostStr = hostCmdResult.stdout.split('-').slice(0, -1).join('-');
    const coresStr = os.cpus().filter((cpu, index) => {
      return !cpu.model.includes('Intel') || index % 2 === 1;
    }).length;

    if (hostCmdResult.exitCode !== 0) {
      process.exit(1);
    }
    console.log(`HOST ${hostStr}-${coresStr}`);
  }
})();
