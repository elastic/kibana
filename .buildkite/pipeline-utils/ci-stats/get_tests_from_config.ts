/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { readConfig } from 'jest-config';
import { SearchSource } from 'jest';
import Runtime from 'jest-runtime';
import { resolve } from 'path';
import { getKibanaDir, runBatchedPromises } from '#pipeline-utils';

export async function getTestsFromJestConfig(configPath: string): Promise<string[]> {
  try {
    const emptyArgv = {
      $0: '',
      _: [],
    };
    const config = await readConfig(emptyArgv, configPath);
    const searchSource = new SearchSource(
      await Runtime.createContext(config.projectConfig, {
        maxWorkers: 1,
        watchman: false,
        watch: false,
        console: {
          ...console,
          warn() {
            // ignore haste-map warnings
          },
        },
      })
    );

    const results = await searchSource.getTestPaths(config.globalConfig, config.projectConfig);
    return results.tests.map((t) => t.path);
  } catch (error) {
    console.error(
      `Error while resolving test files from config: ${configPath} - validate your config.`
    );
    throw error;
  }
}

export async function filterEmptyJestConfigs(
  jestUnitConfigsWithEmpties: string[],
  maxParallelism = 1
): Promise<string[]> {
  const promiseThunks = jestUnitConfigsWithEmpties.map((configPath) => async () => {
    const kibanaRelativePath = resolve(getKibanaDir(), configPath);
    const testFiles = await getTestsFromJestConfig(kibanaRelativePath);
    return testFiles?.length > 0 ? [configPath] : [];
  });
  const nonEmptyConfigPaths = await runBatchedPromises(promiseThunks, maxParallelism);
  // flat-mapping works better type-wise than filtering an Array<string | null>
  return nonEmptyConfigPaths.flat();
}
