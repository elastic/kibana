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

export interface RevertResumeContextParams {
  workflowExecutionId: string;
  spaceId: string;
  /** The stamp written with the response; it tells this request's response apart. */
  resumedBy: string;
  resumedAt: string;
  /** The context as read before the response was written. */
  previousContext: Record<string, unknown> | undefined;
}

/** Decides whether a resume response can be taken back, and the context patch that does it. */
export const getResumeContextRevert = (
  current: Pick<EsWorkflowExecution, 'spaceId' | 'status' | 'context'>,
  { spaceId, resumedBy, resumedAt, previousContext }: RevertResumeContextParams
):
  | { skip: Exclude<RevertResumeContextResult, 'reverted' | 'not_found'> }
  | { context: Record<string, unknown> } => {
  const context: Record<string, unknown> = current.context ?? {};
  if (
    current.spaceId !== spaceId ||
    context.resumedBy !== resumedBy ||
    context.resumedAt !== resumedAt
  ) {
    return { skip: 'not_pending' };
  }
  // A runner takes the response by clearing `resumeInput`, and keeps the stamp.
  if (context.resumeInput == null) {
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
