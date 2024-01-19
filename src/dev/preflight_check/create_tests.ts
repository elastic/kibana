/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Flags } from '@kbn/dev-cli-runner';
import Table from 'cli-table3';
import { ToolingLog } from '@kbn/tooling-log';
import { File } from '../file';
import { FileCasingCheck } from './checks/check_file_casing';
import { EslintCheck } from './checks/check_eslint';
import { TypescriptCheck } from './checks/check_typescript';
import { JestCheck } from './checks/check_jest';
import { getRelatedFiles } from './utils/get_related_files';

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
  const typescriptCheck = new TypescriptCheck();
  const eslintCheck = new EslintCheck({ fix: flags.fix });
  const jestCheck = new JestCheck();
  const fileCasingCheck = new FileCasingCheck();

  const checks = [typescriptCheck, eslintCheck, jestCheck, fileCasingCheck];

  const files = flags['check-related-files']
    ? await getRelatedFiles({ files: diffedFiles, log })
    : diffedFiles;

  for (const { path, mode, removed = [] } of files) {
    const match = path.match(/^(.+?)((\.test|\.stories)?(\.tsx?|\.jsx?))$/);

    const ext = match ? match[2] : undefined;

    if (ext === '.test.ts' || ext === '.test.tsx') {
      jestCheck.setFiles([{ path, file: new File(path) }]);
      typescriptCheck.setFiles([{ path, file: new File(path) }]);
    }

    // if a user removed a line that includes i18n.translate, we need to run i18n check.
    if (
      removed.find((line) => line.includes('i18n.translate') || line.includes('<FormattedMessage'))
    ) {
      // checks.i18n.files.push({ path, file: new File(path) });
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
    const fileChangeSetTable = new Table({
      head: ['Test', 'Files'],
      // chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
      colWidths: [15, 75],
      wordWrap: true,
      wrapOnWordBoundary: false,
    });

    fileChangeSetTable.push(
      ...checks.map((check) => [
        check.id,
        check
          .getFiles()
          .map((f) => f.path)
          .join('\n'),
      ])
    );

    log.info(`\n${fileChangeSetTable.toString()}\n`);
  }

  return [typescriptCheck, eslintCheck, jestCheck, fileCasingCheck];
}
