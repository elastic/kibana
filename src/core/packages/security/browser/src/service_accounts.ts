/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CreateServiceAccountParams,
  FindServiceAccountsByRolesResponse,
  ServiceAccount,
  ServiceAccountBoundWorkload,
} from '@kbn/core-security-common';

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
   * Create a service account with the given roles, bounded by the privileges of the current
   * user.
   *
   * @param params The name and roles for the new service account.
   */
  create(params: CreateServiceAccountParams): Promise<ServiceAccount>;

  /**
   * Find the service accounts that hold any of the given roles, with the number of workloads bound
   * to each. Requires the `manage_security` cluster privilege.
   *
   * @param roles The role names to look for. Must not be empty.
   */
  findByRoles(roles: string[]): Promise<FindServiceAccountsByRolesResponse>;

  /**
   * List every workload bound to a service account, across spaces. Requires the `manage_security`
   * cluster privilege.
   *
   * @param serviceAccountId The id of the account.
   */
  listWorkloads(serviceAccountId: string): Promise<ServiceAccountBoundWorkload[]>;
}
