/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AuthenticatedUser } from '@kbn/core-security-common';
import { AuditLogger } from './audit_logging/audit_logger';

export interface SecurityRequestHandlerContext {
  authc: AuthcRequestHandlerContext;
  audit: AuditRequestHandlerContext;
}

export interface AuthcRequestHandlerContext {
  getCurrentUser(): AuthenticatedUser | null;
}

export interface AuditRequestHandlerContext {
  logger: AuditLogger;
}
