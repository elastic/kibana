/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
   * Check if the current user is authorized to create service accounts.
   */
  canCreate(): boolean;

  /**
   * Create a service account whose privileges are bounded by those of the
   * current user.
   *
   * @param params The name and role assignments for the new service account.
   */
  create(params: CreateServiceAccountParams): Promise<ServiceAccount>;
}
