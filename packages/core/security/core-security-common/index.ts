/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type {
  User,
  UserRealm,
  AuthenticatedUser,
  AuthenticationProvider,
} from './src/authentication';

export type {
  APIKeysService,
  CreateAPIKeyParams,
  CreateAPIKeyResult,
  InvalidateAPIKeyResult,
  InvalidateAPIKeysParams,
  ValidateAPIKeyParams,
  CreateRestAPIKeyParams,
  CreateRestAPIKeyWithKibanaPrivilegesParams,
  CreateCrossClusterAPIKeyParams,
  GrantAPIKeyResult,
} from './src/api_keys';
export {
  restApiKeySchema,
  crossClusterApiKeySchema,
  getRestApiKeyWithKibanaPrivilegesSchema,
} from './src/api_keys';

export { elasticsearchRoleSchema, getKibanaRoleSchema, GLOBAL_RESOURCE } from './src/roles';
export type { KibanaPrivilegesType, ElasticsearchPrivilegesType } from './src/roles';
