/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import type { ToolingLog } from '@kbn/tooling-log';
import type { CliSupportedServerModes } from '../../../types';
import { getConfigFilePath } from './get_config_file';
import { readConfigFile } from '../loader';
import type { Config } from '../config';
import { saveScoutTestConfigOnDisk } from './save_scout_test_config';
import { getConfigRootDir } from './detect_custom_config';

/**
 * Loads server configuration based on the mode, creates "kbn-test" compatible Config
 * instance, that can be used to start local servers and saves its "Scout"-format copy
 * to the disk.
 * @param mode server local run mode
 * @param log Logger instance to report errors or debug information.
 * @param playwrightConfigPath Path to the playwright config file for auto-detecting custom configs
 * @returns "kbn-test" compatible Config instance
 */
export async function loadServersConfig(
  mode: CliSupportedServerModes,
  log: ToolingLog,
  playwrightConfigPath: string
): Promise<Config> {
  // Determine the config root directory based on playwright path and mode
  const configRootDir = getConfigRootDir(playwrightConfigPath, mode);
  const configPath = getConfigFilePath(configRootDir, mode);

  // Validate that the config file exists
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const clusterConfig = await readConfigFile(configPath);
  const scoutServerConfig = clusterConfig.getScoutTestConfig();
  saveScoutTestConfigOnDisk(scoutServerConfig, log);
  return clusterConfig;
}
