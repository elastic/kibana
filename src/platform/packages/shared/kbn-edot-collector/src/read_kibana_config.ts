/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs';
import yaml from 'js-yaml';
import { pickBy, identity } from 'lodash';
import { resolve } from 'path';

interface ElasticsearchConfig {
  hosts: string;
  username: string;
  password: string;
}

interface KibanaConfig {
  elasticsearch: ElasticsearchConfig;
}

/**
 * Reads Kibana configuration from a single config file.
 * Uses provided configPath or defaults to kibana.dev.yml.
 * Environment variables override config file values.
 */
export const readKibanaConfig = (log: ToolingLog, configPath?: string): KibanaConfig => {
  const configPathToUse = resolve(process.cwd(), configPath || 'config/kibana.dev.yml');

  let configValues = {};
  if (fs.existsSync(configPathToUse)) {
    const config = (yaml.load(fs.readFileSync(configPathToUse, 'utf8')) || {}) as Record<
      string,
      any
    >;
    configValues = config.elasticsearch || {};
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
    ...configValues,
    ...envOverrides,
  };

  return { elasticsearch: elasticsearchConfig };
};
