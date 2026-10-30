/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { ESLint } from 'eslint';
import { REPO_ROOT } from '@kbn/repo-info';
import { rules } from '../..';

jest.mock('./core_private_importers', () => ({ CORE_PRIVATE_IMPORTERS: new Set() }));

const { CORE_PRIVATE_IMPORTERS } = jest.requireActual<{
  CORE_PRIVATE_IMPORTERS: ReadonlySet<string>;
}>('./core_private_importers');

const eslint = new ESLint({
  cwd: REPO_ROOT,
  useEslintrc: false,
  ignore: false,
  plugins: { '@kbn/imports': { rules } },
  overrideConfig: {
    parser: require.resolve('@typescript-eslint/parser'),
    parserOptions: { sourceType: 'module', ecmaVersion: 'latest', ecmaFeatures: { jsx: true } },
    plugins: ['@kbn/imports'],
    rules: { '@kbn/imports/no_group_crossing_imports': 'error' },
  },
});

const importsCorePrivatePackage = async (repoRel: string): Promise<boolean> => {
  const filePath = resolve(REPO_ROOT, repoRel);
  if (!existsSync(filePath)) {
    return false;
  }

  const [{ messages }] = await eslint.lintText(readFileSync(filePath, 'utf8'), { filePath });
  const fatal = messages.find((message) => message.fatal);
  if (fatal) {
    throw new Error(`Unable to parse ${repoRel}: ${fatal.message}`);
  }

  return messages.some(({ messageId }) => messageId === 'CORE_PRIVATE_IMPORT');
};

it('lists only files that still import a Core-private package', async () => {
  const listed = [...CORE_PRIVATE_IMPORTERS];
  const stillImporting = await Promise.all(listed.map(importsCorePrivatePackage));
  const stale = listed.filter((_, index) => !stillImporting[index]);

  if (stale.length > 0) {
    throw new Error(
      `These files no longer import a Core-private package. Remove them from CORE_PRIVATE_IMPORTERS in packages/kbn-eslint-plugin-imports/src/helpers/core_private_importers.ts:\n${stale.join(
        '\n'
      )}`
    );
  }
});
