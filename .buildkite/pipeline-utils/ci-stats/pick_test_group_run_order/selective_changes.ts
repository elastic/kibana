/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { listChangedFiles } from '../../affected-packages/strategy_git.ts';
import { FULL_SHA_PATTERN, git } from '../../git.ts';

export type SelectionBaseKind = 'pr' | 'merge-queue' | 'on-merge';

const BASE_SOURCE: Record<SelectionBaseKind, string> = {
  pr: 'GITHUB_PR_MERGE_BASE',
  'merge-queue': 'BUILDKITE_MERGE_QUEUE_BASE_COMMIT',
  'on-merge': 'on-merge-selection base',
};

/** Lists changed files since the selection base; throws on Git or validation errors. */
export const resolveSelectiveTestingChanges = (
  selectionBase: string | undefined,
  kind: SelectionBaseKind
): string[] => {
  const source = BASE_SOURCE[kind];
  const isPinned = kind !== 'pr';
  console.log(`Selective testing base: ${source}=${selectionBase || '(unset)'}`);

  if (!selectionBase) {
    throw new Error(`${source} is not set`);
  }
  // Reject moving refs such as "main"; pinned bases must be the exact commit from their source.
  if (isPinned && !FULL_SHA_PATTERN.test(selectionBase)) {
    throw new Error(`${source} must be a full commit SHA`);
  }

  const head = git(['rev-parse', '--verify', 'HEAD^{commit}']);
  const requestedBase = git([
    'rev-parse',
    '--verify',
    '--end-of-options',
    `${selectionBase}^{commit}`,
  ]);

  // PR refs can resolve to an earlier common ancestor, but a pinned base
  // must stay fixed so the comparison excludes changes outside its range.
  const base = git(['merge-base', requestedBase, head]);
  if (isPinned && base !== requestedBase) {
    throw new Error(`${source}=${requestedBase} is not an ancestor of HEAD=${head}`);
  }

  const changedFiles = listChangedFiles({ mergeBase: base, commit: head });
  console.log(
    `Selective testing comparison: base=${base} head=${head} changedFiles=${changedFiles.length}`
  );
  return changedFiles;
};
