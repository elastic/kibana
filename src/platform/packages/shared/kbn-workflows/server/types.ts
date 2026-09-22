/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CustomRequestHandlerContext, KibanaRequest } from '@kbn/core/server';
import type {
  ManagedWorkflowId,
  ManagedWorkflowTemplateValues,
  ManagedWorkflowTemplateValuesForId,
} from '../managed';

interface ManagedWorkflowOperationBaseOptions {
  spaceId: string;
  workflowId?: string;
  workflowIdSuffix?: string;
}

type ManagedWorkflowInstallValuesOption<TId extends ManagedWorkflowId> =
  ManagedWorkflowTemplateValuesForId<TId> extends never
    ? {
        values?: never;
      }
    : {
        values: ManagedWorkflowTemplateValuesForId<TId>;
      };

export type ManagedWorkflowOperationOptions = ManagedWorkflowOperationBaseOptions;

export type ManagedWorkflowInstallOptions<TId extends ManagedWorkflowId> =
  ManagedWorkflowOperationBaseOptions & ManagedWorkflowInstallValuesOption<TId>;

// Service installs can reuse persisted template values during reconciliation.
export type ManagedWorkflowServiceInstallOptions = ManagedWorkflowOperationBaseOptions & {
  values?: ManagedWorkflowTemplateValues;
};

export type ExecuteManagedWorkflowOptions = ManagedWorkflowOperationOptions & {
  inputs?: Record<string, unknown>;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
};

export type ManagedWorkflowStatus =
  | 'intact'
  | 'missing'
  | 'disabled'
  | 'invalid'
  | 'drifted'
  | 'not_managed';

export interface ManagedWorkflowStatusReport {
  status: ManagedWorkflowStatus;
  workflowId: string;
  definitionId: ManagedWorkflowId;
  spaceId: string;
  installed: boolean;
  enabled: boolean | null;
  valid: boolean | null;
  managedBy: string | null;
  storedVersion: number | null;
  registryVersion: number;
  storedHash: string | null;
  registryHash: string;
}

/** Persisted state exposed only to the plugin that owns the managed workflow. */
export interface ManagedWorkflowInstanceState {
  workflowId: string;
  spaceId: string;
  definitionId: string | null;
  templateValues: ManagedWorkflowTemplateValues | null;
  documentVersion: number | null;
}

export type GetManagedWorkflowStatusOptions = ManagedWorkflowOperationOptions;

/** Persisted managed-workflow state available only through an owner-bound client. */
export interface ManagedWorkflowStateApi {
  /** Read one persisted managed workflow instance owned by this plugin. */
  getInstalledWorkflowState: (
    workflowId: string,
    spaceId: string
  ) => Promise<ManagedWorkflowInstanceState | null>;
  /** Read all persisted managed workflow instances owned by this plugin across spaces. */
  listInstalledWorkflowStates: () => Promise<ManagedWorkflowInstanceState[]>;
}

/**
 * Requestless lifecycle API returned by the managed workflows system provider
 * (`initManagedWorkflowsClient` / `ManagedWorkflowsSystemApiProvider`).
 *
 * `install` and `ready` are best-effort: they resolve without throwing when Workflows
 * is unavailable, Kibana is stopping, or Elasticsearch readiness gating skips the
 * write. A resolved `Promise<void>` does **not** guarantee the workflow was persisted
 * or that orphan reconciliation ran. Missing installs are retried on a later boot;
 * when any install for the plugin was incomplete this boot, `ready()` skips destructive
 * orphan cleanup so still-desired docs are not force-deleted, but still runs dynamic
 * auto upgrades once Elasticsearch readiness has passed.
 */
