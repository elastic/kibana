/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ESLint } from 'eslint';
import { REPO_ROOT } from '@kbn/repo-info';
import type { SingleBar } from 'cli-progress';
import { File } from '../file';
import type { TestResponse } from './create_tests';

export async function checkEsLint(
  files: Array<{ path: string; file: File }>,
  bar?: SingleBar,
  { fix }: { fix?: boolean } = {}
): Promise<TestResponse> {
  const response: TestResponse = { test: 'eslint', errors: [] };

  if (files.length === 0) {
    return response;
  }

  bar?.increment();
  bar?.update({ filename: files[0].path });

  const eslint = new ESLint({
    cache: true,
    cwd: REPO_ROOT,
    fix,
  });

  const paths = files.map(({ file }) => file.getRelativePath());
  const reports = await eslint.lintFiles(paths);

  if (fix) {
    await ESLint.outputFixes(reports);
  }

  let foundError = false;
  let foundWarning = false;

  reports.some((report) => {
    if (report.errorCount !== 0) {
      foundError = true;
      return true;
    } else if (report.warningCount !== 0) {
      foundWarning = true;
    }
  });

  if (foundError || foundWarning) {
    const formatter = await eslint.loadFormatter();
    const msg = await formatter.format(reports);

    response.errors.push(msg);
  }

  bar?.update(files.length, { filename: files[files.length - 1].path });

  return response;
}
