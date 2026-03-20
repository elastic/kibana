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

/**
 * Creates an ephemeral commit from the current Git index without updating any refs.
 * Used by staged-scope affected checks where tooling needs a real `head` SHA for
 * index contents (for example Moon comparisons with `base=HEAD` and `head=<index snapshot>`).
 */
export const createIndexSnapshotCommit = async ({
  parentRef = 'HEAD',
  message = 'Temporary commit for staged-scope tooling\n',
}: {
  parentRef?: string;
  message?: string;
} = {}): Promise<string> => {
  const { stdout: treeStdout } = await execa('git', ['write-tree'], {
    cwd: REPO_ROOT,
    stdin: 'ignore',
  });
  const treeSha = treeStdout.trim();
  if (!treeSha) {
    throw new Error('git write-tree returned an empty tree SHA');
  }

  const { stdout: commitStdout } = await execa('git', ['commit-tree', treeSha, '-p', parentRef], {
    cwd: REPO_ROOT,
    input: message,
  });
  const commitSha = commitStdout.trim();
  if (!commitSha) {
    throw new Error('git commit-tree returned an empty commit SHA');
  }

  return commitSha;
};
