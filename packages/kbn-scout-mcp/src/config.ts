/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ScoutTestConfig } from '@kbn/scout';
import type { ScoutMcpConfig } from './types';
import { validateConfigPath } from './utils';

/**
 * Load Scout MCP configuration from environment variables and options
 */
export function loadScoutMcpConfig(options: Partial<ScoutMcpConfig> = {}): ScoutMcpConfig {
  // Default to Scout's default port (5620) if no URL is specified
  // Scout's start-server command starts Kibana on port 5620 with SAML pre-configured
  const targetUrl =
    options.targetUrl ||
    process.env.KIBANA_BASE_URL ||
    process.env.TEST_KIBANA_URL ||
    'http://localhost:5620';

  const mode = options.mode || (process.env.SCOUT_MODE as 'stateful' | 'serverless') || 'stateful';

  const projectType =
    options.projectType ||
    (process.env.SCOUT_PROJECT_TYPE as 'es' | 'oblt' | 'security') ||
    undefined;

  const configPath = options.configPath || process.env.SCOUT_CONFIG_PATH || undefined;

  // SSL validation: disabled only for localhost/development, enabled by default for security
  const ignoreHTTPSErrors =
    options.ignoreHTTPSErrors !== undefined
      ? options.ignoreHTTPSErrors
      : process.env.SCOUT_IGNORE_HTTPS_ERRORS === 'true'
      ? true
      : false; // Default: false (SSL validation enabled)

  // Try to load Scout config if configPath is provided, otherwise we'll create minimal config on demand
  let scoutConfig: ScoutTestConfig | undefined = options.scoutConfig;

  if (!scoutConfig && configPath) {
    try {
      // Validate config path to prevent path traversal
      const validatedPath = validateConfigPath(configPath);

      // Ensure the file exists
      if (!fs.existsSync(validatedPath)) {
        throw new Error(`Config file does not exist: ${validatedPath}`);
      }

      // Read and parse the config file
      const configContent = fs.readFileSync(validatedPath, 'utf-8');
      scoutConfig = JSON.parse(configContent) as ScoutTestConfig;
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
    ignoreHTTPSErrors,
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
  // Allow default credentials for localhost/development, require explicit for remote
  const isLocalhost = kibanaUrl.hostname === 'localhost' || kibanaUrl.hostname === '127.0.0.1';

  // Normalize empty strings to undefined
  const urlUsername = kibanaUrl.username || undefined;
  const urlPassword = kibanaUrl.password || undefined;

  const username =
    process.env.ELASTICSEARCH_USERNAME ||
    process.env.KIBANA_USERNAME ||
    urlUsername ||
    (isLocalhost ? 'elastic' : undefined);

  const password =
    process.env.ELASTICSEARCH_PASSWORD ||
    process.env.KIBANA_PASSWORD ||
    urlPassword ||
    (isLocalhost ? 'changeme' : undefined);

  // Require credentials for non-localhost deployments
  if (!username || !password) {
    if (!isLocalhost) {
      throw new Error(
        'Credentials must be provided via environment variables (ELASTICSEARCH_USERNAME/ELASTICSEARCH_PASSWORD or KIBANA_USERNAME/KIBANA_PASSWORD) or URL for remote deployments'
      );
    }
    // This should not happen for localhost since we provide defaults, but handle edge case
    throw new Error(
      'Credentials must be provided via environment variables (ELASTICSEARCH_USERNAME/ELASTICSEARCH_PASSWORD or KIBANA_USERNAME/KIBANA_PASSWORD) or URL'
    );
  }

  // Determine Elasticsearch URL
  // Scout uses port 9220 for Elasticsearch (vs 9200 for standard ES)
  // Check if we're connecting to Scout's default port (5620) and use Scout's ES port (9220)
  const kibanaPort = kibanaUrl.port || (kibanaUrl.protocol === 'https:' ? '443' : '80');
  const isScoutPort = kibanaPort === '5620';
  const esPort = isScoutPort ? '9220' : '9200';

  const esUrl =
    process.env.ELASTICSEARCH_URL ||
    (config.targetUrl.includes('localhost')
      ? config.targetUrl.replace(kibanaPort, esPort).replace('/app', '')
      : config.targetUrl.replace(/:\d+/, `:${esPort}`).replace('/app', ''));

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
