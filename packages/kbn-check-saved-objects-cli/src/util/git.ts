/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';

export const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;

export const assertCommitSha = (sha: string): void => {
  if (!COMMIT_SHA_PATTERN.test(sha)) {
    throw new Error(`Invalid commit SHA: '${sha}'`);
  }
};

/**
 * Expands a short git ref (branch name, tag, relative ref like HEAD~1) to a full 40-character
 * commit hash. If the input is already a full hash, it is returned unchanged.
 */
export const expandGitRev = (gitRev: string): string => {
  if (COMMIT_SHA_PATTERN.test(gitRev)) {
    return gitRev;
  }
  try {
    return execFileSync('git', ['rev-parse', gitRev], { stdio: ['pipe', 'pipe', null] })
      .toString()
      .trim();
  } catch (err) {
    throw new Error(`Couldn't expand git rev: ${gitRev} - ${err.message}`);
  }
};
