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

/**
 * BOOKMARK - List of Kibana project types
 * @type {import('@kbn/projects-solutions-groups').KibanaProject[]}
 * */
const VALID_SERVERLESS_PROJECT_MODE = ['es', 'oblt', 'security', 'workplaceai'];

/**
 * Builds the ordered list of config file paths to merge (left to right, last wins).
 *
 * Stack order:
 *   1. serverless.yml + serverless.{mode}.yml          (serverless base)
 *   2. kibana.yml (or env configs)                     (when no --config overrides)
 *   3. kibana.dev.yml                                  (when dev, no --config overrides)
 *   4. serverless.dev.yml + serverless.{mode}.dev.yml  (when serverless + dev)
 *   5. Security / pricing tier configs + dev variants
 *   6. --config overrides                              (always last, highest priority)
 */
export function compileConfigStack({ configOverrides, devConfig, dev, serverless, unknownOptions }) {
  const isDev = dev && devConfig !== false;
  const hasCliConfig = configOverrides?.length > 0;
  const defaultConfigs = getDefaultConfigs();
  const baseConfigs = hasCliConfig ? configOverrides : defaultConfigs;
  const serverlessMode = validateServerlessMode(serverless) || getServerlessModeFromCfg(baseConfigs);

  const configs = [];

  if (serverlessMode) {
    configs.push(resolveConfig('serverless.yml'));
    configs.push(resolveConfig(`serverless.${serverlessMode}.yml`));
  }

  if (!hasCliConfig) {
    configs.push(...defaultConfigs);
    if (isDev) {
      configs.push(resolveConfig('kibana.dev.yml'));
    }
  }

  if (serverlessMode && isDev) {
    configs.push(resolveConfig('serverless.dev.yml'));
    configs.push(resolveConfig(`serverless.${serverlessMode}.dev.yml`));
  }

  if (serverlessMode === 'security') {
    const tier = getSecurityTier(configs, unknownOptions);
    if (tier) {
      configs.push(resolveConfig(`serverless.security.${tier}.yml`));
      if (isDev) {
        configs.push(resolveConfig(`serverless.security.${tier}.dev.yml`));
      }
    }
  }

  const mergedConfig = getConfigFromFiles(configs.filter((c) => c !== null));
  const isPricingTiersEnabled =
    _.get(unknownOptions, 'pricing.tiers.enabled') ??
    _.get(mergedConfig, 'pricing.tiers.enabled', false);

  if (isPricingTiersEnabled) {
    const tier = getPricingTier(mergedConfig, unknownOptions);
    if (tier) {
      configs.push(resolveConfig(`serverless.${serverlessMode}.${tier}.yml`));
      if (isDev) {
        configs.push(resolveConfig(`serverless.${serverlessMode}.${tier}.dev.yml`));
      }
    }
  }

  if (hasCliConfig) {
    configs.push(...configOverrides);
  }

  return configs.filter((c) => c !== null);
}

/** @returns {string} The serverless mode found in the merged config files, if any */
function getServerlessModeFromCfg(configs) {
  const config = getConfigFromFiles(configs);
  return config.serverless;
}

/** @typedef {'search_ai_lake' | 'essentials' | 'complete'} ServerlessSecurityTier */
/**
 * Resolves the security tier from CLI options or config files.
 * @param {(string|null)[]} configs Current config stack
 * @param {Record<string, unknown>} unknownOptions CLI-provided options
 * @returns {ServerlessSecurityTier|undefined}
 */
function getSecurityTier(configs, unknownOptions) {
  const cliTier = _.get(
    unknownOptions,
    'xpack.securitySolutionServerless.productTypes[0].product_tier'
  );
  if (cliTier) return cliTier;

  const config = getConfigFromFiles(configs.filter((c) => c !== null));
  const productType = _.get(config, 'xpack.securitySolutionServerless.productTypes', [])[0];
  return productType?.product_tier;
}

/** @typedef {'essentials' | 'complete' | 'search_ai_lake' | 'ai_soc'} ServerlessProjectTier */
/**
 * Resolves the pricing tier from CLI options or a pre-merged config object.
 * @param {Record<string, unknown>} config Merged config object
 * @param {Record<string, unknown>} unknownOptions CLI-provided options
 * @returns {ServerlessProjectTier|undefined}
 */
function getPricingTier(config, unknownOptions) {
  const products =
    _.get(unknownOptions, 'pricing.tiers.products') ?? _.get(config, 'pricing.tiers.products', []);

  const uniqueTiers = _.uniqBy(products, 'tier');
  if (uniqueTiers.length > 1) {
    throw new Error(
      'Multiple tiers found in pricing.tiers.products, the applied tier should be the same for all the products.'
    );
  }

  return uniqueTiers.at(0)?.tier;
}

/**
 * @param {string} fileName Name of the config within the config directory
 * @returns {string | null} The resolved path, or null if the file doesn't exist
 */
function resolveConfig(fileName) {
  const filePath = resolve(getConfigDirectory(), fileName);
  return fileExists(filePath) ? filePath : null;
}

function fileExists(filePath) {
  try {
    return statSync(filePath).isFile();
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}

/** @returns {string[]} Config paths from env, or the default kibana.yml path */
function getDefaultConfigs() {
  const envConfigs = getEnvConfigs();
  if (envConfigs.length > 0) return envConfigs;
  return [getConfigPath()];
}

/** @returns {string[]} Config paths from the KBN_CONFIG_PATHS env variable */
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
 * @returns {string | null} The validated mode, or null if not applicable
 */
function validateServerlessMode(serverlessMode) {
  if (!serverlessMode || serverlessMode === true) return null;

  if (VALID_SERVERLESS_PROJECT_MODE.includes(serverlessMode)) return serverlessMode;

  throw new Error(
    `invalid --serverless value, must be one of ${VALID_SERVERLESS_PROJECT_MODE.join(', ')}`
  );
}
