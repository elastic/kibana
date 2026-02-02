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

import { createFailError } from '@kbn/dev-cli-errors';

import type { InstallScriptsConfig } from './types';

export function loadConfig(): InstallScriptsConfig {
  const configPath = Path.resolve(__dirname, '../config.json');

  try {
    const content = Fs.readFileSync(configPath, 'utf8');
    return JSON.parse(content) as InstallScriptsConfig;
  } catch (error) {
    throw createFailError(`Failed to load configuration file: ${configPath}`);
  }
}
