/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';

/**
 * The resource an authorization check is evaluated against. UIAM identifies resources by type and
 * any attributes that type needs, such as `organization_id`.
 */
export interface UiamAuthorizationResource {
  type: string;
  [attribute: string]: string;
}

/**
 * A single authorization check: whether the principal may perform `action` on `resource`.
 */
export interface UiamAuthorizationCheck {
  action: string;
  resource: UiamAuthorizationResource;
}

/**
 * The outcome of one {@link UiamAuthorizationCheck}.
 */
export interface UiamAuthorizationCheckResult extends UiamAuthorizationCheck {
  permitted: boolean;
}

/**
 * The outcome of an authorization check request. `permitted` is `true` only when every check
 * was permitted.
 */
export interface UiamAuthorizationResult {
  permitted: boolean;
  checks: UiamAuthorizationCheckResult[];
}

/**
 * Authorization checks evaluated by UIAM for the principal behind a request.
 */
export interface UiamAuthorizationType {
  /**
   * Asks UIAM whether the principal behind the request may perform each action on each resource.
   * The request must carry UIAM credentials; the call fails for any other credential.
   * @param request The request whose credentials the checks are evaluated for.
   * @param checks The checks to evaluate.
   */
  checkAuthorization(
    request: KibanaRequest,
    checks: UiamAuthorizationCheck[]
  ): Promise<UiamAuthorizationResult>;
}
