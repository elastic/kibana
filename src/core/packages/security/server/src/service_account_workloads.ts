/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Workload types must be lowercase alphanumeric with underscores, and no longer than
 * {@link SERVICE_ACCOUNT_WORKLOAD_TYPE_MAX_LENGTH}. The type appears in a binding's saved object
 * ID and its authenticated attributes, so the accepted shape is kept deliberately narrow.
 *
 * @public
 */
export const SERVICE_ACCOUNT_WORKLOAD_TYPE_REGEX = /^[a-z0-9_]+$/;

/**
 * @public
 */
export const SERVICE_ACCOUNT_WORKLOAD_TYPE_MAX_LENGTH = 256;

/**
 * Upper bound on the human-readable name of a workload type.
 *
 * @public
 */
export const SERVICE_ACCOUNT_WORKLOAD_TYPE_NAME_MAX_LENGTH = 256;

/**
 * Upper bound on the description of a workload type.
 *
 * @public
 */
export const SERVICE_ACCOUNT_WORKLOAD_TYPE_DESCRIPTION_MAX_LENGTH = 1024;

/**
 * Upper bound on a workload ID. Workload IDs are hashed into a binding's saved object ID, so this
 * is not a storage limit; it bounds what a binding's authenticated attributes and log lines carry.
 * Wide enough for any saved object ID, which is what most workloads are keyed by.
 *
 * @public
 */
export const SERVICE_ACCOUNT_WORKLOAD_ID_MAX_LENGTH = 512;

/**
 * Declares a kind of workload that a plugin runs as service accounts.
 *
 * Workload types are scoped to the plugin that registers them: two plugins may each register a
 * `rule` type without conflict, and neither can address the other's bindings.
 *
 * @public
 */
export interface ServiceAccountWorkloadTypeRegistration {
  /**
   * Kind of workload within the plugin, e.g. `rule`. Must match
   * {@link SERVICE_ACCOUNT_WORKLOAD_TYPE_REGEX} and be no longer than
   * {@link SERVICE_ACCOUNT_WORKLOAD_TYPE_MAX_LENGTH}.
   */
  type: string;
  /**
   * Human-readable label, e.g. `Alerting rule`. Must be non-blank and no longer than
   * {@link SERVICE_ACCOUNT_WORKLOAD_TYPE_NAME_MAX_LENGTH}.
   */
  name: string;
  /**
   * Optional longer description of what the workload does. No longer than
   * {@link SERVICE_ACCOUNT_WORKLOAD_TYPE_DESCRIPTION_MAX_LENGTH}.
   */
  description?: string;
}

/**
 * Setup contract of Core's service accounts service.
 *
 * @public
 */
export interface CoreServiceAccountsSetup {
  /**
   * Declares a workload type of the calling plugin. Call once per type, from the plugin's `setup`.
   *
   * Core scopes the registration to the calling plugin, so the same type may be registered by
   * different plugins. Registering a type twice from the same plugin throws. The workload methods
   * of {@link CoreServiceAccountsService} reject any workload type the calling plugin has not
   * registered.
   */
  registerWorkloadType(registration: ServiceAccountWorkloadTypeRegistration): void;
}
