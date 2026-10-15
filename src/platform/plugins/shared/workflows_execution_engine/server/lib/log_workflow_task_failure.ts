/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Logger, SavedObjectsErrorHelpers } from '@kbn/core/server';

export interface WorkflowTaskFailureLogContext {
  taskType: 'workflow:run' | 'workflow:resume' | 'workflow:scheduled';
  workflowId?: string;
  workflowRunId?: string;
  spaceId?: string;
  taskId?: string;
  attempt?: number;
  maxAttempts?: number;
  aborted?: boolean;
}

const LOG_MESSAGE = 'Workflow task failed';
const VERSION_CONFLICT_MARKER = 'version_conflict_engine_exception';

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function isVersionConflictError(error: unknown): boolean {
  if (error instanceof Error && SavedObjectsErrorHelpers.isConflictError(error)) {
    return true;
  }

  if (!error || typeof error !== 'object') {
    return typeof error === 'string' && error.includes(VERSION_CONFLICT_MARKER);
  }

  const candidate = error as {
    status?: number;
    statusCode?: number;
    error?: { type?: string };
    message?: string;
  };

  if (candidate.status === 409 || candidate.statusCode === 409) {
    return true;
  }

  if (candidate.error?.type === VERSION_CONFLICT_MARKER) {
    return true;
  }

  const message = candidate.message ?? String(error);
  return message.includes(VERSION_CONFLICT_MARKER);
}

function isFinalAttempt(context: WorkflowTaskFailureLogContext): boolean {
  const { attempt, maxAttempts } = context;
  // Task Manager increments `attempts` when claiming/marking the task running, so by the
  // time the runner catch runs, the final attempt already has `attempt === maxAttempts`.
  // This matches TM retry (`attempts < maxAttempts`) and resolveExhaustedWorkflowRunTask.
  return typeof attempt === 'number' && typeof maxAttempts === 'number' && attempt >= maxAttempts;
}

export function logWorkflowTaskFailure(
  logger: Logger,
  error: unknown,
  context: WorkflowTaskFailureLogContext
): void {
  const normalizedError = toError(error);
  const meta: Record<string, unknown> = {
    taskType: context.taskType,
    workflowId: context.workflowId,
    workflowRunId: context.workflowRunId,
    spaceId: context.spaceId,
    taskId: context.taskId,
    attempt: context.attempt,
    maxAttempts: context.maxAttempts,
    aborted: context.aborted === true,
    errorMessage: normalizedError.message,
    errorName: normalizedError.name,
    error: normalizedError,
  };

  if (context.aborted) {
    meta.failureKind = 'aborted';
    logger.debug(LOG_MESSAGE, meta);
    return;
  }

  if (isVersionConflictError(error)) {
    meta.failureKind = 'task_manager_version_conflict';
  }

  // Non-final Task Manager attempts are expected to retry; keep those below error so
  // transient failures do not feed the same alert spikes this logging is meant to triage.
  if (
    typeof context.attempt === 'number' &&
    typeof context.maxAttempts === 'number' &&
    !isFinalAttempt(context)
  ) {
    logger.warn(LOG_MESSAGE, meta);
    return;
  }

  logger.error(LOG_MESSAGE, meta);
}
