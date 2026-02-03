/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs';
import type { ScoutTestTarget } from '@kbn/scout-info';
import type { Config } from '../config';
import { readConfigFile } from '../loader';
import { getConfigFilePath } from './get_config_file';
import { saveScoutTestConfigOnDisk } from './save_scout_test_config';

/**
 * Loads server configuration based on the mode, creates "kbn-test" compatible Config
 * instance, that can be used to start local servers and saves its "Scout"-format copy
 * to the disk.
 * @param testTarget The test target definition (based on location, architecture and domain)
 * @param log Logger instance to report errors or debug information.
 * @param configRootDir The root directory where the config file is located
 *
 * @example
 * Config root dirs
 * ```
 * servers/configs/config_sets/default/serverless
 * servers/configs/config_sets/uiam_local/serverless
 * ```
 * @returns "kbn-test" compatible Config instance
 */
export async function loadServersConfig(
  testTarget: ScoutTestTarget,
  log: ToolingLog,
  configRootDir: string
): Promise<Config> {
  const configPath = getConfigFilePath(configRootDir, testTarget);

  // Validate that the config file exists
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const clusterConfig = await readConfigFile(configPath);
  // construct config for Playwright Test
  const scoutServerConfig = clusterConfig.getScoutTestConfig();
  // save test config to the file
  saveScoutTestConfigOnDisk(scoutServerConfig, log);
  return clusterConfig;
}
