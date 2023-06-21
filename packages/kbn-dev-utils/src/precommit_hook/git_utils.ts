/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import execa from 'execa';

import { REPO_ROOT } from '@kbn/repo-info';

// Retrieves the correct location for the .git dir for
// every git setup (including git worktree)
export async function getGitDir() {
  return (
    await execa('git', ['rev-parse', '--git-common-dir'], {
      cwd: REPO_ROOT,
    })
  ).stdout.trim();
}

// Checks if a correct git version is installed
export async function isCorrectGitVersionInstalled() {
  const rawGitVersionStr = (
    await execa('git', ['--version'], {
      cwd: REPO_ROOT,
    })
  ).stdout.trim();

  const match = rawGitVersionStr.match(/[0-9]+(\.[0-9]+)+/);
  if (!match) {
    return false;
  }

  const [major, minor] = match[0].split('.').map((n) => parseInt(n, 10));
  return major > 2 || (major === 2 && minor >= 5);
}
