/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';

import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

/** Unified error type for executions abandoned after Kibana/Task Manager interruption (fail-fast recovery). */
export const TASK_RECOVERY_ERROR_TYPE = 'TaskRecoveryError' as const;

export const taskRecoveryMessages = {
  scheduledStale:
    'Execution abandoned due to recovery mechanism. Execution was created for this scheduled run but the scheduled task was interrupted before completion.',
  workflowRunInterrupted:
    'Execution abandoned due to recovery mechanism. The workflow run task was interrupted before completion (e.g. Kibana restart); the prior run is not resumed.',
} as const;

export function buildTaskAttemptsExhaustedMessage(lastError: string): string {
  return `Task Manager exhausted all attempts for this workflow run. Last error: ${lastError}`;
}

export type InterruptedWorkflowRunTaskOutcome = 'run_workflow' | 'task_complete';

/**
 * When Task Manager retries `workflow:run` (`attempts > 1`), the prior claim did not finish successfully.
 * Fail the persisted execution (same fault-tolerance model as scheduled stale recovery) so operators
 * see a terminal FAILED state instead of a stuck RUNNING execution. `waiting_for_input` is excluded
 * because resumption is human-driven via the resume API.
 */
export async function resolveInterruptedWorkflowRunTask({
  workflowExecutionRepository,
  workflowRunId,
  spaceId,
  taskAttempts,
  logger,
}: {
  workflowExecutionRepository: WorkflowExecutionRepository;
  workflowRunId: string;
  spaceId: string;
  taskAttempts: number;
  logger: Logger;
}): Promise<InterruptedWorkflowRunTaskOutcome> {
  if (taskAttempts <= 1) {
    return 'run_workflow';
  }

  const execution = await workflowExecutionRepository.getWorkflowExecutionById(
    workflowRunId,
    spaceId
  );

  if (!execution) {
    logger.warn(
      `workflow:run retry (attempts=${taskAttempts}) but no execution document for ${workflowRunId}; continuing run`
    );
    return 'run_workflow';
  }

  if (!shouldFailOnWorkflowRunRetry(execution, taskAttempts)) {
    if (execution.status === ExecutionStatus.WAITING_FOR_INPUT) {
      logger.warn(
        `workflow:run retry for execution ${workflowRunId} while status is waiting_for_input; leaving execution unchanged (human resume only)`
      );
    }
    return 'task_complete';
  }

  await markExecutionFailedTaskRecovery(workflowExecutionRepository, workflowRunId, {
    message: taskRecoveryMessages.workflowRunInterrupted,
  });

  logger.warn(
    `Marked workflow execution ${workflowRunId} FAILED after workflow:run retry (attempts=${taskAttempts}) — prior run was interrupted`
  );

  return 'task_complete';
}

export async function markExecutionFailedTaskRecovery(
  workflowExecutionRepository: WorkflowExecutionRepository,
  executionId: string,
  {
    message,
    type = TASK_RECOVERY_ERROR_TYPE,
  }: {
    message: string;
    type?: typeof TASK_RECOVERY_ERROR_TYPE | 'TaskAttemptsExhaustedError';
  }
): Promise<void> {
  await workflowExecutionRepository.updateWorkflowExecution({
    id: executionId,
    status: ExecutionStatus.FAILED,
    error: { type, message },
  });
}

/**
 * After `workflow:run` throws on the last Task Manager attempt, mark a still-non-terminal
 * execution FAILED so it does not remain stuck if the handler exits without updating state.
 */
export async function resolveExhaustedWorkflowRunTask({
  workflowExecutionRepository,
  workflowRunId,
  spaceId,
  taskAttempts,
  maxAttempts,
  error,
  logger,
}: {
  workflowExecutionRepository: WorkflowExecutionRepository;
  workflowRunId: string;
  spaceId: string;
  taskAttempts: number;
  maxAttempts: number;
  error: unknown;
  logger: Logger;
}): Promise<void> {
  if (taskAttempts < maxAttempts) {
    return;
  }

  try {
    const execution = await workflowExecutionRepository.getWorkflowExecutionById(
      workflowRunId,
      spaceId
    );
    if (execution && !isTerminalStatus(execution.status)) {
      const lastMessage = error instanceof Error ? error.message : String(error);
      await markExecutionFailedTaskRecovery(workflowExecutionRepository, workflowRunId, {
        type: 'TaskAttemptsExhaustedError',
        message: buildTaskAttemptsExhaustedMessage(lastMessage),
      });
    }
  } catch (markFailedErr) {
    logger.error(
      `Failed to mark workflow execution ${workflowRunId} as FAILED after task attempts exhausted: ${
        markFailedErr instanceof Error ? markFailedErr.message : String(markFailedErr)
      }`
    );
  }
}

/** Exported for unit tests */
export function shouldFailOnWorkflowRunRetry(
  execution: EsWorkflowExecution | null,
  taskAttempts: number
): boolean {
  if (taskAttempts <= 1 || !execution) {
    return false;
  }
  if (isTerminalStatus(execution.status)) {
    return false;
  }
  if (execution.status === ExecutionStatus.WAITING_FOR_INPUT) {
    return false;
  }
  return true;
}
