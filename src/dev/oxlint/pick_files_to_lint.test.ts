/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import { File } from '../file';
import { pickFilesToLint } from './pick_files_to_lint';

describe('oxlint pickFilesToLint', () => {
  const log = new ToolingLog();

  it.each(['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.cts', '.mts'])(
    'picks %s files',
    async (ext) => {
      const file = new File(`src/foo${ext}`);
      expect(await pickFilesToLint(log, [file])).toEqual([file]);
    }
  );

  it.each(['.json', '.scss', '.md', '.snap'])('skips %s files', async (ext) => {
    expect(await pickFilesToLint(log, [new File(`src/foo${ext}`)])).toEqual([]);
  });

  it('skips files ignored by .eslintignore', async () => {
    const ignored = new File(resolve(REPO_ROOT, 'packages/kbn-eslint-config/react.js'));
    const linted = new File(resolve(REPO_ROOT, 'packages/kbn-eslint-plugin-eslint/index.js'));
    expect(await pickFilesToLint(log, [ignored, linted])).toEqual([linted]);
  });
});
