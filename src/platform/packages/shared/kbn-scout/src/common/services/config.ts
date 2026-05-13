/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import fs from 'fs';
import type { ScoutLogger, ScoutTestConfig } from '../../types';
import { parseScoutTestConfig } from '../../types/test_config.schema';

export function createScoutConfig(
  configDir: string,
  configName: string,
  log: ScoutLogger
): ScoutTestConfig {
  if (!configDir || !fs.existsSync(configDir)) {
    throw new Error(
      `Directory with servers configuration is missing or does not exist: ${configDir}`
    );
  }

  const configPath = path.join(configDir, `${configName}.json`);
  log.serviceMessage('config', `Reading test servers configuration from file: ${configPath}`);

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (e) {
    throw new Error(`Failed to read or parse Scout test config "${configPath}": ${e.message}`);
  }

  const config = parseScoutTestConfig(raw, configPath);

  if (config.http2) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    process.env.IS_FTR_RUNNER = 'true';
  }

  log.serviceLoaded('config');

  return config;
}
