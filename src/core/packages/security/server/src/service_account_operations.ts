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

/**
 * Operation types must be lowercase alphanumeric with underscores, and no longer than
 * {@link SERVICE_ACCOUNT_OPERATION_TYPE_MAX_LENGTH}. The type appears in a binding's saved object
 * ID and its authenticated attributes, so the accepted shape is kept deliberately narrow.
 *
 * @public
 */
export const SERVICE_ACCOUNT_OPERATION_TYPE_REGEX = /^[a-z0-9_]+$/;

/**
 * @public
 */
export const SERVICE_ACCOUNT_OPERATION_TYPE_MAX_LENGTH = 256;

/**
 * Claims an operation type. One registration per type per Kibana.
 *
 * @public
 */
export interface ServiceAccountOperationRegistration {
  /**
   * Identifies the operation whose workloads run as service accounts, e.g. `alerting_rule`. Must
   * match {@link SERVICE_ACCOUNT_OPERATION_TYPE_REGEX} and be no longer than
   * {@link SERVICE_ACCOUNT_OPERATION_TYPE_MAX_LENGTH}.
   */
  type: string;
}

/**
 * Manages and runs the workload bindings of a single operation type.
 *
 * Obtained once, at plugin setup, from
 * {@link CoreServiceAccountsSetup.registerOperation}. Holding the handle *is* the authorization to
 * work with that operation's bindings: the handle closes over its own operation type, so there is
 * no parameter through which one operation could reach another's bindings, and no way to name a
 * service account directly on an execution path.
 *
 * @public
 */
export interface ServiceAccountOperationHandle {
  /**
   * Attaches a service account to a workload, so that the workload runs as that account until it
   * is detached.
   */
  attach(
    request: KibanaRequest,
    params: AttachServiceAccountWorkloadParams
  ): Promise<ServiceAccountWorkloadBinding>;

  /**
   * Removes a workload's binding. Succeeds whether or not a binding existed,
   * and takes effect on a running execution at its next credential mint.
   */
  detach(
    request: KibanaRequest,
    params: { workloadType: string; workloadId: string }
  ): Promise<void>;

  /**
   * Returns the workload's binding, or `null` when it has none. Throws if the stored binding fails
   * its integrity check.
   */
  getBinding(
    params: ServiceAccountWorkloadCoordinates
  ): Promise<ServiceAccountWorkloadBinding | null>;

  /**
   * Runs `fn` with a request authenticated as the workload's service account, for use with
   * `asScoped(...)` facilities. The credential is minted, replaced, and finally retired around
   * `fn`: it is re-checked against the binding before every mint, and once `fn` settles the
   * request can never be re-credentialed again.
   *
   * Rejects when the workload has no binding, rather than running unauthenticated.
   */
  withScopedRequest<T>(
    params: ServiceAccountWorkloadCoordinates,
    fn: (request: KibanaRequest) => Promise<T>
  ): Promise<T>;
}

/**
 * Setup contract of Core's service accounts service.
 *
 * @public
 */
export interface CoreServiceAccountsSetup {
  /**
   * Claims an operation type and returns the handle for working with its workload bindings.
   *
   * Call once, from the owning plugin's `setup`. Registering a type twice throws, so an operation
   * has exactly one owner.
   */
  registerOperation(
    registration: ServiceAccountOperationRegistration
  ): ServiceAccountOperationHandle;
}
