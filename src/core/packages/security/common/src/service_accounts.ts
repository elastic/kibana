/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Upper bound on a service account ID. Bindings are looked up by the account they name, to answer
 * "what would break if this account went away?", and an ID longer than the index keeps would make
 * its bindings invisible to that lookup.
 *
 * @public
 */
export const SERVICE_ACCOUNT_ID_MAX_LENGTH = 1024;

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
 * One change in a bulk update of workload bindings. `bind` binds the workload to the account,
 * replacing any binding it has. `unbind` removes the workload's binding. Unbinding is named
 * explicitly, never inferred from a missing account, so a caller that loses track of an account
 * cannot silently drop a workload to no identity at all.
 *
 * @public
 */
export type ServiceAccountWorkloadBindingChange =
  | ({ op: 'bind' } & BindServiceAccountWorkloadParams)
  | ({ op: 'unbind' } & ServiceAccountWorkloadRef);

/**
 * Why one change in a bulk update of workload bindings was not applied. Safe to return to the
 * caller's own client: a failure that is not a client error carries a generic message, and its
 * details are only logged.
 *
 * @public
 */
export interface ServiceAccountWorkloadBindingChangeError {
  /** The HTTP status code the change would have failed with on its own, e.g. `403`. */
  statusCode: number;
  message: string;
}

/**
 * The outcome of one change in a bulk update of workload bindings. Each result names the workload
 * and the operation of the change it reports on.
 *
 * `previousServiceAccountId` is the account the workload was bound to when the change read its
 * binding. It is absent when the workload had no binding, or when its binding failed integrity
 * verification and so cannot be trusted to name an account. It is for information only, never a
 * target to restore: the read comes before the write, so a concurrent change to the same workload
 * can land in between, and restoring it would undo that change. A caller that has to undo a change
 * reads the binding again with `getWorkloadBinding`, and changes it only while it still equals the
 * `binding` the change returned.
 *
 * @public
 */
export type ServiceAccountWorkloadBindingChangeResult =
  | (ServiceAccountWorkloadRef & {
      op: 'bind';
      ok: true;
      binding: ServiceAccountWorkloadBinding;
      previousServiceAccountId?: string;
    })
  | (ServiceAccountWorkloadRef & {
      op: 'unbind';
      ok: true;
      /** Whether a binding existed and was removed. */
      removed: boolean;
      previousServiceAccountId?: string;
    })
  | (ServiceAccountWorkloadRef & {
      op: ServiceAccountWorkloadBindingChange['op'];
      ok: false;
      error: ServiceAccountWorkloadBindingChangeError;
    });

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

/**
 * The parts of a service account that name it, for showing which account a workload runs as to
 * users who may see the workload but not manage service accounts. Deliberately smaller than
 * {@link ServiceAccount}: roles and description stay with the users who manage accounts.
 *
 * @public
 */
export interface ServiceAccountSummary {
  /** See {@link ServiceAccount.id}. */
  id: string;
  /** See {@link ServiceAccount.name}. */
  name: string;
  /**
   * Whether the account can authenticate. Always `true` on Serverless for now, because UIAM does
   * not yet report whether an account is disabled.
   */
  enabled: boolean;
  /**
   * Whether this Kibana expects to be able to run as the account, judged without asking the
   * account's identity provider. On Elasticsearch, that means Kibana holds a credential for it,
   * which can be stale for an account that was deleted and recreated outside Kibana. On
   * Serverless, it is always `true`, because UIAM only returns accounts that this project may
   * assume.
   */
  assumable: boolean;
}
