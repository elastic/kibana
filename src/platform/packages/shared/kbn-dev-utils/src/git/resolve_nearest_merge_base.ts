/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';

import { REPO_ROOT } from '@kbn/repo-info';

export interface NearestMergeBaseCandidate {
  baseRef: string;
  mergeBase: string;
  aheadCount: number;
}

/**
 * Resolves the closest merge-base candidate between `headRef` and the provided base refs.
 * "Closest" is the candidate with the smallest ahead count from the merge base to head.
 */
export const resolveNearestMergeBase = async ({
  baseRefs,
  headRef = 'HEAD',
}: {
  baseRefs: string[];
  headRef?: string;
}): Promise<NearestMergeBaseCandidate | undefined> => {
  let bestCandidate: NearestMergeBaseCandidate | undefined;

  for (const baseRef of baseRefs) {
    try {
      const { stdout: mergeBaseStdout } = await execa('git', ['merge-base', headRef, baseRef], {
        cwd: REPO_ROOT,
        stdin: 'ignore',
      });

      const mergeBase = mergeBaseStdout.trim();
      if (!mergeBase) {
        continue;
      }

      const { stdout: aheadCountStdout } = await execa(
        'git',
        ['rev-list', '--count', `${mergeBase}..${headRef}`],
        {
          cwd: REPO_ROOT,
          stdin: 'ignore',
        }
      );

      const aheadCount = Number.parseInt(aheadCountStdout.trim(), 10);
      if (Number.isNaN(aheadCount)) {
        continue;
      }

      if (!bestCandidate || aheadCount < bestCandidate.aheadCount) {
        bestCandidate = {
          baseRef,
          mergeBase,
          aheadCount,
        };
      }
    } catch {
      // Ignore refs we cannot compare against.
    }
  }

  return bestCandidate;
};
