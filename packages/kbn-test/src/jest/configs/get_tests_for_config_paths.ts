/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readConfig } from 'jest-config';
import { createContext } from 'jest-runtime';
import { SearchSource } from 'jest';
import { asyncMapWithLimit } from '@kbn/std';

const EMPTY_ARGV = {
  $0: '',
  _: [],
};

const NO_WARNINGS_CONSOLE = {
  ...console,
  warn() {
    // ignore haste-map warnings
  },
};

export interface TestsForConfigPath {
  path: string;
  testPaths: Set<string>;
}

export async function getTestsForConfigPaths(
  configPaths: Iterable<string>
): Promise<TestsForConfigPath[]> {
  return await asyncMapWithLimit(configPaths, 60, async (path) => {
    const config = await readConfig(EMPTY_ARGV, path);
    const searchSource = new SearchSource(
      await createContext(config.projectConfig, {
        maxWorkers: 1,
        watchman: false,
        watch: false,
        console: NO_WARNINGS_CONSOLE,
      })
    );

    const results = await searchSource.getTestPaths(config.globalConfig, undefined, undefined);

    return {
      path,
      testPaths: new Set(results.tests.map((t) => t.path)),
    };
  });
}
