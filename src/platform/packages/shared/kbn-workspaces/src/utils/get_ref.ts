/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';

/**
 * Return the current ref for the git worktree at `dir`. If HEAD is attached to a
 * branch, returns the branch name (e.g. "main"). If HEAD is detached, returns the
 * full commit SHA.
 */
export async function getRef(dir: string): Promise<string> {
  try {
    const { stdout: branchOut } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: dir,
    });
    const branch = branchOut.trim();
    if (branch && branch !== 'HEAD') {
      return branch;
    }
    const { stdout: shaOut } = await execa('git', ['rev-parse', 'HEAD'], { cwd: dir });
    return shaOut.trim();
  } catch (err) {
    throw new Error(`Failed to resolve current ref in ${dir}`, { cause: err });
  }
}
