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
  CreateServiceAccountParams,
  ServiceAccount,
  ServiceAccountBoundWorkload,
  ServiceAccountWorkloadBinding,
  ServiceAccountWorkloadCoordinates,
  ServiceAccountWorkloadRequestParams,
  ServiceAccountWorkloadRef,
} from '@kbn/core-security-common';

/**
 * A platform service, outside Kibana, that can also assume a service account a plugin creates.
 * The security plugin maps each name to that service's identity, so a caller never names a
 * principal directly. Adding a name here needs a matching entry in the security plugin.
 *
 * @public
 */
export type ServiceAccountPlatformAssumer = 'relay' | 'sandbox';

/**
 * Create parameters for server-side callers. Only the server contract accepts
 * `platformAssumers`. The HTTP route and the browser contract take {@link CreateServiceAccountParams}.
 *
 * @public
 */
export interface CreateServiceAccountServerParams extends CreateServiceAccountParams {
  /**
   * Platform services that may exchange the account for a token, in addition to this Kibana
   * project. Only supported when service accounts are backed by UIAM. Elasticsearch service
   * accounts reject a create that names any.
   */
  platformAssumers?: readonly ServiceAccountPlatformAssumer[];
}

/** @public */
export interface DeleteServiceAccountOptions {
  /**
   * Deletes the account even when workloads are still bound to it. Those workloads then fail at
   * their next token exchange until someone unbinds them.
   */
  force: boolean;
}

/**
 * What came of a delete. An account that is still bound to workloads is not deleted unless the
 * caller forces it, and the workloads that stopped it are reported back.
 *
 * @public
 */
export type DeleteServiceAccountResult =
  | { deleted: true; warnings: string[] }
  | { deleted: false; workloads: [ServiceAccountBoundWorkload, ...ServiceAccountBoundWorkload[]] };

/**
 * Core's service accounts service.
 *
 * The workload methods are scoped to the calling plugin: Core supplies the plugin's id from its
 * own plugin context, so a plugin can only address bindings of workload types it registered with
 * {@link CoreServiceAccountsSetup.registerWorkloadType}, and there is no parameter through which
 * one plugin could reach another's bindings.
 *
 * @public
 */
export interface CoreServiceAccountsService {
  /**
   * Check if service accounts are available in the current environment.
   */
  isEnabled(): boolean;

  /**
   * Create a service account with the given roles, bounded by the privileges of the user bound to
   * the provided request. Requires the `manage_security` cluster privilege.
   *
   * @param request The request whose user the service account is created on behalf of.
   * @param params The name and roles for the new service account, and any platform services that
   * may also assume it.
   */
  create(request: KibanaRequest, params: CreateServiceAccountServerParams): Promise<ServiceAccount>;

  /**
   * Deletes a service account. Requires `manage_security`. When workloads are still bound to the
   * account and `options.force` is not set, the account is kept and the result has
   * `deleted: false` with the blocking workloads. Otherwise it has `deleted: true` with any
   * warnings from the delete.
   */
  delete(
    request: KibanaRequest,
    id: string,
    params: DeleteServiceAccountOptions
  ): Promise<DeleteServiceAccountResult>;

  /**
   * Binds a service account to a workload, so that the workload runs as that account until it is
   * unbound.
   * The binding is created in the space of the request, which the returned binding reports for a
   * caller that has to name it again at execution time. Re-binding is the same call: it replaces
   * the existing binding for the workload.
   *
   * Rejects when the workload type was not registered by the calling plugin.
   */
  bindWorkload(
    request: KibanaRequest,
    params: BindServiceAccountWorkloadParams
  ): Promise<ServiceAccountWorkloadBinding>;

  /**
   * Removes the binding of a workload in the space of the request. Succeeds whether or not a binding existed, and
   * takes effect on a running execution at its next credential mint. Resolves to whether a binding
   * was removed, so a caller can tell a real unbind from a no-op (a workload deleted from the wrong
   * space, say).
   *
   * Plugins must call this from their own workload-delete path; nothing else removes a binding.
   */
  unbindWorkload(request: KibanaRequest, params: ServiceAccountWorkloadRef): Promise<boolean>;

  /**
   * Returns the workload's binding, or `null` when it has none. Throws if the stored binding fails
   * its integrity check, or if bindings are unavailable.
   */
  getWorkloadBinding(
    params: ServiceAccountWorkloadCoordinates
  ): Promise<ServiceAccountWorkloadBinding | null>;

  /**
   * Runs `fn` with a request authenticated as the workload's service account, for use with
   * `asScoped(...)` facilities. The credential is minted, replaced, and finally retired around
   * `fn`: the binding is verified before the first mint and re-checked before every replacement,
   * and once `fn` settles the request's credential is removed and can never be replaced again, so a
   * request kept past `fn` is refused by Elasticsearch rather than allowed to keep acting.
   *
   * Rejects when the workload has no binding (a 404), its account differs from
   * expectedServiceAccountId (a 403), `executionId` is empty or longer than a workload ID, or
   * bindings are unavailable. On the Elasticsearch backend it also rejects when Kibana refuses the
   * account's stored credential (a 403), or when that credential is missing (a 404).
   */
  withScopedRequestForWorkload<T>(
    params: ServiceAccountWorkloadRequestParams,
    fn: (request: KibanaRequest) => Promise<T>
  ): Promise<T>;
}
