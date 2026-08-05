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
import { getGitCommonDir } from './utils/get_git_common_dir';

/**
 * Ensure a lightweight clone of the main Kibana repo exists. The caller pre-computes
 * and supplies `baseCloneDir` on the WorkspaceContext. Individual git worktrees are
 * then created as siblings inside `${workspaceRoot}/`, not nested inside the base
 * clone (git requires that worktrees live outside the primary working tree directory).
 *
 * The base clone shares object storage with the source repo via `git clone --reference`.
 */
/**
 * Ensure the requested ref is present in the base clone.
 * Callers should pass a resolved commit SHA so fetch updates the local object store.
 */
export async function ensureClonedRepo(
  context: WorkspaceGlobalContext,
  { ref }: { ref: string }
): Promise<string> {
  const { log, baseCloneDir, repoRoot, workspacesRoot } = context;

  await Fs.mkdir(workspacesRoot, { recursive: true });

  const gitDir = `${baseCloneDir}/.git`;
  const gitDirExists = await exists(gitDir);

  if (!gitDirExists) {
    const referenceDir = await getGitCommonDir(repoRoot);

    log.info(`Cloning base repo from ${repoRoot} to ${baseCloneDir} (reference ${referenceDir})`);

    await exec('git', ['clone', '--reference', referenceDir, repoRoot, baseCloneDir], {
      log,
      cwd: process.cwd(),
    });

    await fetchRef({ log, baseCloneDir, ref });

    return baseCloneDir;
  }

  log.debug(`Base clone already present at ${baseCloneDir}; fetching ref ${ref}`);

  await fetchRef({ log, baseCloneDir, ref });

  return baseCloneDir;
}

async function fetchRef({
  log,
  baseCloneDir,
  ref,
}: {
  log: WorkspaceGlobalContext['log'];
  baseCloneDir: string;
  ref: string;
}) {
  await exec('git', ['fetch', 'origin', ref], {
    log,
    cwd: baseCloneDir,
  });
}
