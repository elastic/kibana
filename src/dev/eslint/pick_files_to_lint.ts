/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CLIEngine } from 'eslint';

import { ToolingLog } from '@kbn/tooling-log';
import { File } from '../file';

/**
 * Filters a list of files to only include lintable files.
 *
 * @param  {ToolingLog} log
 * @param  {Array<File>} files
 * @return {Array<File>}
 */
export function pickFilesToLint(log: ToolingLog, files: File[]) {
  const cli = new CLIEngine({});

  return files.filter((file) => {
    if (!file.isJs() && !file.isTypescript()) {
      return;
    }

    const path = file.getRelativePath();

    if (cli.isPathIgnored(path)) {
      log.warning(`[eslint] %j ignored by .eslintignore`, file);
      return false;
    }

    log.debug('[eslint] linting %j', file);
    return true;
  });
}
