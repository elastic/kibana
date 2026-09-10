/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { emitHitlLifecycle } from './hitl_lifecycle_auditor';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';

export function resumeHitlWaitStep({
  stepExecutionRuntime,
  workflowRuntime,
  workflowLogger,
  stepId,
  transformResumeInput,
}: {
  stepExecutionRuntime: StepExecutionRuntime;
  workflowRuntime: WorkflowExecutionRuntimeManager;
  workflowLogger: IWorkflowEventLogger;
  stepId: string;
  transformResumeInput?: (
    resumeInput: Record<string, unknown> | undefined,
    resumedBy: string
  ) => unknown;
}): void {
  const execution = workflowRuntime.getWorkflowExecution();
  const context = execution.context;
  const resumeInput = context?.resumeInput as Record<string, unknown> | undefined;
  const ctx = context as Record<string, unknown> | null | undefined;
  // Prefer the claim-time HITL stamp (username / external_resume:*) over the
  // engine resume context, which may store a profile UID from a different
  // getAuthenticatedUser helper.
  const hitl = stepExecutionRuntime.stepExecution?.hitl;
  const claimedBy =
    typeof hitl?.respondedBy === 'string' && hitl.respondedBy !== '' ? hitl.respondedBy : undefined;
  const resumedBy = claimedBy ?? (typeof ctx?.resumedBy === 'string' ? ctx.resumedBy : 'unknown');
  const executionId = execution.id;

  const stepOutput = transformResumeInput
    ? transformResumeInput(resumeInput, resumedBy)
    : resumeInput;

  const enrichedOutput = enrichHitlStepOutput(stepOutput, hitl);

  stepExecutionRuntime.finishStep(enrichedOutput);

  if (context != null && typeof context === 'object' && 'resumeInput' in context) {
    const { resumeInput: _cleared, ...restContext } = context as Record<string, unknown>;
    stepExecutionRuntime.updateWorkflowExecution({ context: restContext });
  }

  workflowLogger.logDebug(`Workflow ${executionId} resumed by ${resumedBy}`, {
    event: {
      action: 'hitl:resumed',
      category: ['workflow'],
      outcome: 'success',
      provider: 'workflow-engine',
    },
    labels: {
      responder: resumedBy,
      execution_id: executionId,
    },
  });

  workflowRuntime.navigateToNextNode();
}

/** Skip wait-entry when the step runtime was already aborted (timeout/cancel race) to avoid re-entering WAITING_FOR_INPUT. */
export function shouldSkipHitlWaitEntry(stepExecutionRuntime: StepExecutionRuntime): boolean {
  return stepExecutionRuntime.abortController.signal.aborted;
}

export function tryEnterHitlWait(stepExecutionRuntime: StepExecutionRuntime): boolean {
  return stepExecutionRuntime.tryEnterWaitUntil(undefined, ExecutionStatus.WAITING_FOR_INPUT);
}

export function emitHitlWaitingAudit(params: {
  executionId: string;
  stepExecutionId: string;
  stepType: string;
}): void {
  emitHitlLifecycle({
    type: 'waiting',
    executionId: params.executionId,
    stepExecutionId: params.stepExecutionId,
    stepType: params.stepType,
  });
}

export function failHitlWaitOnTimeout(params: {
  stepExecutionRuntime: StepExecutionRuntime;
  executionId: string;
  stepType: string;
  error: Error;
}): void {
  const { stepExecutionRuntime, executionId, stepType, error } = params;
  const respondedAt = new Date().toISOString();
  const hitl = {
    respondedBy: 'system',
    respondedAt,
    channel: 'timeout',
  };
  stepExecutionRuntime.stampHitlAudit(hitl);
  emitHitlLifecycle({
    type: 'timed_out',
    executionId,
    stepExecutionId: stepExecutionRuntime.stepExecutionId,
    stepType,
  });
  // Persist HITL audit fields as partial output so the Error tab can show them
  // alongside the TimeoutError without a separate callout.
  stepExecutionRuntime.failStep(error, {
    respondedBy: hitl.respondedBy,
    channel: hitl.channel,
    respondedAt: hitl.respondedAt,
  });
}

function enrichHitlStepOutput(
  stepOutput: unknown,
  hitl: { channel?: string; respondedAt?: string } | undefined
): unknown {
  if (!hitl || stepOutput == null || typeof stepOutput !== 'object' || Array.isArray(stepOutput)) {
    return stepOutput;
  }

  return {
    ...(stepOutput as Record<string, unknown>),
    ...(hitl.channel !== undefined ? { channel: hitl.channel } : {}),
    ...(hitl.respondedAt !== undefined ? { respondedAt: hitl.respondedAt } : {}),
  };
}
