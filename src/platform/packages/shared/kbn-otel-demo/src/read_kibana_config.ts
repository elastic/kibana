/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { unflattenObject } from '@kbn/object-utils';
import fs from 'fs';
import yaml from 'js-yaml';
import { pickBy, identity } from 'lodash';
import { resolve } from 'path';

interface ElasticsearchConfig {
  hosts: string;
  username: string;
  password: string;
}

interface KibanaServerConfig {
  host: string;
  port: number;
  basePath: string;
}

interface KibanaCredentials {
  username: string;
  password: string;
}

interface KibanaConfig {
  elasticsearch: ElasticsearchConfig;
  server: KibanaServerConfig;
  kibanaCredentials: KibanaCredentials;
}

/**
 * Reads Kibana configuration from a single config file.
 * Uses provided configPath or defaults to kibana.dev.yml.
 * Environment variables override config file values.
 */
export const readKibanaConfig = (log: ToolingLog, configPath?: string): KibanaConfig => {
  const configPathToUse = resolve(process.cwd(), configPath || 'config/kibana.dev.yml');

  let esConfigValues = {};
  let serverConfigValues = {};

  if (fs.existsSync(configPathToUse)) {
    const loaded = (yaml.load(fs.readFileSync(configPathToUse, 'utf8')) || {}) as Record<
      string,
      any
    >;
    const config = unflattenObject(loaded);
    esConfigValues = config.elasticsearch || {};
    serverConfigValues = config.server || {};
  } else {
    log.warning(
      `Config file not found at ${configPathToUse}. 
      Using environment variables or defaults for Elasticsearch credentials.`
    );
  }

  const envOverrides = pickBy(
    {
      hosts: process.env.ELASTICSEARCH_HOST,
      username: process.env.ELASTICSEARCH_USERNAME,
      password: process.env.ELASTICSEARCH_PASSWORD,
    },
    identity
  );

  const elasticsearchConfig = {
    hosts: 'http://localhost:9200',
    username: 'elastic',
    password: 'changeme',
    ...esConfigValues,
    ...envOverrides,
  };

  const serverEnvOverrides = pickBy(
    {
      host: process.env.KIBANA_HOST,
      port: process.env.KIBANA_PORT ? parseInt(process.env.KIBANA_PORT, 10) : undefined,
    },
    identity
  );

  const serverConfig = {
    host: 'localhost',
    port: 5601,
    basePath: '',
    ...serverConfigValues,
    ...serverEnvOverrides,
  };

  // Kibana API credentials - for admin operations like enabling streams.
  // Defaults to elastic superuser which has all Kibana privileges.
  // Can be overridden via KIBANA_USERNAME/KIBANA_PASSWORD env vars.
  const kibanaCredentials = {
    username: process.env.KIBANA_USERNAME || 'elastic',
    password: process.env.KIBANA_PASSWORD || 'changeme',
  };

  return { elasticsearch: elasticsearchConfig, server: serverConfig, kibanaCredentials };
};
