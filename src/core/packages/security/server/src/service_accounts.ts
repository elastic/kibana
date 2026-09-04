/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { CreateServiceAccountParams, ServiceAccount } from '@kbn/core-security-common';

/**
 * Core's service accounts service
 *
 * @public
 */
export interface CoreServiceAccountsService {
  /**
   * Check if service accounts are available in the current environment.
   */
  isEnabled(): boolean;

  /**
   * Create a service account whose privileges are bounded by those of the user
   * bound to the provided request.
   *
   * @param request The request whose user the service account is created on behalf of.
   * @param params The name and role assignments for the new service account.
   */
  create(request: KibanaRequest, params: CreateServiceAccountParams): Promise<ServiceAccount>;

  /**
   * POC ONLY. Exchanges a service account id for a short-lived access token.
   *
   * Deliberately unauthorized: it performs no privilege check, so any plugin holding the start
   * contract can mint a live credential for any account id it can name. The security plugin kept
   * the equivalent method private for exactly this reason — the sanctioned in-process path is
   * `createFakeRequest`, which never surfaces the raw token. This exists only so a token can be
   * handed to an out-of-process consumer (e.g. the Nightshift Relay); it needs a
   * `manage_security` gate (or an operation-handle capability, like workload bindings have)
   * before shipping.
   */
  exchangeToken(serviceAccountId: string): Promise<{ token: string }>;
}
