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
import { File } from '../file';
import { EslintCheck } from './checks/check_eslint';
import { FileCasingCheck } from './checks/check_file_casing';
import { I18nCheck } from './checks/check_i18n';
import { JestCheck } from './checks/check_jest';
import { TypescriptCheck } from './checks/check_typescript';
import { getDependentFiles } from './utils/get_dependent_files';
import { renderCheckTable } from './utils/render_check_table';

export interface DiffedFile {
  path: string;
  hunk: string;
  mode: string;
  added: string[];
  removed: string[];
}

export async function createTests({
  diffedFiles,
  flags,
  log,
}: {
  diffedFiles: DiffedFile[];
  flags: Flags;
  log: ToolingLog;
}) {
  const typescriptCheck = new TypescriptCheck({ flags, log });
  const eslintCheck = new EslintCheck({ flags, log });
  const jestCheck = new JestCheck({ flags, log });
  const fileCasingCheck = new FileCasingCheck({ flags, log });
  const i18nCheck = new I18nCheck({ flags, log });

  const checks = [typescriptCheck, eslintCheck, jestCheck, fileCasingCheck, i18nCheck];

  if (flags['check-dependent-files']) {
    log.info(`🕵️‍♀️  ${chalk.bold('Collecting dependent files...')} (this can take up to 60 seconds)`);
  }

  const files = flags['check-dependent-files']
    ? await getDependentFiles({ files: diffedFiles, log })
    : diffedFiles;

  for (const { path, mode, removed = [] } of files) {
    const match = path.match(/^(.+?)((\.test|\.stories)?(\.tsx?|\.jsx?))$/);

    const ext = match ? match[2] : undefined;

    if (ext === '.test.ts' || ext === '.test.tsx' || ext === 'test.js') {
      jestCheck.setFiles([{ path, file: new File(path) }]);
      typescriptCheck.setFiles([{ path, file: new File(path) }]);
      eslintCheck.setFiles([{ path, file: new File(path) }]);
    }

    if (
      removed.find((line) => line.includes('i18n.translate') || line.includes('<FormattedMessage'))
    ) {
      i18nCheck.setFiles([{ path, file: new File(path) }]);
    }

    if (ext === '.ts' || ext === '.tsx') {
      typescriptCheck.setFiles([{ path, file: new File(path) }]);
      eslintCheck.setFiles([{ path, file: new File(path) }]);
    }

    if (mode === 'new') {
      fileCasingCheck.setFiles([{ path, file: new File(path) }]);
    }
  }

  if (flags['show-file-set']) {
    // Allows user to see a complete list of all files that will be checked,
    // categorized per check.
    renderCheckTable({ checks, log });
  }

  return checks;
}
