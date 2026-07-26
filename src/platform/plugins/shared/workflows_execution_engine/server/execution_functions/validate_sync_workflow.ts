/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowGraph } from '@kbn/workflows/graph';

type SyncWorkflowGraph = Pick<WorkflowGraph, 'getNode' | 'topologicalOrder'>;

// Known step types that require durable execution (timers, HITL pauses, child workflows).
// This is a pre-execution check. A runtime check in handle_execution_delay.ts provides a
// second layer by catching any waiting status that makes it through — e.g. from extension
// step types added after this list. Both layers use the same error message format so
// diagnostics are consistent.
const ASYNC_ONLY_STEP_TYPES = new Set([
  'wait',
  'waitForInput',
  'waitForApproval',
  'workflow.execute',
  'workflow.executeAsync',
]);

export const SYNC_WORKFLOW_UNSUPPORTED_MSG = 'is not supported in synchronous workflows';

export const validateSyncWorkflow = (workflowGraph: SyncWorkflowGraph): void => {
  for (const nodeId of workflowGraph.topologicalOrder) {
    const node = workflowGraph.getNode(nodeId);
    if (node?.stepType && ASYNC_ONLY_STEP_TYPES.has(node.stepType)) {
      throw new Error(`Step "${node.stepId}" (${node.stepType}) ${SYNC_WORKFLOW_UNSUPPORTED_MSG}`);
    }
  }
};
