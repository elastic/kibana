/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CustomRequestHandlerContext, KibanaRequest } from '@kbn/core/server';
import type { ManagedWorkflowId, ManagedWorkflowTemplateValuesForId } from '../managed';

interface ManagedWorkflowOperationBaseOptions {
  spaceId: string;
  workflowId?: string;
  workflowIdSuffix?: string;
}

type ManagedWorkflowValuesOption<TId extends ManagedWorkflowId> =
  ManagedWorkflowTemplateValuesForId<TId> extends never
    ? {
        values?: never;
      }
    : {
        values?: ManagedWorkflowTemplateValuesForId<TId>;
      };

export type ManagedWorkflowOperationOptions<TId extends ManagedWorkflowId = ManagedWorkflowId> =
  ManagedWorkflowOperationBaseOptions & ManagedWorkflowValuesOption<TId>;

export type ExecuteManagedWorkflowOptions<TId extends ManagedWorkflowId = ManagedWorkflowId> = Omit<
  ManagedWorkflowOperationOptions<TId>,
  'values'
> & {
  inputs?: Record<string, unknown>;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
};

export interface RegisteredManagedWorkflowsLifecycleApi {
  install: <TId extends ManagedWorkflowId>(
    id: TId,
    options: ManagedWorkflowOperationOptions<TId>
  ) => Promise<void>;
  uninstall: <TId extends ManagedWorkflowId>(
    id: TId,
    options: ManagedWorkflowOperationOptions<TId>
  ) => Promise<void>;
  /**
   * Signal that the plugin has finished installing all its static managed workflows.
   * Triggers per-plugin reconciliation: removes persisted static workflows that were
   * not installed during the startup window (between owner registration and this call).
   *
   * Static workflow installs after ready() will log a warning.
   */
  ready: () => Promise<void>;
}

export interface RegisteredManagedWorkflowsApi extends RegisteredManagedWorkflowsLifecycleApi {
  execute: <TId extends ManagedWorkflowId>(
    id: TId,
    options: ExecuteManagedWorkflowOptions<TId>
  ) => Promise<string>;
}

export interface ManagedWorkflowsApi {
  install: <TId extends ManagedWorkflowId>(
    pluginId: string,
    id: TId,
    options: ManagedWorkflowOperationOptions<TId>
  ) => Promise<void>;
  uninstall: <TId extends ManagedWorkflowId>(
    pluginId: string,
    id: TId,
    options: ManagedWorkflowOperationOptions<TId>
  ) => Promise<void>;
  execute: <TId extends ManagedWorkflowId>(
    pluginId: string,
    id: TId,
    options: ExecuteManagedWorkflowOptions<TId>
  ) => Promise<string>;
}

export interface PluginScopedManagedWorkflowsApi extends RegisteredManagedWorkflowsLifecycleApi {
  execute: <TId extends ManagedWorkflowId>(
    request: KibanaRequest,
    id: TId,
    options: ExecuteManagedWorkflowOptions<TId>
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
