/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { Config } from '@jest/types';

export interface CreateTempConfigOptions {
  config: Config.InitialOptions;
  dataDir: string;
  configId: string;
  failedTestPath?: string;
}

/**
 * Creates a temporary Jest config file for testing
 */
export async function createTempJestConfig({
  config,
  dataDir,
  configId,
  failedTestPath,
}: CreateTempConfigOptions): Promise<string> {
  const tempConfigPath = Path.join(dataDir, `jest-config-${configId}.json`);

  // Create a combined config for the test run
  const combinedConfig = {
    rootDir: REPO_ROOT,
    maxWorkers: 1, // Run with single worker for consistency
    collectCoverage: false,
    passWithNoTests: true,
    testSequencer: require.resolve('./test_sequencer'),
    // Use the config's settings
    testMatch: config.testMatch || [],
    roots: config.roots || [],
    // Spread the rest of the provided config
    ...config,
  };

  await Fs.promises.writeFile(tempConfigPath, JSON.stringify(combinedConfig, null, 2), 'utf8');

  return tempConfigPath;
}
