/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getConfigurationFilePaths, getConfigFromFiles, applyConfigOverrides } from './utils';
import { ApmConfiguration } from './config';

/**
 * Load the APM configuration.
 *
 * @param argv the `process.argv` arguments
 * @param rootDir The root directory of kibana (where the sources and the `package.json` file are)
 * @param production true for production builds, false otherwise
 */
export const loadConfiguration = (
  argv: string[],
  rootDir: string,
  isDistributable: boolean
): ApmConfiguration => {
  const configPaths = getConfigurationFilePaths(argv);
  const rawConfiguration = getConfigFromFiles(configPaths);
  applyConfigOverrides(rawConfiguration, argv);
  return new ApmConfiguration(rootDir, rawConfiguration, isDistributable);
};
