/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { CliSupportedServerModes } from '../../types';
import { getConfigFilePath } from './get_config_file';
import { readConfigFile } from '../loader';
import type { Config } from '../config';
import { saveScoutTestConfigOnDisk } from './save_scout_test_config';

/**
 * Loads server configuration based on the mode, creates "kbn-test" compatible Config
 * instance, that can be used to start local servers and saves its "Scout"-format copy
 * to the disk.
 * @param mode server local run mode
 * @param log Logger instance to report errors or debug information.
 * @returns "kbn-test" compatible Config instance
 */
export async function loadServersConfig(
  mode: CliSupportedServerModes,
  log: ToolingLog
): Promise<Config> {
  // get path to one of the predefined config files
  const configPath = getConfigFilePath(mode);
  // load config that is compatible with kbn-test input format
  const clusterConfig = await readConfigFile(configPath);
  // construct config for Playwright Test
  const scoutServerConfig = clusterConfig.getScoutTestConfig();
  // save test config to the file
  saveScoutTestConfigOnDisk(scoutServerConfig, log);
  return clusterConfig;
}
