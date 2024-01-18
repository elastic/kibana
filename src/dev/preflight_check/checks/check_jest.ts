/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { runCLI } from 'jest';
import { dirname } from 'path';
import { findFileUpwards } from '../utils/find_file_upwards';
import { PreflightCheck } from '../preflight_check';

export class JestCheck extends PreflightCheck {
  id = 'jest';

  public async runCheck() {
    const files = Array.from(this.files.values());

    const logs = [];

    for (const { path } of files) {
      const jestConfig = await findFileUpwards(dirname(path), 'jest.config.js');

      if (!jestConfig) {
        // Could not find jest.config.js for ${path}
        return { test: 'jest', errors: [] };
      }

      const jestConfigFile = await import(jestConfig);

      const { results } = await runCLI(
        {
          ...jestConfigFile.default,
          rootDir: REPO_ROOT,
          cache: false,
          silent: true,
          reporters: ['jest-silent-reporter'],
          verbose: false,
          testPathPattern: [path],
          useStderr: false,
          bail: 99999999,
          noStackTrace: true,
          _: [], // types are requiring this for some reason
          $0: '', // types are requiring this for some reason,
        },
        [REPO_ROOT]
      );

      if (results.numFailedTests > 0) {
        logs.push(`Unit tests failed for ${path}`);
      }
    }
    return { test: 'jest', errors: logs };
  }
}
