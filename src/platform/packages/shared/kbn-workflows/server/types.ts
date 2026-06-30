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

export type GetManagedWorkflowStatusOptions = ManagedWorkflowOperationOptions;

/**
 * Requestless lifecycle API returned by the managed workflows system provider.
 */
export interface RegisteredManagedWorkflowsLifecycleApi {
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

/**
 * Plugin-bound API for managed workflow operations that do not require a Kibana request.
 */
export interface RegisteredManagedWorkflowsApi extends RegisteredManagedWorkflowsLifecycleApi {
  execute: (id: ManagedWorkflowId, options: ExecuteManagedWorkflowOptions) => Promise<string>;
}

/**
 * Request-scoped workflows client API; pluginId is supplied by workflows_extensions.
 */
export interface ManagedWorkflowsApi {
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
export interface PluginScopedManagedWorkflowsApi extends RegisteredManagedWorkflowsLifecycleApi {
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
) => Promise<RegisteredManagedWorkflowsLifecycleApi>;
