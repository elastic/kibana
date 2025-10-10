/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import { Flags } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';
import { DiffedFile } from '../create_tests';

export function checkIfDiffedFilesExceedMaxFiles({
  files,
  flags,
  log,
}: {
  files: DiffedFile[];
  flags: Flags;
  log: ToolingLog;
}) {
  if (files.length <= Number(flags['max-files'])) {
    log.info(
      `🔎 ${chalk.bold.blue(
        `${files.length} committed files changed`
      )} on this branch compared to origin/main.\n`
    );

    return true;
  } else {
    log.error(
      `❌ ${files.length} committed files changed on this branch compared to origin/main and max files is set to ${flags['max-files']}.\n`
    );
    return false;
  }
}
