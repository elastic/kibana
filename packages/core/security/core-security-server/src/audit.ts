/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core-http-server';

import type { AuditLogger } from './audit_logging/audit_logger';

export interface CoreAuditService {
  /**
   * Creates an {@link AuditLogger} scoped to the current request.
   *
   * This audit logger logs events with all required user and session info and should be used for
   * all user-initiated actions.
   *
   * @example
   * ```typescript
   * const auditLogger = securitySetup.audit.asScoped(request);
   * auditLogger.log(event);
   * ```
   */
  asScoped: (request: KibanaRequest) => AuditLogger;

  /**
   * {@link AuditLogger} for background tasks only.
   *
   * This audit logger logs events without any user or session info and should never be used to log
   * user-initiated actions.
   *
   * @example
   * ```typescript
   * securitySetup.audit.withoutRequest.log(event);
   * ```
   */
  withoutRequest: AuditLogger;
}
