/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';

import { statSync } from 'fs';
import { resolve } from 'path';
import { getConfigPath, getConfigDirectory } from '@kbn/utils';
import { getConfigFromFiles } from '@kbn/config';

const isNotEmpty = _.negate(_.isEmpty);
const isNotNull = _.negate(_.isNull);

/** @typedef {'es' | 'oblt' | 'security'} ServerlessProjectMode */
/** @type {ServerlessProjectMode[]} */
const VALID_SERVERLESS_PROJECT_MODE = ['es', 'oblt', 'security'];

/**
 * Collects paths to configurations to be included in the final configuration stack.
 * @param {{configOverrides?: string[], devConfig?: boolean, dev?: boolean, serverless?: string | true}} options Options impacting the outgoing config list
 * @returns List of paths to configurations to be merged, from left to right.
 */
export function compileConfigStack({ configOverrides, devConfig, dev, serverless }) {
  const cliConfigs = configOverrides || [];
  const envConfigs = getEnvConfigs();
  const defaultConfig = getConfigPath();

  let configs = [cliConfigs, envConfigs, [defaultConfig]].find(isNotEmpty);

  if (dev && devConfig !== false) {
    configs.push(resolveConfig('kibana.dev.yml'));
  }

  // Filter out all config paths that didn't exist
  configs = configs.filter(isNotNull);

  const serverlessMode = validateServerlessMode(serverless) || getServerlessModeFromCfg(configs);
  if (serverlessMode) {
    configs.unshift(resolveConfig(`serverless.${serverlessMode}.yml`));
    configs.unshift(resolveConfig('serverless.yml'));

    if (dev && devConfig !== false) {
      configs.push(resolveConfig('serverless.dev.yml'));
      configs.push(resolveConfig(`serverless.${serverlessMode}.dev.yml`));
    }
  }

  return configs.filter(isNotNull);
}

/**
 * @param {string[]} configs List of configuration file paths
 * @returns {ServerlessProjectMode|undefined} The serverless mode in the summed configs
 */
function getServerlessModeFromCfg(configs) {
  const config = getConfigFromFiles(configs);

  return config.serverless;
}

/**
 * @param {string} fileName Name of the config within the config directory
 * @returns {string | null} The resolved path to the config, if it exists, null otherwise
 */
function resolveConfig(fileName) {
  const filePath = resolve(getConfigDirectory(), fileName);
  if (fileExists(filePath)) {
    return filePath;
  } else {
    return null;
  }
}

/**
 * @param {string} filePath Path to the config file
 * @returns {boolean} Whether the file exists
 */
function fileExists(filePath) {
  try {
    return statSync(filePath).isFile();
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }

    throw err;
  }
}

/**
 * @returns {string[]}
 */
function getEnvConfigs() {
  const val = process.env.KBN_CONFIG_PATHS;
  if (typeof val === 'string') {
    return val
      .split(',')
      .filter((v) => !!v)
      .map((p) => resolve(p.trim()));
  }
  return [];
}

/**
 * @param {string | true} serverlessMode
 * @returns {ServerlessProjectMode | null}
 */
function validateServerlessMode(serverlessMode) {
  if (!serverlessMode) {
    return null;
  }

  if (serverlessMode === true) {
    return null;
  }

  if (VALID_SERVERLESS_PROJECT_MODE.includes(serverlessMode)) {
    return serverlessMode;
  }

  throw new Error(
    `invalid --serverless value, must be one of ${VALID_SERVERLESS_PROJECT_MODE.join(', ')}`
  );
}
