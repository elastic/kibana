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
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import { findElasticKibanaRemote } from './remote';

const execFileAsync = promisify(execFile);

/**
 * Get files changed in the current branch compared to a base ref
 */
export async function getChangedFilesFromBranch(baseRef: string): Promise<string[]> {
  try {
    // First, find the merge base between HEAD and the base ref
    const { stdout: mergeBase } = await execFileAsync('git', ['merge-base', baseRef, 'HEAD'], {
      cwd: REPO_ROOT,
    });
    const base = mergeBase.trim();

    // Then diff from the merge base to HEAD
    const { stdout } = await execFileAsync(
      'git',
      ['diff', '--name-only', '--diff-filter=ACMR', base, 'HEAD'],
      {
        cwd: REPO_ROOT,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
      }
    );
    return stdout
      .trim()
      .split('\n')
      .filter((f) => f.length > 0);
  } catch {
    return [];
  }
}

/**
 * Resolve changed files from the --branch flag
 * Finds the elastic/kibana remote and fetches the latest main
 */
export async function resolveChangedFilesFromBranch(log: ToolingLog): Promise<string[]> {
  // Find the elastic/kibana remote
  const elasticRemote = await findElasticKibanaRemote();
  const remoteName = elasticRemote || 'origin';
  const baseRef = `${remoteName}/main`;

  log.info(`Comparing against ${baseRef}...`);

  // Fetch the latest from the remote to ensure we have up-to-date refs
  try {
    await execFileAsync('git', ['fetch', remoteName, 'main:refs/remotes/' + baseRef], {
      cwd: REPO_ROOT,
    });
    log.info(`Fetched latest from ${remoteName}/main`);
  } catch {
    log.warning(`Could not fetch from remote, using local ref`);
  }

  const files = await getChangedFilesFromBranch(baseRef);

  if (files.length === 0) {
    log.info('No changed files found in current branch');
  } else {
    log.info(`Found ${files.length} changed file(s) in branch`);
  }

  return files;
}
