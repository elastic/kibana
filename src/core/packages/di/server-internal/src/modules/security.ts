/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { cacheInScope } from '@kbn/core-di-internal';
import {
  AuditLogger,
  CoreStart,
  CurrentUser,
  RedactedSessionId,
  Request,
} from '@kbn/core-di-server';

export function loadSecurity({ bind }: ContainerModuleLoadOptions): void {
  bind(AuditLogger)
    .toResolvedValue(
      (securityStart, request) => securityStart.audit.asScoped(request),
      [CoreStart('security'), Request]
    )
    .inRequestScope()
    .onActivation(cacheInScope(AuditLogger));

  bind(CurrentUser)
    .toResolvedValue(
      (securityStart, request) => securityStart.authc.getCurrentUser(request),
      [CoreStart('security'), Request]
    )
    .inRequestScope()
    .onActivation(cacheInScope(CurrentUser));

  bind(RedactedSessionId)
    .toResolvedValue(
      (securityStart, request) => securityStart.authc.getRedactedSessionId(request),
      [CoreStart('security'), Request]
    )
    .inRequestScope()
    .onActivation(cacheInScope(RedactedSessionId));
}
