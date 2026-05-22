/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution } from '@kbn/workflows';
import { WORKFLOW_EXECUTION_FAILED_TRIGGER_ID } from '@kbn/workflows-extensions/server';
import type { WorkflowExecutionFailedEvent } from '@kbn/workflows-extensions/server';
import type { FailedStepContext } from '../workflow_context_manager/workflow_execution_state';

/**
 * Builds the workflow_execution_failed event payload from a failed execution.
 */
export function buildWorkflowExecutionFailedPayload(
  execution: EsWorkflowExecution,
  failedStepContext?: FailedStepContext
): WorkflowExecutionFailedEvent {
  const stepId = failedStepContext?.stepId;
  const stepName = failedStepContext?.stepName || stepId;
  const stepExecutionId = failedStepContext?.stepExecutionId;

  const payload: WorkflowExecutionFailedEvent = {
    workflow: {
      id: execution.workflowId,
      name: execution.workflowDefinition?.name ?? '',
      spaceId: execution.spaceId ?? 'default',
      isErrorHandler: execution.triggeredBy === WORKFLOW_EXECUTION_FAILED_TRIGGER_ID,
    },
    execution: {
      id: execution.id,
      startedAt: execution.startedAt ?? execution.createdAt,
      failedAt: execution.finishedAt ?? new Date().toISOString(),
    },
    error: {
      message: execution.error?.message ?? 'Unknown error',
      ...(stepId && { stepId }),
      ...(stepName && { stepName }),
      ...(stepExecutionId && { stepExecutionId }),
    },
  };
  return payload;
}
