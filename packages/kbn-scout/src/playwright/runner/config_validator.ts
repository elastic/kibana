/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Fs from 'fs';
import { REPO_ROOT } from '@kbn/repo-info';
import { PlaywrightTestConfig } from 'playwright/test';
import path from 'path';
import { createFlagError } from '@kbn/dev-cli-errors';
import { ScoutTestOptions, VALID_CONFIG_MARKER } from '../types';

export async function validatePlaywrightConfig(configPath: string) {
  const fullPath = path.resolve(REPO_ROOT, configPath);

  // Check if the path exists and has a .ts extension
  if (!configPath || !Fs.existsSync(fullPath) || !configPath.endsWith('.ts')) {
    throw createFlagError(
      `Path to a valid TypeScript config file is required: --config <relative path to .ts file>`
    );
  }

  // Dynamically import the file to check for a default export
  const configModule = await import(fullPath);
  const config = configModule.default as PlaywrightTestConfig<ScoutTestOptions>;

  // Check if the config's 'use' property has the valid marker
  if (!config?.use?.[VALID_CONFIG_MARKER]) {
    throw createFlagError(
      `The config file at "${configPath}" must be created with "createPlaywrightConfig" from '@kbn/scout' package:\n
export default createPlaywrightConfig({
    testDir: './tests',
});`
    );
  }

  if (!config.testDir) {
    throw createFlagError(
      `The config file at "${configPath}" must export a valid Playwright configuration with "testDir" property.`
    );
  }
}
