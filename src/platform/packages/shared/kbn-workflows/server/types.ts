/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CustomRequestHandlerContext, KibanaRequest } from '@kbn/core/server';

/**
 * The workflows client.
 * This is the public interface for workflows operations that can be used by any plugin.
 * It is registered to the `workflows` API request context, and exposed by `workflowsExtensions` plugin in its start contract.
 */
export interface WorkflowsClient {
  isWorkflowsAvailable: boolean;
  emitEvent: (triggerId: string, payload: Record<string, unknown>) => Promise<void>;
}

// Exporting using Kibana naming convention
export type WorkflowsApiRequestHandlerContext = WorkflowsClient;

export type WorkflowsRequestHandlerContext = CustomRequestHandlerContext<{
  workflows: WorkflowsApiRequestHandlerContext;
}>;

export type WorkflowsClientProvider = (request: KibanaRequest) => Promise<WorkflowsClient>;
