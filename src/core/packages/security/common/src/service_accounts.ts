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
   * Free text of up to 1,000 characters that describes the account. Kibana trims leading and
   * trailing whitespace, and treats a blank description as no description.
   */
  description?: string;
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
 * A workload bound to a service account, as reported to the account's management surfaces. The
 * workload type is scoped to the plugin that registered it, so `pluginId` and `workloadType` name
 * the type together.
 *
 * @public
 */
export interface ServiceAccountBoundWorkload {
  pluginId: string;
  workloadType: string;
  workloadId: string;
  /**
   * What to call the workload in the UI: the title its workload type resolved, or the workload id
   * when there is none.
   */
  displayName: string;
  /**
   * The name the owning plugin registered for the workload type. Absent when that plugin is not
   * loaded, in which case the UI shows `workloadType`.
   */
  typeName?: string;
  /**
   * Link to the workload. It already carries the base path and the space of the binding, so use
   * it as is.
   */
  href?: string;
}

/** Parameters for minting credentials for a workload, optionally pinned to an account. @public */
export interface ServiceAccountWorkloadRequestParams extends ServiceAccountWorkloadCoordinates {
  /** Reject before minting if the verified binding points to another account. */
  expectedServiceAccountId?: string;
  /**
   * The id of this run of the workload in the calling plugin's own records, such as a workflow
   * execution id. Recorded on the run's `service_account_assume` audit events; the other events of
   * the run share their `trace.id`. Held to the same length limit as a workload ID.
   */
  executionId?: string;
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
  /** The description the account was created with. It is absent when the account has none. */
  description?: string;
  /** The role names the account was created with. See {@link CreateServiceAccountParams.roles}. */
  roles: string[];
}
