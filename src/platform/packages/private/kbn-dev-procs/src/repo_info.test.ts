/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { readRepoInfo } from './repo_info';

describe('readRepoInfo', () => {
  let repoRoot: string;
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();

  beforeEach(() => {
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kbn-dev-procs-repo-'));
  });

  afterEach(() => {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  it('reads the branch and short commit, and no branch when HEAD is detached', async () => {
    git('init', '--quiet', '--initial-branch', 'my-branch');
    git(
      '-c',
      'user.name=test',
      '-c',
      'user.email=test@example.com',
      'commit',
      '--quiet',
      '--allow-empty',
      '-m',
      'first'
    );
    const shortCommit = git('rev-parse', '--short', 'HEAD');

    await expect(readRepoInfo(repoRoot)).resolves.toEqual({ branch: 'my-branch', shortCommit });

    git('checkout', '--quiet', '--detach');
    await expect(readRepoInfo(repoRoot)).resolves.toEqual({ branch: undefined, shortCommit });
  });

  it('reads nothing outside a git checkout', async () => {
    await expect(readRepoInfo(repoRoot)).resolves.toBeUndefined();
  });
});
