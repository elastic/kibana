/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import yaml from 'js-yaml';
import { getConfigurationFilePaths } from '@kbn/apm-config-loader/src/utils';
import { pickBy, identity } from 'lodash';

export type KibanaConfig = ReturnType<typeof readKibanaConfig>;

/**
 * Reads Kibana configuration from kibana.yml and kibana.dev.yml files.
 * Prioritizes CLI arguments, then environment variables, then config files.
 */
export const readKibanaConfig = () => {
  const configPaths = getConfigurationFilePaths(process.argv);

  let loadedKibanaConfig = {};

  // Load all config files in order
  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      const config = (yaml.load(fs.readFileSync(configPath, 'utf8')) || {}) as Record<string, any>;
      loadedKibanaConfig = { ...loadedKibanaConfig, ...config };
    }
  }

  // Environment variables override config files
  const cliEsCredentials = pickBy(
    {
      'elasticsearch.username': process.env.ELASTICSEARCH_USERNAME,
      'elasticsearch.password': process.env.ELASTICSEARCH_PASSWORD,
      'elasticsearch.hosts': process.env.ELASTICSEARCH_HOST,
    },
    identity
  ) as {
    'elasticsearch.username'?: string;
    'elasticsearch.password'?: string;
    'elasticsearch.hosts'?: string;
  };

  return {
    'elasticsearch.hosts': 'http://localhost:9200',
    'elasticsearch.username': 'elastic',
    'elasticsearch.password': 'changeme',
    ...loadedKibanaConfig,
    ...cliEsCredentials,
  };
};
