/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { WORKFLOW_EXECUTION_FAILED_TRIGGER_ID } from '@kbn/workflows-extensions/server';
import { buildWorkflowExecutionFailedPayload } from './build_workflow_execution_failed_payload';
import type { EmitEvent } from '../trigger_events';
import type { FailedStepContext } from '../workflow_context_manager/workflow_execution_state';

export interface WorkflowRuntimeForEmit {
  getWorkflowExecutionStatus(): ExecutionStatus;
  getWorkflowExecution(): EsWorkflowExecution;
}

export interface WorkflowExecutionStateForEmit {
  getLastFailedStepContext(): FailedStepContext | undefined;
}

/**
 * If the current run ended in FAILED and is not a test run, builds the
 * workflow_execution_failed payload from in-memory state and emits it via
 * emitEvent. Logs a warning on emit failure; does not throw.
 */
export async function emitWorkflowExecutionFailedEventIfFailed(params: {
  workflowRuntime: WorkflowRuntimeForEmit;
  workflowExecutionState: WorkflowExecutionStateForEmit;
  emitEvent: EmitEvent;
  request: KibanaRequest;
  logger: Logger;
  workflowRunId: string;
}): Promise<void> {
  const { workflowRuntime, workflowExecutionState, emitEvent, request, logger, workflowRunId } =
    params;

  try {
    if (workflowRuntime.getWorkflowExecutionStatus() !== ExecutionStatus.FAILED) {
      return;
    }
    const execution = workflowRuntime.getWorkflowExecution();
    if (execution.isTestRun) {
      return;
    }
    const payload = buildWorkflowExecutionFailedPayload(
      execution,
      workflowExecutionState.getLastFailedStepContext()
    );
    await emitEvent({
      triggerId: WORKFLOW_EXECUTION_FAILED_TRIGGER_ID,
      payload,
      request,
    });
  } catch (err) {
    logger.warn(
      `Failed to emit workflow execution failed event (execution=${workflowRunId}): ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}
