/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as generateUuid } from 'uuid';
import type { Logger } from '@kbn/core/server';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { EsWorkflowExecution, WorkflowExecutionEngineModel } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';

import { markExecutionFailedTaskRecovery, taskRecoveryMessages } from '../lib/task_recovery';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

/**
 * Checks if there's an existing non-terminal scheduled execution for a workflow.
 *
 * We use the task's `runAt` to link executions to specific scheduled runs:
 * - `runAt` represents the scheduled time for this specific run of a recurring task
 * - Each scheduled run has a unique `runAt` value (calculated from the previous run's completion)
 * - `runAt` is only updated AFTER a task completes successfully (or fails with retry)
 * - If a task is interrupted/recovered BEFORE completion, `runAt` stays the same
 *
 * Logic:
 * - If execution's `taskRunAt` matches current task's `runAt` AND `attempts > 1`:
 *   → Execution was created for THIS scheduled run but is still PENDING/RUNNING
 *   → `attempts > 1` means this is a retry/recovery (not the first attempt)
 *   → The execution is stale from a previous attempt and will never complete
 *   → If `waiting_for_input`, skip this tick only (human resume; do not fail the execution)
 *   → Else mark execution as FAILED (TaskRecoveryError) and proceed with a new execution for this tick
 *
 * - If execution's `taskRunAt` differs from current task's `runAt`:
 *   → Execution is from a DIFFERENT scheduled run that's still running
 *   → This is a legitimate concurrent execution (previous scheduled run hasn't finished yet)
 *   → Skip current run (create SKIPPED execution)
 *
 * Note: Retries of the same scheduled run will have the same `runAt` but different `startedAt`.
 * This is why we use `runAt` instead of `startedAt` for comparison.
 * We also check `attempts > 1` to ensure we only mark executions as stale when they're from a previous attempt.
 */
export async function checkAndSkipIfExistingScheduledExecution(
  workflow: WorkflowExecutionEngineModel,
  spaceId: string,
  workflowExecutionRepository: WorkflowExecutionRepository,
  currentTaskInstance: ConcreteTaskInstance,
  logger: Logger
): Promise<boolean> {
  // Check if there's already a scheduled workflow execution in non-terminal state
  const runningExecutions = await workflowExecutionRepository.getRunningExecutionsByWorkflowId(
    workflow.id,
    spaceId,
    'scheduled'
  );

  // There's already a non-terminal scheduled execution - create SKIPPED execution
  if (runningExecutions.length > 0) {
    const existingExecution = runningExecutions[0]?._source;
    if (!existingExecution) {
      return false;
    }

    const currentTaskRunAt = currentTaskInstance.runAt
      ? new Date(currentTaskInstance.runAt).toISOString()
      : null;

    // taskRunAt is stored in the execution document to link it to a specific scheduled run
    const executionTaskRunAt = (existingExecution as EsWorkflowExecution & { taskRunAt?: string })
      .taskRunAt;

    // Execution is stale only if:
    // 1. Both taskRunAt values exist and are equal (same scheduled run)
    // 2. [for Extra Safety] Task attempts > 1 (this is a retry/recovery, not the first attempt)
    const isStaleExecution =
      executionTaskRunAt !== null &&
      currentTaskRunAt !== null &&
      executionTaskRunAt === currentTaskRunAt &&
      currentTaskInstance.attempts > 1;

    if (isStaleExecution) {
      if (existingExecution.status === ExecutionStatus.WAITING_FOR_INPUT) {
        logger.warn(
          `Stale scheduled retry for execution ${existingExecution.id} (taskRunAt: ${executionTaskRunAt}) is waiting_for_input - skipping duplicate scheduled invocation (human resume only)`
        );
        return true;
      }

      logger.warn(
        `Found stale execution ${existingExecution.id} from current scheduled run (taskRunAt: ${executionTaskRunAt}, current taskRunAt: ${currentTaskRunAt}, attempts: ${currentTaskInstance.attempts}) - marking as failed and proceeding`
      );
      await markExecutionFailedTaskRecovery(workflowExecutionRepository, existingExecution.id, {
        message: taskRecoveryMessages.scheduledStale,
      });
      return false;
    }

    logger.debug(
      `Skipping scheduled workflow ${workflow.id} execution - found existing non-terminal scheduled execution ${existingExecution.id} (taskRunAt: ${executionTaskRunAt}, current taskRunAt: ${currentTaskRunAt})`
    );
    const workflowCreatedAt = new Date();
    const skippedExecution: Partial<EsWorkflowExecution> = {
      id: generateUuid(),
      spaceId,
      workflowId: workflow.id,
      isTestRun: workflow.isTestRun,
      workflowDefinition: workflow.definition,
      yaml: workflow.yaml,
      context: {
        workflowRunId: `scheduled-${Date.now()}`,
        spaceId,
        inputs: {},
        event: {
          type: 'scheduled',
          timestamp: new Date().toISOString(),
          source: 'task-manager',
        },
        triggeredBy: 'scheduled',
      },
      status: ExecutionStatus.SKIPPED,
      createdAt: workflowCreatedAt.toISOString(),
      createdBy: '',
      triggeredBy: 'scheduled',
      cancelRequested: true,
      cancellationReason: 'Skipped due to existing non-terminal scheduled execution',
      cancelledAt: workflowCreatedAt.toISOString(),
      cancelledBy: 'system',
    };
    await workflowExecutionRepository.createWorkflowExecution(skippedExecution);
    return true;
  }

  return false;
}
