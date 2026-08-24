/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  AttachServiceAccountWorkloadParams,
  ServiceAccountWorkloadBinding,
  ServiceAccountWorkloadCoordinates,
} from '@kbn/core-security-common';

import type { CoreAuditService } from './audit';
import type { CoreAuthenticationService, FakeRequestEnricher } from './authc';
import type { CoreServiceAccountsService } from './service_accounts';

/**
 * The contract exposed by the security provider for Core to
 * consume and re-expose via its security service.
 *
 * @public
 */
export interface CoreSecurityDelegateContract {
  authc: AuthenticationServiceContract;
  audit: AuditServiceContract;
  serviceAccounts: ServiceAccountsServiceContract;
  /**
   * Binds a `profile_uid` to a fake request. The delegate owns the storage
   * (typically a WeakMap) consulted by its own `authc.getCurrentUser`. Core
   * re-exposes this via the one-shot
   * {@link SecurityServiceSetup.acquireFakeRequestEnricher} accessor.
   *
   * @internal
   */
  fakeRequestEnricher: FakeRequestEnricher;
}

/**
 * The authentication contract that the security provider must implement.
 * Mirrors {@link CoreAuthenticationService}; the delegate's `getCurrentUser`
 * is responsible for surfacing the synthetic user produced by
 * {@link CoreSecurityDelegateContract.fakeRequestEnricher}.
 *
 * @public
 */
export type AuthenticationServiceContract = CoreAuthenticationService;

export type AuditServiceContract = CoreAuditService;

/**
 * The service accounts contract that the security provider must implement: everything
 * {@link CoreServiceAccountsService} exposes at start, plus the workload-binding operations behind
 * the capability handles Core hands to plugins.
 *
 * The workload methods take the operation type as their first argument because a handle supplies
 * its own. They are deliberately absent from {@link SecurityServiceStart}, so the only way to
 * reach them is through a handle for an operation type someone claimed.
 *
 * @public
 */
export interface ServiceAccountsServiceContract extends CoreServiceAccountsService {
  /**
   * Binds a workload to a service account.
   *
   * @param operationType - The type of operation.
   * @param request - The request.
   * @param params - The parameters.
   * @returns The workload binding.
   */
  attachWorkload(
    operationType: string,
    request: KibanaRequest,
    params: AttachServiceAccountWorkloadParams
  ): Promise<ServiceAccountWorkloadBinding>;

  /**
   * Unbinds a workload from a service account.
   * @param operationType - The type of operation.
   * @param request - The request.
   * @param params - The parameters.
   * @returns The workload binding.
   */
  detachWorkload(
    operationType: string,
    request: KibanaRequest,
    params: { workloadType: string; workloadId: string }
  ): Promise<void>;

  /**
   * Retrieves a workload binding.
   * @param operationType - The type of operation.
   * @param params - The parameters.
   * @returns The workload binding.
   */
  getWorkloadBinding(
    operationType: string,
    params: ServiceAccountWorkloadCoordinates
  ): Promise<ServiceAccountWorkloadBinding | null>;

  /**
   * Executes a function for a workload, scoped to the Service Account.
   * @param operationType - The type of operation.
   * @param params - The parameters for the workload.
   * @param fn - The function to execute.
   * @returns The result of the function.
   */
  withScopedRequestForWorkload<T>(
    operationType: string,
    params: ServiceAccountWorkloadCoordinates,
    fn: (request: KibanaRequest) => Promise<T>
  ): Promise<T>;
}
