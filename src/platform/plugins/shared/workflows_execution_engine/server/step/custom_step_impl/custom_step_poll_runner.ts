/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AtomicGraphNode } from '@kbn/workflows/graph';
import { ExecutionError } from '@kbn/workflows/server';
import type {
  PollContinueResult,
  PollHandlerContext,
  ServerStepDefinition,
} from '@kbn/workflows-extensions/server';
import { POLL_AUTHOR_STATE_KEY, POLL_BOOKKEEPING_KEY } from './constants';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { RunStepResult } from '../node_implementation';
import { computeNextPollAt, enforceCeilings, type PollBookkeeping } from '../poll_scheduler';

interface PersistedPollState {
  [POLL_BOOKKEEPING_KEY]?: PollBookkeeping;
  [POLL_AUTHOR_STATE_KEY]?: unknown;
  [key: string]: unknown;
}

export type CreatePollHandlerContextFn = (
  input: unknown,
  authorState: unknown,
  attempt: number
) => PollHandlerContext;

/**
 * Poll loop and scheduling for extension-registered custom steps (`poll` and
 * `run` + `poll`). {@link CustomStepImpl} delegates here after routing.
 */
export class CustomStepPollRunner {
  constructor(
    private readonly node: AtomicGraphNode,
    private readonly stepDefinition: ServerStepDefinition,
    private readonly stepExecutionRuntime: StepExecutionRuntime,
    private readonly workflowLogger: IWorkflowEventLogger,
    private readonly createPollHandlerContext: CreatePollHandlerContextFn
  ) {}

  /**
   * Resumed execution: `__poll` bookkeeping is present — invoke the poll handler.
   */
  public async resumeAfterPollWake(
    input: unknown,
    bookkeeping: PollBookkeeping,
    authorState: unknown
  ): Promise<RunStepResult> {
    if (!this.stepDefinition.poll) {
      throw new Error(
        `Step "${this.node.stepType}" was woken from a poll-bookkeeping state but no poll lifecycle is declared.`
      );
    }
    return this.executePollHandler(input, authorState, bookkeeping.attempt);
  }

  /** Poll-only first execution: invoke poll immediately (no initial wait). */
  public runFirstPoll(input: unknown): Promise<RunStepResult> {
    return this.executePollHandler(input, /* prevState */ undefined, /* prevAttempt */ 0);
  }

  public scheduleNextPoll(
    input: unknown,
    authorState: unknown,
    previousAttempt: number
  ): Promise<RunStepResult> {
    const poll = this.stepDefinition.poll;
    if (!poll) {
      throw new Error(
        `Step "${this.node.stepType}" scheduled a poll wake-up but no poll lifecycle is declared.`
      );
    }
    const now = Date.now();
    const existing = (this.stepExecutionRuntime.getCurrentStepState() ?? {}) as PersistedPollState;
    const existingBookkeeping = existing[POLL_BOOKKEEPING_KEY];
    const startedAt = existingBookkeeping?.startedAt ?? now;
    const probeBookkeeping: PollBookkeeping = {
      attempt: previousAttempt,
      startedAt,
      lastInvocationAt: now,
    };

    const { nextPollAt, delayMs } = computeNextPollAt(
      poll.policy,
      probeBookkeeping,
      authorState,
      now
    );

    const ceilingCheck = enforceCeilings(poll.ceilings, probeBookkeeping, delayMs, now);
    if (!ceilingCheck.ok) {
      const error = new ExecutionError({
        type: 'PollCeilingExceeded',
        message: `Step "${this.node.stepType}" exceeded poll ${ceilingCheck.reason} ceiling (attempts=${ceilingCheck.attempts}, elapsedMs=${ceilingCheck.elapsedMs}, maxAttempts=${ceilingCheck.maxAttempts}, maxWaitMs=${ceilingCheck.maxWaitMs}).`,
        details: {
          reason: ceilingCheck.reason,
          attempts: ceilingCheck.attempts,
          elapsedMs: ceilingCheck.elapsedMs,
          maxAttempts: ceilingCheck.maxAttempts,
          maxWaitMs: ceilingCheck.maxWaitMs,
        },
      });
      return { input, output: undefined, error: error.toSerializableObject() };
    }

    const nextBookkeeping: PollBookkeeping = {
      attempt: previousAttempt,
      startedAt,
      lastInvocationAt: now,
      firstPollAt: existingBookkeeping?.firstPollAt ?? nextPollAt.getTime(),
    };

    this.stepExecutionRuntime.enterWaitUntil(nextPollAt, {
      [POLL_BOOKKEEPING_KEY]: nextBookkeeping,
      [POLL_AUTHOR_STATE_KEY]: authorState,
    });
    this.workflowLogger.logDebug(
      `Step "${this.node.stepType}" scheduled next poll at ${nextPollAt.toISOString()} (attempt ${
        previousAttempt + 1
      })`
    );
    return { input, output: undefined, error: undefined, suspended: true };
  }

  private async executePollHandler(
    input: unknown,
    prevAuthorState: unknown,
    prevAttempt: number
  ): Promise<RunStepResult> {
    const poll = this.stepDefinition.poll;
    if (!poll) {
      throw new Error(
        `Step "${this.node.stepType}" invoked the poll phase but no poll lifecycle is declared.`
      );
    }
    const nextAttempt = prevAttempt + 1;
    const ctx = this.createPollHandlerContext(input, prevAuthorState, nextAttempt);
    const result = await poll.handler(ctx);

    if (result.error) {
      return {
        input,
        output: undefined,
        error: ExecutionError.fromError(result.error).toSerializableObject(),
      };
    }
    if ('output' in result && result.output !== undefined) {
      return { input, output: result.output, error: undefined };
    }

    const continueResult = result as PollContinueResult<unknown>;
    const authorState = resolveContinuedAuthorState(prevAuthorState, continueResult.state);
    return this.scheduleNextPoll(input, authorState, nextAttempt);
  }
}

function resolveContinuedAuthorState(previous: unknown, next: unknown | null | undefined): unknown {
  if (next === null) {
    return undefined;
  }
  if (next === undefined) {
    return previous;
  }
  return next;
}
