/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import type { CliSupportedServerModes } from '../../../types';

/**
 * Gets the config file path from a config root directory and mode.
 * @param configRootDir The root directory for the config (e.g., 'default/serverless', 'custom/uiam_local/stateful')
 * @param mode The server mode (e.g., 'serverless=es', 'stateful')
 * @returns The full path to the config file
 */
export function getConfigFilePath(configRootDir: string, mode: CliSupportedServerModes): string {
  let configFileName: string;

  if (mode === 'stateful') {
    configFileName = 'stateful.config.ts';
  } else {
    const [modeType, type] = mode.split('=');
    if (modeType !== 'serverless' || !type) {
      throw new Error(
        `Invalid config format: "${mode}". Expected "stateful" or "serverless=<type>".`
      );
    }
    // Convert hyphens to underscores for filename
    const normalizedType = type.replace(/-/g, '_');
    configFileName = `${normalizedType}.serverless.config.ts`;
  }

  return path.join(configRootDir, configFileName);
}
