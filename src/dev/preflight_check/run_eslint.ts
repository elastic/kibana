/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ESLint } from 'eslint';
import { REPO_ROOT } from '@kbn/repo-info';
import { SingleBar } from 'cli-progress';
import { File } from '../file';

export async function esLintFiles(
  files: Array<{ path: string; file: File }>,
  { fix }: { fix?: boolean } = {},
  bar: SingleBar
) {
  const logs = [];

  for (const { path, file } of files) {
    bar.increment();
    bar.update({ filename: path });

    const eslint = new ESLint({
      cache: true,
      cwd: REPO_ROOT,
      fix,
    });

    const relativePath = file.getRelativePath();
    const reports = await eslint.lintFiles(relativePath);

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

      logs.push(msg);
    }
  }
  return logs;
}
