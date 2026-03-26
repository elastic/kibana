/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import Path from 'path';
import { exec } from './exec';
import { exists } from './utils/exists';
import type { WorkspaceGlobalContext } from './types';

/**
 * Create a git worktree at the given path for the provided ref if it does not already exist.
 * Assumes the base clone exists (context.baseCloneDir) and contains the ref.
 */
export async function ensureWorktree(
  context: WorkspaceGlobalContext,
  { path, ref }: { path: string; ref: string }
): Promise<void> {
  const { log, baseCloneDir } = context;

  const gitDir = Path.join(baseCloneDir, '..', path, '.git');

  log.debug(`Checking for worktree at ${gitDir}`);

  const worktreeExists = await exists(gitDir);

  if (worktreeExists) {
    log.debug(`Worktree already exists at ${path}`);
    return;
  }

  log.info(`Creating worktree at ${path} for ref ${ref}`);

  await exec(`git worktree add --detach ../${path} ${ref}`, {
    log,
    cwd: baseCloneDir,
  });
}
