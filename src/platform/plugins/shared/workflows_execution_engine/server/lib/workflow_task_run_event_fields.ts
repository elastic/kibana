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
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

/**
 * Semantic workflow outcome stamped onto Task Manager `task-run` / `task-cancel`
 * event-log docs via `kibana.task.data.outcome`. Distinct from TM's own
 * `event.outcome` (success/failure).
 */
export type WorkflowTaskRunOutcome =
  | 'completed'
  | 'skipped'
  | 'interrupted'
  | 'queued_deleted'
  | 'failed'
  | 'cancelled';

export interface WorkflowTaskRunEventFields {
  workflow_execution_id?: string;
  workflow_id?: string;
  space_id: string;
  outcome: WorkflowTaskRunOutcome;
}

/**
 * Maps a persisted execution status to a semantic task-run outcome.
 * Returns `undefined` for non-terminal statuses so callers can skip stamping.
 */
export function mapExecutionStatusToOutcome(
  status: ExecutionStatus
): WorkflowTaskRunOutcome | undefined {
  switch (status) {
    case ExecutionStatus.COMPLETED:
      return 'completed';
    case ExecutionStatus.SKIPPED:
      return 'skipped';
    case ExecutionStatus.FAILED:
    case ExecutionStatus.TIMED_OUT:
      return 'failed';
    case ExecutionStatus.CANCELLED:
      return 'cancelled';
    default:
      return undefined;
  }
}

/**
 * Outcome for interrupt recovery `task_complete` results.
 * - `interrupted` → stamp `interrupted`
 * - `noop` + terminal status → stamp mapped status
 * - `noop` + non-terminal → omit (undefined)
 */
export function mapInterruptCompleteReasonToOutcome(
  reason: 'interrupted' | 'noop',
  execution: EsWorkflowExecution
): WorkflowTaskRunOutcome | undefined {
  if (reason === 'interrupted') {
    return 'interrupted';
  }
  return mapExecutionStatusToOutcome(execution.status);
}

/**
 * Attaches workflow correlation fields + semantic outcome to the TM task-run
 * (or task-cancel) event. Last-write-wins: call exactly once per claim with the
 * full field set immediately before the terminal return/throw/cancel exit.
 */
export function stampWorkflowTaskRunEventFields(
  setCustomTaskRunEventFields: (fields: Record<string, unknown>) => void,
  fields: WorkflowTaskRunEventFields
): void {
  const payload: Record<string, unknown> = {
    space_id: fields.space_id,
    outcome: fields.outcome,
  };
  if (fields.workflow_execution_id !== undefined) {
    payload.workflow_execution_id = fields.workflow_execution_id;
  }
  if (fields.workflow_id !== undefined) {
    payload.workflow_id = fields.workflow_id;
  }
  setCustomTaskRunEventFields(payload);
}

/**
 * Best-effort load of an execution for stamping task-run event fields.
 * Returns null on missing docs or transient read failures so stamping can still proceed.
 */
export async function getExecutionForTaskRunEvent(
  workflowExecutionRepository: WorkflowExecutionRepository,
  workflowExecutionId: string,
  spaceId: string,
  logger?: Logger
): Promise<EsWorkflowExecution | null> {
  try {
    return await workflowExecutionRepository.getWorkflowExecutionById(workflowExecutionId, spaceId);
  } catch (error) {
    logger?.debug(
      `Failed to load workflow execution ${workflowExecutionId} for task-run event fields: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }
}
