/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import Fs from 'fs/promises';
import type { WorkspaceGlobalContext } from './types';
import { exec } from './exec';
import { exists } from './utils/exists';

/**
 * Ensure a lightweight clone of the main Kibana repo exists. The caller pre-computes
 * and supplies `baseCloneDir` on the WorkspaceContext. Individual git worktrees are
 * then created as siblings inside `${workspaceRoot}/`, not nested inside the base
 * clone (git requires that worktrees live outside the primary working tree directory).
 */
export async function ensureClonedRepo(context: WorkspaceGlobalContext): Promise<string> {
  const { log, baseCloneDir, repoRoot, workspacesRoot } = context;

  await Fs.mkdir(workspacesRoot, { recursive: true });

  const gitDir = `${baseCloneDir}/.git`;
  const gitDirExists = await exists(gitDir);

  if (!gitDirExists) {
    log.info(`Cloning base repo from ${repoRoot} to ${baseCloneDir}`);

    await exec(`git clone ${repoRoot} ${baseCloneDir}`, {
      log,
      cwd: process.cwd(),
    });
    return baseCloneDir;
  }

  log.debug(`Base clone already present at ${baseCloneDir}; fetching updates`);

  await exec('git fetch --all --prune', {
    log,
    cwd: baseCloneDir,
  });

  return baseCloneDir;
}
