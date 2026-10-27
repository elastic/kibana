/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import pRetry from 'p-retry';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import {
  WorkflowExecutionInvalidStatusError,
  WorkflowExecutionNotFoundError,
  WorkflowResumeNotAppliedError,
} from '@kbn/workflows/common/errors';
import type { RevertResumeContextResult } from '../repositories/resume_context_revert';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { InternalResumeWorkflowExecution, ResumeWorkflowExecutionResponse } from '../types';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

/** Three handoff attempts, 100-200ms and then 400-800ms apart. */
const HANDOFF_RETRY_OPTIONS = {
  retries: 2,
  minTimeout: 100,
  factor: 4,
  randomize: true,
  // No attempt starts after this: a failing Task Manager call can take a whole ES timeout.
  maxRetryTime: 5_000,
} as const;

export interface ResumeWaitingWorkflowExecutionDeps {
  workflowExecutionRepository: Pick<
    WorkflowExecutionRepository,
    'getWorkflowExecutionById' | 'updateWorkflowExecution' | 'tryRevertResumeContext'
  >;
  workflowTaskManager: Pick<WorkflowTaskManager, 'isResumeInProgress'>;
  internalResumeWorkflowExecution: InternalResumeWorkflowExecution;
  assertLicensed: () => Promise<void>;
  resolveResumedBy: (request: KibanaRequest | undefined) => Promise<string>;
  logger: Logger;
}

export interface ResumeWaitingWorkflowExecutionParams {
  executionId: string;
  spaceId: string;
  input: Record<string, unknown>;
  request?: KibanaRequest;
  resumedBy?: string;
}

interface PreparedResume {
  execution: EsWorkflowExecution;
  resumedBy: string;
  resumedAt: string;
  resumeContext: Record<string, unknown>;
}

type ResumeProgress = 'in_progress' | 'idle' | 'unknown';

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const prepareResume = async (
  deps: ResumeWaitingWorkflowExecutionDeps,
  { executionId, spaceId, input, request, resumedBy }: ResumeWaitingWorkflowExecutionParams
): Promise<PreparedResume> => {
  await deps.assertLicensed();

  const execution = await deps.workflowExecutionRepository.getWorkflowExecutionById(
    executionId,
    spaceId
  );

  if (!execution) {
    throw new WorkflowExecutionNotFoundError(executionId);
  }

  if (execution.status !== ExecutionStatus.WAITING_FOR_INPUT) {
    throw new WorkflowExecutionInvalidStatusError(
      executionId,
      execution.status,
      ExecutionStatus.WAITING_FOR_INPUT
    );
  }

  // Freshness guard: a waitForInput step whose parent workflow already
  // terminated (timeout, cancel, external failure) can leave the execution
  // doc with `status: waiting_for_input` but `finishedAt` set — writing
  // resumeInput and scheduling a resume task in that state is a no-op that
  // silently swallows the analyst's response. Reject explicitly so the
  // caller sees a 409 and the Inbox provider can surface a real error.
  if (execution.finishedAt) {
    throw new WorkflowExecutionInvalidStatusError(
      executionId,
      `${execution.status} (already finished at ${execution.finishedAt})`,
      ExecutionStatus.WAITING_FOR_INPUT
    );
  }

  const resolvedResumedBy = resumedBy ?? (await deps.resolveResumedBy(request));
  const resumedAt = new Date().toISOString();

  return {
    execution,
    resumedBy: resolvedResumedBy,
    resumedAt,
    resumeContext: {
      ...execution.context,
      resumeInput: input,
      resumedBy: resolvedResumedBy,
      resumedAt,
      pendingInteractiveResume: request !== undefined,
    },
  };
};

/** Nothing has been written yet, so any failure other than the execution's state is not applied. */
const prepareInteractiveResume = async (
  deps: ResumeWaitingWorkflowExecutionDeps,
  params: ResumeWaitingWorkflowExecutionParams
): Promise<PreparedResume> => {
  try {
    return await prepareResume(deps, params);
  } catch (error) {
    if (
      error instanceof WorkflowExecutionNotFoundError ||
      error instanceof WorkflowExecutionInvalidStatusError
    ) {
      throw error;
    }
    throw new WorkflowResumeNotAppliedError(params.executionId, error);
  }
};

