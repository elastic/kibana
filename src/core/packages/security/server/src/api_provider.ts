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
  BindServiceAccountWorkloadParams,
  ServiceAccountWorkloadBinding,
  ServiceAccountWorkloadCoordinates,
  ServiceAccountWorkloadRequestParams,
  ServiceAccountWorkloadRef,
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
 * The service accounts contract that the security provider must implement: the plugin-agnostic
 * methods of {@link CoreServiceAccountsService}, plus its workload methods keyed by plugin.
 *
 * The workload methods take a plugin id as their first argument. Core supplies it from the plugin
 * context of the caller when it builds the plugin-scoped {@link CoreServiceAccountsService}, so a
 * plugin never names it and cannot reach another plugin's bindings. Core also refuses workload
 * types the plugin did not register before delegating here.
 *
 * @public
 */
export interface ServiceAccountsServiceContract
  extends Pick<CoreServiceAccountsService, 'isEnabled' | 'create'> {
  /**
   * Binds a workload to a service account, in the space of the request.
   *
   * @param pluginId - The id of the plugin that owns the workload.
   * @param request - The request, whose space the binding is created in.
   * @param params - The parameters.
   * @returns The workload binding.
   */
  bindWorkload(
    pluginId: string,
    request: KibanaRequest,
    params: BindServiceAccountWorkloadParams
  ): Promise<ServiceAccountWorkloadBinding>;

  /**
   * Unbinds a workload from a service account, in the space of the request.
   * @param pluginId - The id of the plugin that owns the workload.
   * @param request - The request, whose space the binding is removed from.
   * @param params - The parameters.
   * @returns Whether a binding existed and was removed.
   */
  unbindWorkload(
    pluginId: string,
    request: KibanaRequest,
    params: ServiceAccountWorkloadRef
  ): Promise<boolean>;

  /**
   * Retrieves a workload binding.
   * @param pluginId - The id of the plugin that owns the workload.
   * @param params - The parameters.
   * @returns The workload binding.
   */
  getWorkloadBinding(
    pluginId: string,
    params: ServiceAccountWorkloadCoordinates
  ): Promise<ServiceAccountWorkloadBinding | null>;

  /**
   * Executes a function for a workload, scoped to the Service Account.
   * @param pluginId - The id of the plugin that owns the workload.
   * @param params - The parameters for the workload.
   * @param fn - The function to execute.
   * @returns The result of the function.
   */
  withScopedRequestForWorkload<T>(
    pluginId: string,
    params: ServiceAccountWorkloadRequestParams,
    fn: (request: KibanaRequest) => Promise<T>
  ): Promise<T>;
}

/**
 * A bound workload, as {@link CoreSecurityDelegateServiceAccounts.resolveBoundWorkloads} takes it.
 *
 * @public
 */
export type ServiceAccountBoundWorkloadRef = Pick<
  ServiceAccountWorkloadBinding,
  'pluginId' | 'workloadType' | 'workloadId' | 'spaceId'
>;

/**
 * A bound workload resolved by its workload type.
 *
 * @public
 */
export interface ResolvedServiceAccountWorkload {
  /** Title of the workload, when its workload type could resolve it. */
  title?: string;
  /** Link to the workload, with the base path and the space of the binding already applied. */
  href?: string;
}

/**
 * What Core exposes to the security provider about the workload types plugins register.
 *
 * @public
 */
export interface CoreSecurityDelegateServiceAccounts {
  /**
   * Returns the name a plugin registered for a workload type, or `undefined` when no loaded plugin
   * registered that type.
   */
  getWorkloadTypeName(pluginId: string, workloadType: string): string | undefined;

  /**
   * Resolves bound workloads to a title and a link through their workload types. Returns one
   * entry per binding, in the same order. Never rejects: a binding whose type has no resolver, or
   * whose resolver fails or times out, gets an empty entry.
   */
  resolveBoundWorkloads(
    bindings: ReadonlyArray<ServiceAccountBoundWorkloadRef>
  ): Promise<ResolvedServiceAccountWorkload[]>;
}

/**
 * What Core hands back to the security provider when it registers its delegate.
 *
 * @public
 */
export interface CoreSecurityDelegateHandle {
  serviceAccounts: CoreSecurityDelegateServiceAccounts;
}
