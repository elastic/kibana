/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SCOUT_SERVERS_ROOT } from '@kbn/scout-info';
import type { ToolingLog } from '@kbn/tooling-log';
import * as Fs from 'fs';
import path from 'path';
import type { ScoutTestConfig } from '../../../types';

/**
 * Saves Scout server configuration to the disk.
 * @param testServersConfig configuration to be saved
 * @param log Logger instance to report errors or debug information.
 */
export const saveScoutTestConfigOnDisk = (testServersConfig: ScoutTestConfig, log: ToolingLog) => {
  const configFilePath = path.join(SCOUT_SERVERS_ROOT, `local.json`);

  try {
    const jsonData = JSON.stringify(testServersConfig, null, 2);

    if (!Fs.existsSync(SCOUT_SERVERS_ROOT)) {
      log.debug(`scout: creating configuration directory: ${SCOUT_SERVERS_ROOT}`);
      Fs.mkdirSync(SCOUT_SERVERS_ROOT, { recursive: true });
    }

    Fs.writeFileSync(configFilePath, jsonData, 'utf-8');
    log.info(`scout: Test server configuration saved at ${configFilePath}`);
  } catch (error) {
    log.error(`scout: Failed to save test server configuration - ${error.message}`);
    throw new Error(`Failed to save test server configuration at ${configFilePath}`);
  }
};
