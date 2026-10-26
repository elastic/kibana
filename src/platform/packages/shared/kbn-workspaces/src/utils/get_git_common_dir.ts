/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import execa from 'execa';

/**
 * Resolve the shared git object store for a checkout, including worktrees.
 */
export async function getGitCommonDir(cwd: string): Promise<string> {
  const { stdout } = await execa('git', ['rev-parse', '--git-common-dir'], { cwd });
  const gitCommonDir = stdout.trim();

  if (Path.isAbsolute(gitCommonDir)) {
    return gitCommonDir;
  }

  return Path.resolve(cwd, gitCommonDir);
}
