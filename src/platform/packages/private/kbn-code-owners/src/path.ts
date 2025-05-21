/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs';
import path from 'node:path';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';

/** CODEOWNERS file path **/
export const CODE_OWNERS_FILE = path.join(REPO_ROOT, '.github', 'CODEOWNERS');

/**
 * Throw an error if the given path does not exist
 *
 * @param targetPath Path to check
 * @param description Path description used in the error message if an exception is thrown
 * @param cli Whether this function is called from a CLI context
 */
export function throwIfPathIsMissing(
  targetPath: fs.PathLike,
  description = 'File',
  cli: boolean = false
) {
  if (fs.existsSync(targetPath)) return;
  const msg = `${description} ${targetPath} does not exist`;
  throw cli ? createFailError(msg) : new Error(msg);
}

/**
 * Throw an error if the given path does not reside in this repo
 *
 * @param targetPath Path to check
 * @param cli Whether this function is called from a CLI context
 */
export function throwIfPathNotInRepo(targetPath: fs.PathLike, cli: boolean = false) {
  const relativePath = path.relative(REPO_ROOT, targetPath.toString());

  if (relativePath.includes('../')) {
    const msg = `Path ${targetPath} is not part of this repository.`;
    throw cli ? createFailError(msg) : new Error(msg);
  }
}
