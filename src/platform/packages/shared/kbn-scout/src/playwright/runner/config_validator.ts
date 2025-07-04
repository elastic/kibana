/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import { PlaywrightTestConfig } from 'playwright/test';
import { createFlagError } from '@kbn/dev-cli-errors';
import { ScoutTestOptions, VALID_CONFIG_MARKER } from '../types';
import { loadConfigModule } from './config_loader';

export async function validatePlaywrightConfig(configPath: string) {
  // Check if the path exists and has a .ts extension
  if (!configPath || !Fs.existsSync(configPath) || !configPath.endsWith('.ts')) {
    throw createFlagError(
      `Path to a valid TypeScript config file is required: --config <relative path to .ts file>`
    );
  }

  const configModule = await loadConfigModule(configPath);
  // Check for a default export
  const config = configModule.default as PlaywrightTestConfig<ScoutTestOptions>;

  if (config === undefined) {
    throw createFlagError(`The config file at "${configPath}" must export default function`);
  }

  if (!config?.use?.[VALID_CONFIG_MARKER]) {
    // Check if the config's 'use' property has the valid marker
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
