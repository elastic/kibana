/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AgentConfigOptions } from 'elastic-apm-node';
import { getConfigurationFilePaths, getConfigFromFiles, applyConfigOverrides } from './utils';
import { ApmConfiguration } from './config';

let apmConfig: ApmConfiguration | undefined;

/**
 * Load the APM configuration.
 *
 * @param argv the `process.argv` arguments
 * @param rootDir The root directory of kibana (where the sources and the `package.json` file are)
 * @param isDistributable true for production builds, false otherwise
 */
export const loadConfiguration = (
  argv: string[],
  rootDir: string,
  isDistributable: boolean
): ApmConfiguration => {
  const configPaths = getConfigurationFilePaths(argv);
  const rawConfiguration = getConfigFromFiles(configPaths);
  applyConfigOverrides(rawConfiguration, argv);

  apmConfig = new ApmConfiguration(rootDir, rawConfiguration, isDistributable);
  return apmConfig;
};

export const getConfiguration = (serviceName: string): AgentConfigOptions | undefined => {
  // integration test runner starts a kibana server that import the module without initializing APM.
  // so we need to check initialization of the config.
  // note that we can't just load the configuration during this module's import
  // because jest IT are ran with `--config path-to-jest-config.js` which conflicts with the CLI's `config` arg
  // causing the config loader to try to load the jest js config as yaml and throws.
  if (apmConfig) {
    return apmConfig.getConfig(serviceName);
  }
  return undefined;
};
