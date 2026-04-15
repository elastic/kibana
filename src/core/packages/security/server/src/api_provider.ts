/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreAuditService } from './audit';
import type { CoreAuthenticationService } from './authc';

/**
 * The contract exposed by the security provider for Core to
 * consume and re-expose via its security service.
 *
 * @public
 */
export interface CoreSecurityDelegateContract {
  authc: AuthenticationServiceContract;
  audit: AuditServiceContract;
}

/**
 * The subset of {@link CoreAuthenticationService} that the security provider
 * must implement.  Core owns enrichment (`enrichRequestWithUserProfile`) and
 * wraps the delegate's `getCurrentUser` to layer it on top.
 *
 * @public
 */
export type AuthenticationServiceContract = Omit<
  CoreAuthenticationService,
  'enrichRequestWithUserProfile'
>;

export type AuditServiceContract = CoreAuditService;
