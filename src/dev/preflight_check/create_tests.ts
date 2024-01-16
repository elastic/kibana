/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { MultiBar } from 'cli-progress';
import { existsSync } from 'fs';
import { File } from '../file';
import { checkFileCasing } from './check_file_casing';
import { checkEsLint } from './check_eslint';
import { checkTypescript } from './check_typescript';
import { checkJest } from './check_jest';

const checkTypes = ['i18n', 'typescript', 'eslint', 'jest', 'fileCasing'] as const;

function getDefaults(taskName: string) {
  const TASK_COL_LENGTH = 10;
  return {
    task: chalk.blue(taskName.padEnd(TASK_COL_LENGTH)),
    filename: '',
  };
}

export interface TestResponse {
  test: typeof checkTypes[number];
  errors: string[];
}

export interface DiffedFile {
  path: string;
  hunk: string;
  mode: string;
  added: string[];
  removed: string[];
}

export async function createTests({
  diffedFiles,
  multibar,
}: {
  diffedFiles: DiffedFile[];
  multibar: MultiBar;
}) {
  const checks = checkTypes.reduce((acc, check) => {
    acc[check] = {
      files: [],
    };

    return acc;
  }, {} as Record<typeof checkTypes[number], { files: Array<{ path: string; file: File }> }>);

  // add bars
  const barTypescript = multibar.create(0, 0, getDefaults('typescript'));
  const barJest = multibar.create(0, 0, getDefaults('unit tests'));
  const barEslint = multibar.create(0, 0, getDefaults('eslint'));
  const barFilecase = multibar.create(0, 0, getDefaults('file case'));
  const barI18n = multibar.create(0, 0, getDefaults('i18n'));

  for (const { path, mode, removed = [] } of diffedFiles) {
    const match = path.match(/^(.+?)((\.test|\.stories)?(\.tsx?|\.jsx?))$/);

    const pathWithoutExt = match ? match[1] : undefined;
    const ext = match ? match[2] : undefined;

    // If the user added a file with a test, add it to the list of files to test.
    if (ext === '.test.ts' || ext === '.test.tsx') {
      checks.jest.files.push({ path, file: new File(path) });
      barJest.setTotal(barJest.getTotal() + 1);
    }

    // if a user removed a line that includes i18n.translate, we need to run i18n check.
    if (
      removed.find((line) => line.includes('i18n.translate') || line.includes('<FormattedMessage'))
    ) {
      checks.i18n.files.push({ path, file: new File(path) });
      barI18n.setTotal(barI18n.getTotal() + 1);
    }

    // If the user has added a ts file, we need to run tsc and eslint on it.
    if (ext === '.ts' || ext === '.tsx') {
      checks.typescript.files.push({ path, file: new File(path) });
      barTypescript.setTotal(barTypescript.getTotal() + 1);

      checks.eslint.files.push({ path, file: new File(path) });
      barEslint.setTotal(barEslint.getTotal() + 1);

      // Lets see if there is a corresponding Storybook or unit test file
      // for this file and also add it to the list to be checked.
      const storiesPath = `${pathWithoutExt}.stories.${ext}`;
      if (existsSync(storiesPath)) {
        checks.eslint.files.push({ path: storiesPath, file: new File(storiesPath) });
        barEslint.setTotal(barEslint.getTotal() + 1);

        checks.typescript.files.push({ path: storiesPath, file: new File(storiesPath) });
        barTypescript.setTotal(barTypescript.getTotal() + 1);
      }

      const testPath = `${pathWithoutExt}.test.${ext}`;
      if (existsSync(testPath)) {
        checks.eslint.files.push({ path: testPath, file: new File(testPath) });
        barEslint.setTotal(barEslint.getTotal());

        checks.typescript.files.push({ path: testPath, file: new File(testPath) });
        barTypescript.setTotal(barTypescript.getTotal() + 1);

        checks.jest.files.push({ path: testPath, file: new File(testPath) });
        barJest.setTotal(barJest.getTotal() + 1);
      }
    }

    if (mode === 'new') {
      checks.fileCasing.files.push({ path, file: new File(path) });
      barFilecase.setTotal(barFilecase.getTotal() + 1);
    }
  }

  if (!checks.typescript.files.length) multibar.remove(barTypescript);
  if (!checks.eslint.files.length) multibar.remove(barEslint);
  if (!checks.jest.files.length) multibar.remove(barJest);
  if (!checks.fileCasing.files.length) multibar.remove(barFilecase);
  if (!checks.i18n.files.length) multibar.remove(barI18n);

  return {
    tsc: { test: checkTypescript, files: checks.typescript.files, bar: barTypescript },
    eslint: { test: checkEsLint, files: checks.eslint.files, bar: barEslint },
    jest: { test: checkJest, files: checks.jest.files, bar: barJest },
    fileCasing: { test: checkFileCasing, files: checks.fileCasing.files, bar: barFilecase },
    i18n: { files: checks.i18n.files, bar: barI18n },
  };
}
