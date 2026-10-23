/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFile } from 'fs/promises';
import { extname, relative, resolve } from 'path';
import ignore from 'ignore';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import type { File } from '../file';
import { LINTABLE_EXTENSIONS, LINT_LOG_PREFIX } from './constants';

/**
 * Filters a list of files to only include files oxlint should lint. Oxlint applies `.eslintignore`
 * when it walks the repo but not to paths passed on the command line, so those are filtered here.
 * Ignore patterns from `.oxlint/index.mts` are applied by oxlint itself.
 */
export async function pickFilesToLint(log: ToolingLog, files: File[]) {
  const eslintIgnore = ignore().add(await readFile(resolve(REPO_ROOT, '.eslintignore'), 'utf8'));
  const filesToLint = [];

  for (const file of files) {
    if (!LINTABLE_EXTENSIONS[extname(file.path)]) continue;

    if (eslintIgnore.ignores(relative(REPO_ROOT, file.getAbsolutePath()))) {
      log.warning(`${LINT_LOG_PREFIX} %j ignored by .eslintignore`, file);
      continue;
    }

    log.debug(`${LINT_LOG_PREFIX} linting %j`, file);
    filesToLint.push(file);
  }

  return filesToLint;
}
