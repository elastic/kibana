/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';

export interface HookResult {
  status: 'completed' | 'pass_through' | 'failed';
  output: Record<string, unknown>;
  error?: string;
}

/**
 * A synchronous hook handler registered for a trigger.
 * Receives the current payload and an optional capabilities map, and returns a
 * (possibly modified) payload. In chained mode the output of handler N becomes
 * the input to handler N+1. Capabilities are opaque to the YAML layer — they
 * carry call-scoped objects (e.g. AnonymizationContext) that handlers can use
 * without surfacing sensitive material in the workflow event.
 */
export type HookHandler = (
  payload: Record<string, unknown>,
  capabilities?: Record<string, unknown>
) => Promise<Record<string, unknown>>;

/**
 * The workflows client.
 * This is the public interface for workflows operations that can be used by any plugin.
 * It is registered to the `workflows` API request context, and exposed by `workflowsExtensions` plugin in its start contract.
 */
export interface WorkflowsClient {
  isWorkflowsAvailable: boolean;
  emitEvent: (triggerId: string, payload: Record<string, unknown>) => Promise<void>;
  /**
   * Invoke a synchronous hook for a trigger that has a `sync` block defined.
   * All registered handlers run inline (no task manager), in registration order.
   * Returns the final output payload after all handlers have run.
   *
   * `capabilities` is an opaque map of call-scoped objects (e.g. AnonymizationContext)
   * passed to handlers without appearing in the YAML event payload.
   *
   * Throws if the trigger was not registered with a `sync` block.
   */
  invokeHook: (
    triggerId: string,
    payload: Record<string, unknown>,
    capabilities?: Record<string, unknown>
  ) => Promise<HookResult>;
}

// Exporting using Kibana naming convention
export type WorkflowsApiRequestHandlerContext = WorkflowsClient;

export type WorkflowsClientProvider = (request: KibanaRequest) => Promise<WorkflowsClient>;
