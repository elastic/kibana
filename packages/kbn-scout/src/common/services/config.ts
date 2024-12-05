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
import { ToolingLog } from '@kbn/tooling-log';
import { ScoutServerConfig } from '../../types';
import { serviceLoadedMsg } from '../../playwright/utils';

export function createScoutConfig(configDir: string, configName: string, log: ToolingLog) {
  if (!configDir || !fs.existsSync(configDir)) {
    throw new Error(`Directory with servers configuration is missing`);
  }

  const configPath = path.join(configDir, `${configName}.json`);
  log.info(`Reading test servers confiuration from file: ${configPath}`);

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as ScoutServerConfig;

  log.debug(serviceLoadedMsg('config'));

  return config;
}
