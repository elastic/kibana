/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AuthenticatedPrincipal, AuthenticatedUser } from '@kbn/core-security-common';

import type { AuditLogger } from './audit_logging/audit_logger';
import type { APIKeysWithContextType } from './authentication/api_keys';

export interface SecurityRequestHandlerContext {
  authc: AuthcRequestHandlerContext;
  authz: AuthzRequestHandlerContext;
  audit: AuditRequestHandlerContext;
}

export interface AuthcRequestHandlerContext {
  getCurrentUser(): AuthenticatedUser | null;
  /** See `CoreAuthenticationService.getPrincipal`, bound to the context's request. */
  getPrincipal(): AuthenticatedPrincipal | null;
  apiKeys: APIKeysWithContextType;
}

export interface AuthzRequestHandlerContext {
  /** See `CoreAuthorizationService.uiam`, bound to the context's request. */
  uiam: UiamAuthzRequestHandlerContext | null;
}

export interface UiamAuthzRequestHandlerContext {
  /** See `CoreUiamAuthorizationService.canViewBillingDetails`, bound to the context's request. */
  canViewBillingDetails(): Promise<boolean>;
  /** See `CoreUiamAuthorizationService.canInviteOrganizationMembers`, bound to the context's request. */
  canInviteOrganizationMembers(): Promise<boolean>;
  /** See `CoreUiamAuthorizationService.canListOrganizationMembers`, bound to the context's request. */
  canListOrganizationMembers(): Promise<boolean>;
}

export interface AuditRequestHandlerContext {
  logger: AuditLogger;
}
