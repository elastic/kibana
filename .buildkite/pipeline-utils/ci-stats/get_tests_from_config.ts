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
    console.error(error);
    // If Jest config fails to load, return empty array
    return [];
  }
}
