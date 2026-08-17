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
import { commitExists } from './utils/commit_exists';

interface CheckoutOptions {
  log: ToolingLog;
  dir: string;
  sourceRepo: string;
  sha: string;
}

/**
 * Force checkout a worktree according to the given sha
 */
export async function checkout({ log, dir, sourceRepo, sha }: CheckoutOptions): Promise<void> {
  // Ensure the target sha is present locally. If rev-parse fails, fetch and retry.

  let exists = await commitExists(dir, sha);

  if (!exists) {
    await execa('git', ['fetch', sourceRepo, sha, '--quiet'], { cwd: dir }).catch((error) => {
      throw new Error(`Failed to fetch commit ${sha} in worktree ${dir}`, { cause: error });
    });
  }

  exists = await commitExists(dir, sha);

  if (!exists) {
    throw new Error(`Commit ${sha} not found after fetch in worktree ${dir}`);
  }

  log.info(`Checking out ${sha} in worktree ${dir}`);

  await execa('git', ['checkout', '--force', '--detach', sha], { cwd: dir }).catch((error) => {
    throw new Error(`Failed to checkout ${sha} in worktree ${dir}`, { cause: error });
  });
}
