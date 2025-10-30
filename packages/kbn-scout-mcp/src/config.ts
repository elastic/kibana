/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import type { ScoutMcpConfig } from './types';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ScoutTestConfig } from '@kbn/scout';
import { createScoutConfig } from '@kbn/scout/src/common/services';

/**
 * Load Scout MCP configuration from environment variables and options
 */
export function loadScoutMcpConfig(options: Partial<ScoutMcpConfig> = {}): ScoutMcpConfig {
  const targetUrl =
    options.targetUrl ||
    process.env.KIBANA_BASE_URL ||
    process.env.TEST_KIBANA_URL ||
    'http://localhost:5601';

  const mode =
    options.mode ||
    (process.env.SCOUT_MODE as 'stateful' | 'serverless') ||
    'stateful';

  const projectType =
    options.projectType ||
    (process.env.SCOUT_PROJECT_TYPE as 'es' | 'oblt' | 'security') ||
    undefined;

  const configPath =
    options.configPath ||
    process.env.SCOUT_CONFIG_PATH ||
    undefined;

  // Try to load Scout config if configPath is provided, otherwise we'll create minimal config on demand
  let scoutConfig: ScoutTestConfig | undefined = options.scoutConfig;

  if (!scoutConfig && configPath) {
    try {
      const configDir = path.dirname(configPath);
      const configName = path.basename(configPath, path.extname(configPath));
      // Create a minimal logger for config loading
      const log = new ToolingLog({
        level: 'info',
        writeTo: process.stderr,
      });
      scoutConfig = createScoutConfig(configDir, configName, log as any);
    } catch (error) {
      // If loading fails, we'll create a minimal config later
      scoutConfig = undefined;
    }
  }

  return {
    targetUrl,
    mode,
    projectType,
    configPath,
    scoutConfig,
  };
}

/**
 * Validate Scout MCP configuration
 */
export function validateConfig(config: ScoutMcpConfig, log: ToolingLog): boolean {
  if (!config.targetUrl) {
    log.error('Target URL is required');
    return false;
  }

  try {
    new URL(config.targetUrl);
  } catch (err) {
    log.error(`Invalid target URL: ${config.targetUrl}`);
    return false;
  }

  if (config.mode !== 'stateful' && config.mode !== 'serverless') {
    log.error(`Invalid mode: ${config.mode}. Must be 'stateful' or 'serverless'`);
    return false;
  }

  if (config.mode === 'serverless' && !config.projectType) {
    log.error('Project type is required for serverless mode');
    return false;
  }

  if (config.projectType && !['es', 'oblt', 'security'].includes(config.projectType)) {
    log.error(`Invalid project type: ${config.projectType}. Must be 'es', 'oblt', or 'security'`);
    return false;
  }

  return true;
}

/**
 * Create Scout test configuration from MCP config
 * This creates a minimal config if no Scout config file is provided
 */
export function createScoutTestConfig(config: ScoutMcpConfig, log: ToolingLog): ScoutTestConfig {
  // If we already have a loaded Scout config, use it
  if (config.scoutConfig) {
    return config.scoutConfig;
  }

  // Otherwise, create a minimal config from MCP config and environment variables
  const kibanaUrl = new URL(config.targetUrl);

  // Get credentials from environment variables
  const username =
    process.env.ELASTICSEARCH_USERNAME ||
    process.env.KIBANA_USERNAME ||
    kibanaUrl.username ||
    'elastic';

  const password =
    process.env.ELASTICSEARCH_PASSWORD ||
    process.env.KIBANA_PASSWORD ||
    kibanaUrl.password ||
    'changeme';

  // Determine Elasticsearch URL (usually Kibana URL without port or with different port)
  // For local development, ES is typically on port 9200
  const esUrl = process.env.ELASTICSEARCH_URL ||
    (config.targetUrl.includes('localhost')
      ? config.targetUrl.replace('5601', '9200').replace('/app', '')
      : config.targetUrl.replace(/:\d+/, ':9200').replace('/app', ''));

  const baseConfig: ScoutTestConfig = {
    hosts: {
      kibana: config.targetUrl,
      elasticsearch: esUrl,
    },
    auth: {
      username,
      password,
    },
    serverless: config.mode === 'serverless',
    isCloud: config.mode === 'serverless' || process.env.TEST_CLOUD_HOST_NAME !== undefined,
    cloudHostName: process.env.TEST_CLOUD_HOST_NAME,
    cloudUsersFilePath: process.env.CLOUD_USERS_FILE_PATH || '',
    license: process.env.TEST_LICENSE || 'basic',
  };

  if (config.mode === 'serverless' && config.projectType) {
    return {
      ...baseConfig,
      projectType: config.projectType,
    };
  }

  return baseConfig;
}
