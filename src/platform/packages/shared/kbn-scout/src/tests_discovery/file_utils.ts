/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import { SCOUT_PLAYWRIGHT_CONFIGS_PATH } from '@kbn/scout-info';
import type { ToolingLog } from '@kbn/tooling-log';
import type { FlattenedConfigGroup, ModuleDiscoveryInfo } from './types';

// Ensures the directory for the config file exists
const ensureConfigDirectory = (): void => {
  const dirPath = path.dirname(SCOUT_PLAYWRIGHT_CONFIGS_PATH);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Saves module discovery info to file
export const saveModuleDiscoveryInfo = (modules: ModuleDiscoveryInfo[], log: ToolingLog): void => {
  ensureConfigDirectory();
  fs.writeFileSync(SCOUT_PLAYWRIGHT_CONFIGS_PATH, JSON.stringify(modules, null, 2));
};

export const saveFlattenedConfigGroups = (
  flattenedConfigs: FlattenedConfigGroup[],
  log: ToolingLog
): void => {
  ensureConfigDirectory();
  fs.writeFileSync(SCOUT_PLAYWRIGHT_CONFIGS_PATH, JSON.stringify(flattenedConfigs, null, 2));

  // Compute counts in a single pass
  let statefulCount = 0;
  let serverlessCount = 0;
  let totalConfigs = 0;

  for (const group of flattenedConfigs) {
    if (group.testTarget.arch === 'stateful') {
      statefulCount++;
    } else {
      serverlessCount++;
    }
    totalConfigs += group.configs.length;
  }

  log.info(
    `Scout configs flattened and saved: ${statefulCount} stateful group(s), ${serverlessCount} serverless group(s), ${totalConfigs} total config(s) to '${SCOUT_PLAYWRIGHT_CONFIGS_PATH}'`
  );
};
