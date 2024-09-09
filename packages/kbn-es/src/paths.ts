/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Os from 'os';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

function maybeUseBat(bin: string) {
  return Os.platform().startsWith('win') ? `${bin}.bat` : bin;
}

const tempDir = Os.tmpdir();

export const BASE_PATH = resolve(tempDir, 'kbn-es');

export const GRADLE_BIN = maybeUseBat('./gradlew');
export const ES_BIN = maybeUseBat('bin/elasticsearch');
export const ES_PLUGIN_BIN = maybeUseBat('bin/elasticsearch-plugin');
export const ES_CONFIG = 'config/elasticsearch.yml';

export const ES_KEYSTORE_BIN = maybeUseBat('./bin/elasticsearch-keystore');

export const STATEFUL_ROLES_ROOT_PATH = resolve(__dirname, './stateful_resources');

export const SERVERLESS_OPERATOR_USERS_PATH = resolve(
  __dirname,
  './serverless_resources/operator_users.yml'
);
export const SERVERLESS_SERVICE_TOKENS_PATH = resolve(
  __dirname,
  './serverless_resources/service_tokens'
);

export const SERVERLESS_USERS_PATH = resolve(__dirname, './serverless_resources/users');
export const SERVERLESS_USERS_ROLES_PATH = resolve(__dirname, './serverless_resources/users_roles');

export const SERVERLESS_ROLES_ROOT_PATH = resolve(
  __dirname,
  './serverless_resources/project_roles'
);
export const SERVERLESS_ROLE_MAPPING_PATH = resolve(
  __dirname,
  './serverless_resources/role_mapping.yml'
);

export const SERVERLESS_SECRETS_PATH = resolve(__dirname, './serverless_resources/secrets.json');

export const SERVERLESS_SECRETS_SSL_PATH = resolve(
  __dirname,
  './serverless_resources/secrets_ssl.json'
);

export const SERVERLESS_JWKS_PATH = resolve(__dirname, './serverless_resources/jwks.json');

export const SERVERLESS_IDP_METADATA_PATH = resolve(REPO_ROOT, '.es', 'idp_metadata.xml');

export const SERVERLESS_RESOURCES_PATHS = [
  SERVERLESS_OPERATOR_USERS_PATH,
  SERVERLESS_ROLE_MAPPING_PATH,
  SERVERLESS_SERVICE_TOKENS_PATH,
  SERVERLESS_USERS_PATH,
  SERVERLESS_USERS_ROLES_PATH,
];

export const SERVERLESS_CONFIG_PATH = '/usr/share/elasticsearch/config/';

// Files need to be inside config for permissions reasons inside the container
export const SERVERLESS_FILES_PATH = `${SERVERLESS_CONFIG_PATH}files/`;
