/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Parameters for creating a service account.
 *
 * @public
 */
export interface CreateServiceAccountParams {
  name: string;
  /**
   * Role names that bound the new account's privileges. Required and non-empty: an account is
   * never given its creator's privileges by default, since a workload inheriting whatever its
   * last editor could do is the model service accounts exist to replace.
   */
  roles: string[];
}

/**
 * The principal that bound a service account to a workload. Always the most specific stable
 * identifier available for whatever actually acted: a machine identity, else the credential, else
 * the user.
 *
 * @public
 */
export type ServiceAccountWorkloadBinder =
  | {
      type: 'user';
      username: string;
      userProfileId?: string;
    }
  | {
      type: 'api_key';
      apiKeyId: string;
      variant: 'stack' | 'uiam';
      userProfileId?: string;
    }
  | { type: 'service_account'; serviceAccountId: string };

/**
 * A persisted binding of a service account to a workload. The workload belongs to a workload type
 * registered by the plugin identified by `pluginId`.
 *
 * @public
 */
export interface ServiceAccountWorkloadBinding {
  pluginId: string;
  workloadType: string;
  workloadId: string;
  serviceAccountId: string;
  spaceId: string;
  boundBy: ServiceAccountWorkloadBinder;
  /** ISO-8601 timestamp of the bind. */
  boundAt: string;
}

/**
 * Names a workload within the space of the request that is acting on it. Used by the paths that
 * change a binding, which take the space from the authenticated request.
 *
 * @public
 */
export interface ServiceAccountWorkloadRef {
  /** Kind of workload within the plugin, e.g. `rule` or `workflow`. */
  workloadType: string;
  workloadId: string;
}

/**
 * Fully identifies a workload, space included. Workload IDs are not guaranteed unique across
 * spaces, so the space is part of a binding's identity.
 *
 * @public
 */
export interface ServiceAccountWorkloadCoordinates extends ServiceAccountWorkloadRef {
  /** The space the workload lives in. */
  spaceId: string;
}

/**
 * Parameters for binding a service account to a workload. The binding is created in the space of
 * the request, and the returned {@link ServiceAccountWorkloadBinding} reports which space that
 * was, for a caller that has to name it again later.
 *
 * @public
 */
export interface BindServiceAccountWorkloadParams extends ServiceAccountWorkloadRef {
  serviceAccountId: string;
}

/**
 * A service account.
 *
 * @public
 */
export interface ServiceAccount {
  /**
   * Unique identifier for the account.
   * Its internal structure differs between backends and must not be parsed by clients.
   */
  id: string;
  /** The name the account was created with. */
  name: string;
  /** The role names the account was created with. See {@link CreateServiceAccountParams.roles}. */
  roles: string[];
}
