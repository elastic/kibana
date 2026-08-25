/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { login } from './login';
export { samlAuthentication, resolveCloudUsersFilePath, ES_LOADED_USERS } from './saml_auth';
export type {
  EndpointSecurityRoleNames,
  EndpointSecurityRoleDefinitions,
  KibanaKnownUserAccounts,
  SecurityTestUser,
} from './roles_and_users';
export {
  SECURITY_SERVERLESS_ROLE_NAMES,
  ENDPOINT_SECURITY_ROLE_NAMES,
  KIBANA_KNOWN_DEFAULT_ACCOUNTS,
} from './roles_and_users';
