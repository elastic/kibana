/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus, NonTerminalExecutionStatuses } from '@kbn/workflows';

/**
 * Outcome of taking back a resume response: `consumed` and `in_flight` mean a runner has it,
 * `not_pending` that the response is not in the context, `conflict` that it cannot be undone.
 */
export type RevertResumeContextResult =
  | 'reverted'
  | 'not_pending'
  | 'consumed'
  | 'in_flight'
  | 'not_found'
  | 'conflict';

/** Identifies one stored resume response: the stamp written with it tells it apart from others. */
export interface ResumeResponseRef {
  workflowExecutionId: string;
  spaceId: string;
  resumedBy: string;
  resumedAt: string;
}

export interface RevertResumeContextParams extends ResumeResponseRef {
  /** The context as read before the response was written. */
  previousContext: Record<string, unknown> | undefined;
}

/**
 * Context key a runner sets, to the `resumedAt` of the response it is applying, before it applies
 * it. Reverting and taking check the same stamp in one conditional update each, so a response is
 * either taken back by the request that wrote it or applied by a runner, never both.
 */
export const RESUME_INPUT_TAKEN_FOR_KEY = 'resumeInputTakenFor';

const isResponse = (
  current: Pick<EsWorkflowExecution, 'spaceId' | 'context'>,
  { spaceId, resumedBy, resumedAt }: Omit<ResumeResponseRef, 'workflowExecutionId'>
): boolean =>
  current.spaceId === spaceId &&
  current.context?.resumedBy === resumedBy &&
  current.context?.resumedAt === resumedAt;

/**
 * Decides whether a runner may apply the response it loaded: `taken` when it is still stored (it is
 * marked by the returned patch, or was already marked by an earlier run), `gone` when it was taken
 * back or replaced.
 */
export const getResumeInputTake = (
  current: Pick<EsWorkflowExecution, 'spaceId' | 'context'>,
  ref: ResumeResponseRef
): { outcome: 'taken' | 'gone'; context?: Record<string, unknown> } => {
  if (!isResponse(current, ref) || current.context?.resumeInput == null) {
    return { outcome: 'gone' };
  }
  if (current.context?.[RESUME_INPUT_TAKEN_FOR_KEY] === ref.resumedAt) {
    return { outcome: 'taken' };
  }
  return { outcome: 'taken', context: { [RESUME_INPUT_TAKEN_FOR_KEY]: ref.resumedAt } };
};

/** Decides whether a resume response can be taken back, and the context patch that does it. */
export const getResumeContextRevert = (
  current: Pick<EsWorkflowExecution, 'spaceId' | 'status' | 'context'>,
  { spaceId, resumedBy, resumedAt, previousContext }: RevertResumeContextParams
):
  | { skip: Exclude<RevertResumeContextResult, 'reverted' | 'not_found'> }
  | { context: Record<string, unknown> } => {
  const context: Record<string, unknown> = current.context ?? {};
  if (!isResponse(current, { spaceId, resumedBy, resumedAt })) {
    return { skip: 'not_pending' };
  }
  // A runner marks the response before applying it, and clears `resumeInput` (keeping the stamp)
  // once applied.
  if (context.resumeInput == null || context[RESUME_INPUT_TAKEN_FOR_KEY] === resumedAt) {
    return { skip: 'consumed' };
  }
  if (
    current.status !== ExecutionStatus.WAITING_FOR_INPUT &&
    NonTerminalExecutionStatuses.includes(current.status)
  ) {
    return { skip: 'in_flight' };
  }
  // Partial updates merge objects, so a response that was pending before cannot be put back.
  if (previousContext?.resumeInput != null) {
    return { skip: 'conflict' };
  }
  return {
    context: {
      resumeInput: null,
      resumedBy: previousContext?.resumedBy ?? null,
      resumedAt: previousContext?.resumedAt ?? null,
      pendingInteractiveResume: previousContext?.pendingInteractiveResume ?? null,
    },
  };
};
