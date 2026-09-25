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
  ServiceAccountWorkloadBinding,
  ServiceAccountWorkloadCoordinates,
  ServiceAccountWorkloadRef,
} from '@kbn/core-security-common';

/**
 * Platform assumers Kibana may place on a service account. The security plugin
 * resolves each name to an id; callers cannot supply a raw principal.
 *
 * @public
 */
export const TRUSTED_PLATFORM_SERVICE_ACCOUNTS = ['relay'] as const;

/** @public */
export type TrustedPlatformServiceAccountName = (typeof TRUSTED_PLATFORM_SERVICE_ACCOUNTS)[number];

/**
 * Server-side create parameters. `trustedPlatformAssumers` is not part of the
 * HTTP body: that schema stays `{ name }` and rejects anything else.
 *
 * @public
 */
export interface CreateServiceAccountServerParams extends CreateServiceAccountParams {
  trustedPlatformAssumers?: readonly TrustedPlatformServiceAccountName[];
}

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
   * Rejects unless this request may use a service account, including one already
   * stored. Possession of an id is not authorization. The gate is `manage_security`,
   * the same one as {@link CoreServiceAccountsService.create}. This does not mint a
   * token, and it cannot re-bound privileges UIAM snapshotted at creation.
   */
  authorize(request: KibanaRequest): Promise<void>;

  /**
   * Create a service account whose privileges are bounded by those of the user
   * bound to the provided request.
   *
   * @param request The request whose user the service account is created on behalf of.
   * @param params The name, plus any named platform assumers. Assumer ids are resolved
   * in the security plugin and are not accepted from an HTTP body.
   */
  create(request: KibanaRequest, params: CreateServiceAccountServerParams): Promise<ServiceAccount>;

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
   * Rejects when the workload has no binding (a 404), and whenever bindings are unavailable.
   */
  withScopedRequestForWorkload<T>(
    params: ServiceAccountWorkloadCoordinates,
    fn: (request: KibanaRequest) => Promise<T>
  ): Promise<T>;
}
