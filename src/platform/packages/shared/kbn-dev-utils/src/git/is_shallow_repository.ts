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

/** Returns true when the current repository is a shallow Git checkout. */
export const isShallowRepository = async (): Promise<boolean> => {
  try {
    const { stdout } = await execa('git', ['rev-parse', '--is-shallow-repository'], {
      cwd: REPO_ROOT,
      stdin: 'ignore',
    });

    return stdout.trim() === 'true';
  } catch {
    return false;
  }
};