export interface RegisteredManagedWorkflowsLifecycleApi {
  /**
   * Install or update a managed workflow instance for this plugin.
   * May no-op (resolve without persisting) when Workflows is unavailable, Kibana is
   * stopping, or ES is not ready for managed writes.
   */
  install: <TId extends ManagedWorkflowId>(
    id: TId,
    options: ManagedWorkflowInstallOptions<TId>
  ) => Promise<void>;
  uninstall: <TId extends ManagedWorkflowId>(
    id: TId,
    options: ManagedWorkflowOperationOptions
  ) => Promise<void>;
  /**
   * Signal that the plugin has finished installing all its static managed workflows.
   * Triggers per-plugin reconciliation: removes persisted static workflows that were
   * not installed during the startup window (between owner registration and this call).
   *
   * Best-effort: may no-op when Workflows is unavailable, Kibana is stopping, or ES is
   * not ready. When installs were gated or aborted incomplete this boot, destructive
   * orphan cleanup is skipped so persisted workflows are preserved (missing installs
   * retry on a later boot); dynamic auto upgrades still run once readiness passed.
   * Static workflow installs after ready() will log a warning.
   */
  ready: () => Promise<void>;
  /**
   * Read-only pre-flight status for an installed managed workflow instance.
   *
   * Validates that the calling plugin owns the registered definition before
   * reading storage. If several problems apply, the returned status follows
   * this priority: missing, not_managed, invalid, disabled, drifted, intact.
   */
  getWorkflowStatus: <TId extends ManagedWorkflowId>(
    id: TId,
    options: GetManagedWorkflowStatusOptions
  ) => Promise<ManagedWorkflowStatusReport>;
}

export interface ManagedWorkflowsSystemApi
  extends RegisteredManagedWorkflowsLifecycleApi,
    ManagedWorkflowStateApi {}

/**
 * Plugin-bound API for managed workflow operations that do not require a Kibana request.
 */
export interface RegisteredManagedWorkflowsApi extends RegisteredManagedWorkflowsLifecycleApi {
  execute: (id: ManagedWorkflowId, options: ExecuteManagedWorkflowOptions) => Promise<string>;
}

/**
 * Request-scoped workflows client API; pluginId is supplied by workflows_extensions.
 *
 * `install` is best-effort (same semantics as {@link RegisteredManagedWorkflowsLifecycleApi}).
 */
export interface ManagedWorkflowsApi {
  /**
   * Install or update a managed workflow. May no-op when Workflows is unavailable,
   * Kibana is stopping, or ES readiness gating skips the write — resolve ≠ persisted.
   */
  install: <TId extends ManagedWorkflowId>(
    pluginId: string,
    id: TId,
    options: ManagedWorkflowInstallOptions<TId>
  ) => Promise<void>;
  uninstall: <TId extends ManagedWorkflowId>(
    pluginId: string,
    id: TId,
    options: ManagedWorkflowOperationOptions
  ) => Promise<void>;
  getWorkflowStatus: <TId extends ManagedWorkflowId>(
    pluginId: string,
    id: TId,
    options: GetManagedWorkflowStatusOptions
  ) => Promise<ManagedWorkflowStatusReport>;
  execute: (
    pluginId: string,
    id: ManagedWorkflowId,
    options: ExecuteManagedWorkflowOptions
  ) => Promise<string>;
}

/**
 * Consumer-facing managed workflows client returned by workflows_extensions.
 */
export interface PluginScopedManagedWorkflowsApi
  extends RegisteredManagedWorkflowsLifecycleApi,
    ManagedWorkflowStateApi {
  execute: (
    request: KibanaRequest,
    id: ManagedWorkflowId,
    options: ExecuteManagedWorkflowOptions
  ) => Promise<string>;
}

/**
 * The workflows client.
 * This is the public interface for workflows operations that can be used by any plugin.
 * It is registered to the `workflows` API request context, and exposed by `workflowsExtensions` plugin in its start contract.
 */
export interface WorkflowsClient {
  isWorkflowsAvailable: boolean;
  emitEvent: (triggerId: string, payload: Record<string, unknown>) => Promise<void>;
  managedWorkflows: ManagedWorkflowsApi;
}

// Exporting using Kibana naming convention
export type WorkflowsApiRequestHandlerContext = WorkflowsClient;

export type WorkflowsRequestHandlerContext = CustomRequestHandlerContext<{
  workflows: WorkflowsApiRequestHandlerContext;
}>;

export type WorkflowsClientProvider = (request: KibanaRequest) => Promise<WorkflowsClient>;
export type ManagedWorkflowsSystemApiProvider = (
  pluginId: string
) => Promise<ManagedWorkflowsSystemApi>;
