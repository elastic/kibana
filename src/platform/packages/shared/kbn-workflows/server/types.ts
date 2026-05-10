/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CustomRequestHandlerContext, KibanaRequest } from '@kbn/core/server';
import type { ManagedWorkflowId } from '../managed';

export interface ManagedWorkflowOperationOptions {
  spaceId: string;
  workflowId?: string;
  workflowIdSuffix?: string;
  values?: Record<string, unknown>;
}

export interface ExecuteManagedWorkflowOptions extends ManagedWorkflowOperationOptions {
  inputs?: Record<string, unknown>;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}

export interface RegisteredManagedWorkflowsLifecycleApi {
  install: (id: ManagedWorkflowId, options: ManagedWorkflowOperationOptions) => Promise<void>;
  uninstall: (id: ManagedWorkflowId, options: ManagedWorkflowOperationOptions) => Promise<void>;
}

export interface RegisteredManagedWorkflowsApi extends RegisteredManagedWorkflowsLifecycleApi {
  execute: (id: ManagedWorkflowId, options: ExecuteManagedWorkflowOptions) => Promise<string>;
}

export interface ManagedWorkflowsApi {
  install: (
    pluginId: string,
    id: ManagedWorkflowId,
    options: ManagedWorkflowOperationOptions
  ) => Promise<void>;
  uninstall: (
    pluginId: string,
    id: ManagedWorkflowId,
    options: ManagedWorkflowOperationOptions
  ) => Promise<void>;
  execute: (
    pluginId: string,
    id: ManagedWorkflowId,
    options: ExecuteManagedWorkflowOptions
  ) => Promise<string>;
}

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
