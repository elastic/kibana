/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { dirname, resolve } from 'path';
import * as globby from 'globby';
import { getKibanaDir } from '#pipeline-utils';

const TEST_FILE_PATTERNS = ['**/*.test.{ts,tsx,js,jsx,mjs}', '**/*.spec.{ts,tsx,js,jsx,mjs}'];

// Loaded lazily because getKibanaDir() isn't available at module-init time.
let ignorePatterns: string[];
function getIgnorePatterns(): string[] {
  if (!ignorePatterns) {
    // Integration test patterns loaded from the Jest integration preset so this
    // stays in sync automatically if that preset ever changes.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const integrationPreset = require(resolve(
      getKibanaDir(),
      'src/platform/packages/shared/kbn-test/jest_integration_node/jest-preset.js'
    ));
    ignorePatterns = ['**/node_modules/**', ...integrationPreset.testMatch];
  }
  return ignorePatterns;
}

/**
 * Fast check for whether a jest config's directory contains any test files.
 * Uses a simple glob instead of Jest's full resolver (readConfig + Runtime.createContext
 * + SearchSource.getTestPaths) which is ~20x slower across 1000+ configs.
 */
function hasTestFiles(configAbsPath: string): boolean {
  const dir = dirname(configAbsPath);
  const matches = globby.sync(TEST_FILE_PATTERNS, {
    cwd: dir,
    ignore: getIgnorePatterns(),
    onlyFiles: true,
  });
  return matches.length > 0;
}

export function filterEmptyJestConfigs(jestUnitConfigsWithEmpties: string[]): string[] {
  const kibanaDir = getKibanaDir();
  return jestUnitConfigsWithEmpties.filter((configPath) =>
    hasTestFiles(resolve(kibanaDir, configPath))
  );
}
