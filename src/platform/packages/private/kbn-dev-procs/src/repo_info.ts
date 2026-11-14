/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFile } from 'child_process';
import { promisify } from 'util';

export interface RepoInfo {
  /** The checked-out branch, or undefined when HEAD is detached. */
  readonly branch?: string;
  readonly shortCommit: string;
}

const git = async (repoRoot: string, args: readonly string[]): Promise<string> => {
  const { stdout } = await promisify(execFile)('git', [...args], { cwd: repoRoot });
  return stdout.trim();
};

/** Reads the branch and short commit of the checkout at `repoRoot`; undefined outside a git checkout. */
export const readRepoInfo = async (repoRoot: string): Promise<RepoInfo | undefined> => {
  try {
    const [branch, shortCommit] = await Promise.all([
      git(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD']),
      git(repoRoot, ['rev-parse', '--short', 'HEAD']),
    ]);
    return { branch: branch === 'HEAD' ? undefined : branch, shortCommit };
  } catch {
    return undefined;
  }
};
