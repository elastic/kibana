/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { SingleBar } from 'cli-progress';
import { runCLI } from 'jest';
import { dirname } from 'path';
import { File } from '../file';
import { findFileUpwards } from './find_file_upwards';

export async function runUnitTests(files: Array<{ path: string; file: File }>, bar?: SingleBar) {
  const logs = [];

  for (const { path } of files) {
    bar?.increment();
    bar?.update({ filename: path });

    const jestConfig = await findFileUpwards(dirname(path), 'jest.config.js');

    if (!jestConfig) {
      // Could not find jest.config.js for ${path}
      return;
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
      bar?.stop();
      logs.push(`Unit tests failed for ${path}`);
    }
  }
  return logs;
}
