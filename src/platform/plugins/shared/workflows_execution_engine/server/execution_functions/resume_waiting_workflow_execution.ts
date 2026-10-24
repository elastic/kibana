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
import {
  WorkflowExecutionInvalidStatusError,
  WorkflowExecutionNotFoundError,
  WorkflowResumeNotAppliedError,
} from '@kbn/workflows/common/errors';
import type { RevertResumeContextResult } from '../repositories/resume_context_revert';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { InternalResumeWorkflowExecution, ResumeWorkflowExecutionResponse } from '../types';
import { applyBackoffJitter } from '../utils/backoff_jitter/backoff_jitter';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

/** Delays before the second and third handoff attempts, jittered down to half. */
const HANDOFF_RETRY_DELAYS_MS: readonly number[] = [100, 400];
/** No attempt starts after this: a failing Task Manager call can take a whole ES timeout. */
const HANDOFF_RETRY_BUDGET_MS = 5_000;

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
  retryDelaysMs?: readonly number[];
  retryBudgetMs?: number;
  sleep?: (ms: number) => Promise<void>;
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

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

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

const handOffWithRetry = async (
  deps: ResumeWaitingWorkflowExecutionDeps,
  executionId: string,
  handOff: () => Promise<void>
): Promise<void> => {
  const delaysMs = deps.retryDelaysMs ?? HANDOFF_RETRY_DELAYS_MS;
  const sleep = deps.sleep ?? defaultSleep;
  const deadline = Date.now() + (deps.retryBudgetMs ?? HANDOFF_RETRY_BUDGET_MS);

  for (const [index, delayMs] of delaysMs.entries()) {
    try {
      await handOff();
      return;
    } catch (error) {
      if (Date.now() >= deadline) {
        throw error;
      }
      deps.logger.warn(
        `Handing the resume of workflow execution ${executionId} to Task Manager failed on attempt ${
          index + 1
        }, retrying: ${toMessage(error)}`
      );
      await sleep(applyBackoffJitter(delayMs));
    }
  }

  await handOff();
};

/**
 * Takes back the response this request wrote and decides the outcome: a response a runner already
 * has is a success, one that is gone means nothing is pending, anything else keeps the failure.
 */
const revertResponse = async (
  deps: ResumeWaitingWorkflowExecutionDeps,
  { executionId, spaceId }: ResumeWaitingWorkflowExecutionParams,
  { execution, resumedBy, resumedAt }: PreparedResume,
  failure: unknown
): Promise<ResumeWorkflowExecutionResponse> => {
  let result: RevertResumeContextResult;
  try {
    result = await deps.workflowExecutionRepository.tryRevertResumeContext({
      workflowExecutionId: executionId,
      spaceId,
      resumedBy,
      resumedAt,
      previousContext: execution.context,
    });
  } catch (revertError) {
    deps.logger.error(
      `Failed to revert the resume of workflow execution ${executionId}: ${toMessage(revertError)}`
    );
    throw failure;
  }

  switch (result) {
    case 'reverted':
    case 'not_pending':
    case 'not_found':
      deps.logger.warn(
        `Resume of workflow execution ${executionId} was not applied (${result}): ${toMessage(
          failure
        )}`
      );
      throw new WorkflowResumeNotAppliedError(executionId, failure);
    case 'consumed':
    case 'in_flight':
      deps.logger.warn(
        `Resume of workflow execution ${executionId} reached a runner despite failing: ${toMessage(
          failure
        )}`
      );
      return { resumedBy };
    case 'conflict':
      deps.logger.error(
        `Resume of workflow execution ${executionId} failed and could not be reverted: ${toMessage(
          failure
        )}`
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
    await deps.internalResumeWorkflowExecution(executionId, spaceId, resumeContext, undefined, {
      isUserInteractive: true,
    });
    return { resumedBy };
  }

  let prepared: PreparedResume;
  try {
    prepared = await prepareResume(deps, params);
  } catch (error) {
    if (
      error instanceof WorkflowExecutionNotFoundError ||
      error instanceof WorkflowExecutionInvalidStatusError
    ) {
      throw error;
    }
    // Nothing has been written yet.
    throw new WorkflowResumeNotAppliedError(executionId, error);
  }

  try {
    await deps.workflowExecutionRepository.updateWorkflowExecution({
      id: executionId,
      context: prepared.resumeContext,
    });
  } catch (error) {
    // A failed write may still have landed, so only the revert can tell what is pending.
    return revertResponse(deps, params, prepared, error);
  }

  try {
    await handOffWithRetry(deps, executionId, () =>
      deps.internalResumeWorkflowExecution(executionId, spaceId, undefined, request, {
        isUserInteractive: true,
      })
    );
    return { resumedBy: prepared.resumedBy };
  } catch (handOffError) {
    let inProgress: boolean;
    try {
      inProgress = await deps.workflowTaskManager.isResumeInProgress(executionId);
    } catch (checkError) {
      deps.logger.error(
        `Could not tell whether workflow execution ${executionId} is already resuming, keeping its response: ${toMessage(
          checkError
        )}`
      );
      throw handOffError;
    }

    if (inProgress) {
      deps.logger.warn(
        `Handing the resume of workflow execution ${executionId} failed, but a resume is already in progress: ${toMessage(
          handOffError
        )}`
      );
      return { resumedBy: prepared.resumedBy };
    }

    return revertResponse(deps, params, prepared, handOffError);
  }
};
