/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { Config } from '../config';

export const loadConfig = async (configPath: string) => {
  try {
    const absolutePath = path.resolve(configPath);
    const configModule = await import(absolutePath);

    if (configModule.servers) {
      return new Config(configModule.servers);
    } else {
      throw new Error(`No 'servers' found in the specified config file: ${absolutePath}`);
    }
  } catch (error) {
    process.exit(1);
  }
};
