/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { Config } from './config';

export async function loadConfig(configPath: string) {
  try {
    const absolutePath = path.resolve(configPath);
    const configModule = await import(absolutePath);

    if (configModule.serversConfig) {
      return new Config(configModule.serversConfig);
    } else {
      throw new Error('No `serversConfig` found in the specified config file');
    }
  } catch (error) {
    process.exit(1);
  }
}
