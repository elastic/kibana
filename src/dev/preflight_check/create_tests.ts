/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { existsSync } from 'fs';
import { Flags } from '@kbn/dev-cli-runner';
import Table from 'cli-table3';
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import { dirname } from 'path';
import { File } from '../file';
import { FileCasingCheck } from './checks/check_file_casing';
import { EslintCheck } from './checks/check_eslint';
import { TypescriptCheck } from './checks/check_typescript';
import { JestCheck } from './checks/check_jest';
import { findImportingFiles } from './utils/get_related_files';

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

  for (const { path, mode, removed = [] } of diffedFiles) {
    const match = path.match(/^(.+?)((\.test|\.stories)?(\.tsx?|\.jsx?))$/);

    const pathWithoutExt = match ? match[1] : undefined;
    const ext = match ? match[2] : undefined;

    // If the user added a file with a test, add it to the list of files to test.
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

    // If the user has added a ts file, we need to run tsc and eslint on it.
    if (ext === '.ts' || ext === '.tsx') {
      typescriptCheck.setFiles([{ path, file: new File(path) }]);
      eslintCheck.setFiles([{ path, file: new File(path) }]);

      // Lets see if there is a corresponding Storybook or unit test file
      // for this file and also add it to the list to be checked.
      const storiesPath = `${pathWithoutExt}.stories.${ext}`;
      if (existsSync(storiesPath)) {
        eslintCheck.setFiles([{ path: storiesPath, file: new File(storiesPath) }]);
        typescriptCheck.setFiles([{ path: storiesPath, file: new File(storiesPath) }]);
      }

      const testPath = `${pathWithoutExt}.test.${ext}`;
      if (existsSync(testPath)) {
        eslintCheck.setFiles([{ path: testPath, file: new File(testPath) }]);
        typescriptCheck.setFiles([{ path: testPath, file: new File(testPath) }]);
        jestCheck.setFiles([{ path: testPath, file: new File(testPath) }]);
      }

      // const relatedFiles = findImportingFiles({ directory: dirname(path), targetFile: path });

      // typescriptCheck.setFiles(relatedFiles.map((p) => ({ path: p, file: new File(p) })));
    }

    if (mode === 'new') {
      fileCasingCheck.setFiles([{ path, file: new File(path) }]);
    }
  }

  if (flags['show-file-set']) {
    const relatedFiles = findImportingFiles({
      directory: `${REPO_ROOT}/${dirname(diffedFiles[1].path)}`,
      targetFile: diffedFiles[1].path,
    });

    typescriptCheck.setFiles(relatedFiles.map((p) => ({ path: p, file: new File(p) })));

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
