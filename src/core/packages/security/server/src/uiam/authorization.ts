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
 * Cloud privileges evaluated by UIAM for the principal behind a request.
 */
export interface CoreUiamAuthorizationService {
  /**
   * Whether the user behind the request may view the organization's billing details
   * (UIAM `billing-details:get`, granted by `billing-admin` and `organization-admin`).
   * The request must carry UIAM credentials; the call fails for any other credential.
   * @param request The request whose credentials the check is evaluated for.
   */
  hasBillingAccess(request: KibanaRequest): Promise<boolean>;
}
