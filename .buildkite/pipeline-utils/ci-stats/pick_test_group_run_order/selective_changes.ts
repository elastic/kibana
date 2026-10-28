/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'node:child_process';
import { listChangedFiles } from '../../affected-packages/strategy_git.ts';
import { getKibanaDir } from '../../get_kibana_dir.ts';

/** Lists changed files since the selection base; throws on Git or validation errors. */
export const resolveSelectiveTestingChanges = (
  selectionBase: string | undefined,
  isMergeQueue: boolean
): string[] => {
  const source = isMergeQueue ? 'BUILDKITE_MERGE_QUEUE_BASE_COMMIT' : 'GITHUB_PR_MERGE_BASE';
  console.log(`Selective testing base: ${source}=${selectionBase || '(unset)'}`);

  if (!selectionBase) {
    throw new Error(`${source} is not set`);
  }
  // Reject moving refs such as "main"; merge groups must use the pinned commit from their event.
  if (isMergeQueue && !/^[a-f0-9]{40}$/i.test(selectionBase)) {
    throw new Error(`${source} must be a full commit SHA`);
  }

  const git = (args: string[]): string =>
    execFileSync('git', args, {
      cwd: getKibanaDir(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  const head = git(['rev-parse', '--verify', 'HEAD^{commit}']);
  const requestedBase = git([
    'rev-parse',
    '--verify',
    '--end-of-options',
    `${selectionBase}^{commit}`,
  ]);

  // PR refs can resolve to an earlier common ancestor, but a merge group's base
  // must stay fixed so the comparison excludes earlier queued PRs.
  const base = git(['merge-base', requestedBase, head]);
  if (isMergeQueue && base !== requestedBase) {
    throw new Error(`${source}=${requestedBase} is not an ancestor of HEAD=${head}`);
  }

  const changedFiles = listChangedFiles({ mergeBase: base, commit: head });
  console.log(
    `Selective testing comparison: base=${base} head=${head} changedFiles=${changedFiles.length}`
  );
  return changedFiles;
};
