/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExecaError } from 'execa';
import execa from 'execa';

import { REPO_ROOT } from '@kbn/repo-info';

/** Returns true when the Git index contains staged changes relative to HEAD. */
export const hasStagedChanges = async (): Promise<boolean> => {
  try {
    await execa('git', ['diff', '--cached', '--quiet'], {
      cwd: REPO_ROOT,
      stdin: 'ignore',
    });
    return false;
  } catch (error) {
    if ((error as ExecaError).exitCode === 1) {
      return true;
    }

    throw error;
  }
};
