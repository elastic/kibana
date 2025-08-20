/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { StepFactory } from './step/step_factory';
import type { WorkflowExecutionRuntimeManager } from './workflow_context_manager/workflow_execution_runtime_manager';
import type { WorkflowEventLogger } from './workflow_event_logger/workflow_event_logger';
import type { StepErrorCatcher } from './step/step_base';

export async function workflowExecutionLoop(
  workflowRuntime: WorkflowExecutionRuntimeManager,
  workflowLogger: WorkflowEventLogger,
  nodesFactory: StepFactory
) {
  while (workflowRuntime.getWorkflowExecutionStatus() === ExecutionStatus.RUNNING) {
    const currentNode = workflowRuntime.getCurrentStep();
    const step = nodesFactory.create(currentNode as any);

    try {
      await step.run();
    } catch (error) {
      workflowRuntime.setWorkflowError(error);
    } finally {
      await catchError(workflowRuntime, workflowLogger, nodesFactory);
      await workflowRuntime.saveState(); // Ensure state is updated after each step
      await workflowLogger.flushEvents();
    }
  }
}

async function catchError(
  workflowRuntime: WorkflowExecutionRuntimeManager,
  workflowLogger: WorkflowEventLogger,
  nodesFactory: StepFactory
) {
  try {
    const stack = [...workflowRuntime.getWorkflowExecution().stack];

    while (workflowRuntime.getWorkflowExecution().error && stack.length > 0) {
      const nodeId = stack.pop()!;
      const node = workflowRuntime.getNode(nodeId);
      const stepImplementation = nodesFactory.create(node as any);

      if ((stepImplementation as unknown as StepErrorCatcher).catchError) {
        await (stepImplementation as unknown as StepErrorCatcher).catchError();
      }

      if (workflowRuntime.getWorkflowExecution().error) {
        workflowRuntime.failStep(nodeId, workflowRuntime.getWorkflowExecution().error!);
      }
    }
  } catch (error) {
    workflowRuntime.setWorkflowError(error);
    workflowLogger.logError(
      `Error in catchError: ${error.message}. Workflow execution may be in an inconsistent state.`
    );
  }
}
