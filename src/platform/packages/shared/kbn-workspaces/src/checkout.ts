/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';

interface CheckoutOptions {
  log: ToolingLog;
  dir: string;
  sha: string;
}

/**
 * Force checkout a worktree according to the given sha
 */
export async function checkout({ log, dir, sha }: CheckoutOptions): Promise<void> {
  // Ensure the target sha is present locally. If rev-parse fails, fetch and retry.

  async function ensureObjectExists() {
    return await execa('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: dir })
      .then(() => true)
      .catch(() => false);
  }

  let exists = await ensureObjectExists();

  if (!exists) {
    await execa('git', ['fetch', '--all', '--prune', '--quiet'], { cwd: dir }).catch((error) => {
      throw new Error(`Failed to fetch updates in worktree ${dir}`, { cause: error });
    });
  }

  exists = await ensureObjectExists();

  if (!exists) {
    throw new Error(`Commit ${sha} not found after fetch in worktree ${dir}`);
  }

  log.info(`Checking out ${sha} in worktree ${dir}`);

  await execa('git', ['checkout', '--force', '--detach', sha], { cwd: dir }).catch((error) => {
    throw new Error(`Failed to checkout ${sha} in worktree ${dir}`, { cause: error });
  });
}
