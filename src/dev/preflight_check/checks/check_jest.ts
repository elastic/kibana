/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dirname } from 'path';
import execa from 'execa';
import { findFileUpwards } from '../utils/find_file_upwards';
import { PreflightCheck, TestResponse } from './preflight_check';

export class JestCheck extends PreflightCheck {
  id = 'jest';

  public async runCheck() {
    const files = Array.from(this.files.values());
    const response: TestResponse = { test: this.id, errors: [] };

    if (files.length === 0) {
      return response;
    }

    for (const { path } of files) {
      const jestConfig = await findFileUpwards(dirname(path), 'jest.config.js');

      if (!jestConfig) {
        // Could not find jest.config.js for ${path}
        return response;
      }

      try {
        await execa('node_modules/.bin', ['jest', path, '-c', jestConfig], {
          env: { FORCE_COLOR: 'true' },
          stdio: ['ignore'],
        });
      } catch (error) {
        response.errors.push(error);
      }
    }
    return response;
  }
}
