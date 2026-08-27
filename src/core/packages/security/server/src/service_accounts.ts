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
}
