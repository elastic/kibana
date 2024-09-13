/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESLint } from 'eslint';

import { ToolingLog } from '@kbn/tooling-log';
import { File } from '../file';

/**
 * Filters a list of files to only include lintable files.
 *
 * @param  {ToolingLog} log
 * @param  {Array<File>} files
 * @return {Array<File>}
 */
export async function pickFilesToLint(log: ToolingLog, files: File[]) {
  const eslint = new ESLint();
  const filesToLint = [];

  for (const file of files) {
    if (!file.isJs() && !file.isTypescript()) continue;

    const path = file.getRelativePath();

    if (await eslint.isPathIgnored(path)) {
      log.warning(`[eslint] %j ignored by .eslintignore`, file);
      continue;
    }

    log.debug('[eslint] linting %j', file);
    filesToLint.push(file);
  }

  return filesToLint;
}
