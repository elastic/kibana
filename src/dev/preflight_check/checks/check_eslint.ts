/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESLint } from 'eslint';
import { REPO_ROOT } from '@kbn/repo-info';
import { PreflightCheck, TestResponse } from './preflight_check';

export class EslintCheck extends PreflightCheck {
  id = 'eslint';

  public async runCheck() {
    const files = Array.from(this.files.values());
    const response: TestResponse = { test: this.id, errors: [] };

    if (files.length === 0) {
      return response;
    }

    const eslint = new ESLint({
      cache: true,
      cwd: REPO_ROOT,
      fix: this.flags.fix === true,
    });

    const paths = files.map(({ file }) => file.getRelativePath());
    const reports = await eslint.lintFiles(paths);

    if (this.flags.fix) {
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

    return response;
  }
}
