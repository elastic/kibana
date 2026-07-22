/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

<<<<<<< HEAD
import { type BaseStepDefinition, getBuiltInStepDefinition } from '@kbn/workflows';
=======
>>>>>>> b2c2244a48b2 ([Workflows] Add synchronous execution mode)
import type { WorkflowGraph } from '@kbn/workflows/graph';

type SyncWorkflowGraph = Pick<WorkflowGraph, 'getNode' | 'topologicalOrder'>;

<<<<<<< HEAD
type GetExtensionStepDefinition = (stepType: string) => BaseStepDefinition | undefined;

// Shared by the runtime check in handle_execution_delay.ts so both layers produce
// identical diagnostics.
export const SYNC_WORKFLOW_UNSUPPORTED_MSG = 'is not supported in synchronous workflows';

export const validateSyncWorkflow = (
  workflowGraph: SyncWorkflowGraph,
  getExtensionStepDefinition: GetExtensionStepDefinition
): void => {
  for (const nodeId of workflowGraph.topologicalOrder) {
    const node = workflowGraph.getNode(nodeId);
    if (node?.stepType) {
      const definition =
        getBuiltInStepDefinition(node.stepType) ?? getExtensionStepDefinition(node.stepType);
      if (definition?.supportedExecutionModes?.includes('sync') === false) {
        throw new Error(`Step "${node.stepId}" (${node.stepType}) ${SYNC_WORKFLOW_UNSUPPORTED_MSG}`);
      }
=======
const ASYNC_ONLY_STEP_TYPES = new Set([
  'wait',
  'waitForInput',
  'waitForApproval',
  'workflow.execute',
  'workflow.executeAsync',
]);

export const validateSyncWorkflow = (workflowGraph: SyncWorkflowGraph): void => {
  for (const nodeId of workflowGraph.topologicalOrder) {
    const node = workflowGraph.getNode(nodeId);
    if (node?.stepType && ASYNC_ONLY_STEP_TYPES.has(node.stepType)) {
      throw new Error(
        `Step "${node.stepId}" (${node.stepType}) is not supported in synchronous workflows`
      );
>>>>>>> b2c2244a48b2 ([Workflows] Add synchronous execution mode)
    }
  }
};
