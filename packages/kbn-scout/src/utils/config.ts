/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import * as Fs from 'fs';
import { ServerlessProjectType } from '@kbn/es';
import { REPO_ROOT } from '@kbn/repo-info';
import getopts from 'getopts';
import { ToolingLog } from '@kbn/tooling-log';
import { ScoutServerConfig } from '../types';

export const getProjectType = (kbnServerArgs: string[]) => {
  const options = getopts(kbnServerArgs);
  return options.serverless as ServerlessProjectType;
};

export const saveTestServersConfigOnDisk = (
  testServersConfig: ScoutServerConfig,
  log: ToolingLog
) => {
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
