/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { SecurityServiceSetup, SecurityServiceStart } from './src/contracts';
export type { CoreAuthenticationService } from './src/authc';
export type { CoreAuditService } from './src/audit';
export type {
  CoreSecurityDelegateContract,
  AuthenticationServiceContract,
  AuditServiceContract,
} from './src/api_provider';
export type {
  SecurityRequestHandlerContext,
  AuthcRequestHandlerContext,
  AuditRequestHandlerContext,
} from './src/request_handler_context';
export type {
  AuditEvent,
  AuditHttp,
  AuditKibana,
  AuditRequest,
} from './src/audit_logging/audit_events';
export type { AuditLogger } from './src/audit_logging/audit_logger';

export type {
  APIKeysServiceWithContext,
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
  UpdateAPIKeyParams,
  UpdateAPIKeyResult,
  UpdateCrossClusterAPIKeyParams,
  UpdateRestAPIKeyParams,
  UpdateRestAPIKeyWithKibanaPrivilegesParams,
} from './src/authentication/api_keys';

export type { KibanaPrivilegesType, ElasticsearchPrivilegesType } from './src/roles';
export { isCreateRestAPIKeyParams } from './src/authentication/api_keys';
export type { CoreFipsService } from './src/fips';