const handOffWithRetry = (
  deps: ResumeWaitingWorkflowExecutionDeps,
  { executionId, spaceId, request }: ResumeWaitingWorkflowExecutionParams
): Promise<void> =>
  pRetry(
    () =>
      deps.internalResumeWorkflowExecution(executionId, spaceId, undefined, request, {
        isUserInteractive: true,
      }),
    {
      ...HANDOFF_RETRY_OPTIONS,
      onFailedAttempt: (error) => {
        deps.logger.warn(
          `Handing the resume of workflow execution ${executionId} to Task Manager failed on attempt ${error.attemptNumber}: ${error.message}`
        );
      },
    }
  );

const getResumeProgress = async (
  deps: ResumeWaitingWorkflowExecutionDeps,
  executionId: string
): Promise<ResumeProgress> => {
  try {
    return (await deps.workflowTaskManager.isResumeInProgress(executionId))
      ? 'in_progress'
      : 'idle';
  } catch (error) {
    deps.logger.error(
      `Could not tell whether workflow execution ${executionId} is already resuming: ${toMessage(
        error
      )}`
    );
    return 'unknown';
  }
};

const revertResumeContext = async (
  deps: ResumeWaitingWorkflowExecutionDeps,
  { executionId, spaceId }: ResumeWaitingWorkflowExecutionParams,
  { execution, resumedBy, resumedAt }: PreparedResume
): Promise<RevertResumeContextResult | 'error'> => {
  try {
    return await deps.workflowExecutionRepository.tryRevertResumeContext({
      workflowExecutionId: executionId,
      spaceId,
      resumedBy,
      resumedAt,
      previousContext: execution.context,
    });
  } catch (error) {
    deps.logger.error(
      `Failed to revert the resume of workflow execution ${executionId}: ${toMessage(error)}`
    );
    return 'error';
  }
};

/**
 * Decides the outcome of a response that could not be handed off: one a runner has or is about to
 * get is a success, one taken back is not applied, and anything uncertain keeps the failure.
 */
const settleFailedHandOff = async (
  deps: ResumeWaitingWorkflowExecutionDeps,
  params: ResumeWaitingWorkflowExecutionParams,
  prepared: PreparedResume,
  failure: unknown,
  { checkProgress }: { checkProgress: boolean }
): Promise<ResumeWorkflowExecutionResponse> => {
  const { executionId } = params;
  const progress = checkProgress ? await getResumeProgress(deps, executionId) : 'idle';
  const state = progress === 'idle' ? await revertResumeContext(deps, params, prepared) : progress;
  const details = `(${state}): ${toMessage(failure)}`;

  switch (state) {
    case 'in_progress':
    case 'consumed':
    case 'in_flight':
      deps.logger.warn(
        `Resume of workflow execution ${executionId} reached a runner despite failing ${details}`
      );
      return { resumedBy: prepared.resumedBy };
    case 'reverted':
    case 'not_pending':
    case 'not_found':
      deps.logger.warn(`Resume of workflow execution ${executionId} was not applied ${details}`);
      throw new WorkflowResumeNotAppliedError(executionId, failure);
    case 'unknown':
    case 'conflict':
    case 'error':
      deps.logger.error(
        `Resume of workflow execution ${executionId} failed and its response was kept ${details}`
      );
      throw failure;
  }
};

/**
 * Stores a response for an execution waiting for input and hands it to Task Manager. An interactive
 * resume whose handoff keeps failing is reverted, and then rejected with
 * `WorkflowResumeNotAppliedError`, so the caller can release its claim on the waiting step.
 */
export const resumeWaitingWorkflowExecution = async (
  deps: ResumeWaitingWorkflowExecutionDeps,
  params: ResumeWaitingWorkflowExecutionParams
): Promise<ResumeWorkflowExecutionResponse> => {
  const { executionId, spaceId, request } = params;

  // External resumes keep their original flow; they hand off through the retained wake task.
  if (!request) {
    const { resumedBy, resumeContext } = await prepareResume(deps, params);
    await deps.internalResumeWorkflowExecution(executionId, spaceId, resumeContext);
    return { resumedBy };
  }

  const prepared = await prepareInteractiveResume(deps, params);

  try {
    await deps.workflowExecutionRepository.updateWorkflowExecution({
      id: executionId,
      context: prepared.resumeContext,
    });
  } catch (error) {
    // A failed write may still have landed, so only the revert can tell what is pending.
    return settleFailedHandOff(deps, params, prepared, error, { checkProgress: false });
  }

  try {
    await handOffWithRetry(deps, params);
  } catch (error) {
    return settleFailedHandOff(deps, params, prepared, error, { checkProgress: true });
  }

  return { resumedBy: prepared.resumedBy };
};
