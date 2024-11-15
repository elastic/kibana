/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Fs from 'fs';
import getopts from 'getopts';
import path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { ServerlessProjectType } from '@kbn/es';
import { REPO_ROOT } from '@kbn/repo-info';
import { CliSupportedServerModes, ScoutServerConfig } from '../types';
import { getConfigFilePath } from './get_config_file';
import { loadConfig } from './loader/config_load';

export const formatCurrentDate = () => {
  const now = new Date();

  const format = (num: number, length: number) => String(num).padStart(length, '0');

  return (
    `${format(now.getDate(), 2)}/${format(now.getMonth() + 1, 2)}/${now.getFullYear()} ` +
    `${format(now.getHours(), 2)}:${format(now.getMinutes(), 2)}:${format(now.getSeconds(), 2)}.` +
    `${format(now.getMilliseconds(), 3)}`
  );
};

const saveTestServersConfigOnDisk = (testServersConfig: ScoutServerConfig, log: ToolingLog) => {
  const configDirPath = path.resolve(REPO_ROOT, '.scout', 'servers');
  const configFilePath = path.join(configDirPath, `local.json`);

  try {
    const jsonData = JSON.stringify(testServersConfig, null, 2);

    if (!Fs.existsSync(configDirPath)) {
      log.debug(`scout: creating configuration directory: ${configDirPath}`);
      Fs.mkdirSync(configDirPath, { recursive: true });
    }

    Fs.writeFileSync(configFilePath, jsonData, 'utf-8');
    log.info(`scout: Test server configuration saved at ${configFilePath}`);
  } catch (error) {
    log.error(`scout: Failed to save test server configuration - ${error.message}`);
    throw new Error(`Failed to save test server configuration at ${configFilePath}`);
  }
};

export async function loadServersConfig(mode: CliSupportedServerModes, log: ToolingLog) {
  // get path to one of the predefined config files
  const configPath = getConfigFilePath(mode);
  // load config that is compatible with kbn-test input format
  const config = await loadConfig(configPath, log);
  // construct config for Playwright Test
  const scoutServerConfig = config.getTestServersConfig();
  // save test config to the file
  saveTestServersConfigOnDisk(scoutServerConfig, log);

  return config;
}

export const getProjectType = (kbnServerArgs: string[]) => {
  const options = getopts(kbnServerArgs);
  return options.serverless as ServerlessProjectType;
};
