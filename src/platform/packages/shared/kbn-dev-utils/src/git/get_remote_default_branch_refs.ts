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

const splitLines = (value: string): string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

export const getRemoteDefaultBranchRefs = async (): Promise<string[]> => {
  const { stdout } = await execa(
    'git',
    ['for-each-ref', '--format=%(refname)', 'refs/remotes/*/HEAD'],
    {
      cwd: REPO_ROOT,
      stdin: 'ignore',
    }
  );

  const remoteHeadRefs = splitLines(stdout);
  const resolvedRefs = await Promise.all(
    remoteHeadRefs.map(async (remoteHeadRef) => {
      try {
        const { stdout: baseRefStdout } = await execa(
          'git',
          ['symbolic-ref', '--short', remoteHeadRef],
          {
            cwd: REPO_ROOT,
            stdin: 'ignore',
          }
        );

        const baseRef = baseRefStdout.trim();
        return baseRef.length > 0 ? baseRef : undefined;
      } catch {
        return undefined;
      }
    })
  );

  return [...new Set(resolvedRefs.filter((ref): ref is string => Boolean(ref)))];
};
