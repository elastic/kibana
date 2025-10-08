/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowGraph } from '@kbn/workflows/graph';
import type { Client } from '@elastic/elasticsearch';
import type { KibanaRequest } from '@kbn/core/server';
import type { CoreStart } from '@kbn/core/server';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { WorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';
import type { WorkflowExecutionState } from '../workflow_context_manager/workflow_execution_state';
import type { NodesFactory } from '../step/nodes_factory';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

export interface WorkflowExecutionLoopParams {
  workflowExecutionGraph: WorkflowGraph;
  workflowRuntime: WorkflowExecutionRuntimeManager;
  workflowExecutionState: WorkflowExecutionState;
  workflowLogger: WorkflowEventLogger;
  workflowExecutionRepository: WorkflowExecutionRepository;
  nodesFactory: NodesFactory;
  esClient: Client;
  fakeRequest: KibanaRequest<unknown, unknown, unknown, any>;
  coreStart: CoreStart;
  taskAbortController: AbortController;
}
