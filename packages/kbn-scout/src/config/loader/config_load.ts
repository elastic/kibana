/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { Config } from '../config';

export const loadConfig = async (configPath: string, log: ToolingLog): Promise<Config> => {
  try {
    const absolutePath = path.resolve(configPath);
    const configModule = await import(absolutePath);

    if (configModule.servers) {
      return new Config(configModule.servers);
    } else {
      throw new Error(`No 'servers' found in the config file at path: ${absolutePath}`);
    }
  } catch (error) {
    throw new Error(`Failed to load config from ${configPath}: ${error.message}`);
  }
};
