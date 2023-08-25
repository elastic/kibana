/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Os from 'os';
import { resolve } from 'path';

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

export const ESS_OPERATOR_USERS_PATH = resolve(__dirname, './ess_resources/operator_users.yml');
export const ESS_SERVICE_TOKENS_PATH = resolve(__dirname, './ess_resources/service_tokens');

export const ESS_USERS_PATH = resolve(__dirname, './ess_resources/users');
export const ESS_USERS_ROLES_PATH = resolve(__dirname, './ess_resources/users_roles');

export const ESS_ROLES_PATH = resolve(__dirname, './ess_resources/roles.yml');
export const ESS_ROLE_MAPPING_PATH = resolve(__dirname, './ess_resources/role_mapping.yml');

export const ESS_SECRETS_PATH = resolve(__dirname, './ess_resources/secrets.json');

export const ESS_RESOURCES_PATHS = [
  ESS_OPERATOR_USERS_PATH,
  ESS_ROLE_MAPPING_PATH,
  ESS_ROLES_PATH,
  ESS_SERVICE_TOKENS_PATH,
  ESS_USERS_PATH,
  ESS_USERS_ROLES_PATH,
];

export const ESS_CONFIG_PATH = '/usr/share/elasticsearch/config/';

// Files need to be inside config for permissions reasons inside the container
export const ESS_FILES_PATH = `${ESS_CONFIG_PATH}files/`;
