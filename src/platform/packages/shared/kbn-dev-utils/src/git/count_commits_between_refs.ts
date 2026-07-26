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

/** Counts commits reachable from `head` that are not reachable from `base`. */
export const countCommitsBetweenRefs = async ({
  base,
  head,
}: {
  base: string;
  head: string;
}): Promise<number> => {
  const { stdout } = await execa('git', ['rev-list', '--count', `${base}..${head}`], {
    cwd: REPO_ROOT,
    stdin: 'ignore',
  });

  const commitCount = Number.parseInt(stdout.trim(), 10);
  if (Number.isNaN(commitCount)) {
    throw new Error(`git rev-list returned a non-numeric commit count: '${stdout.trim()}'`);
  }

  return commitCount;
};
