/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
/* eslint-disable complexity */

import type { AtomicGraphNode } from '@kbn/workflows/graph';
import { ExecutionError } from '@kbn/workflows/server';
import { DEFAULT_POLL_CEILINGS } from '@kbn/workflows-extensions/server';
import type {
  PollCeilings,
  PollHandlerContext,
  PollOnlyMode,
  RunPlusPollMode,
} from '@kbn/workflows-extensions/server';
import type { z } from '@kbn/zod/v4';
import { createHandlerContext } from './step_context_handler';
import { applyBackoffJitter } from '../../utils/backoff_jitter/backoff_jitter';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { RunStepResult } from '../node_implementation';

const bookkeepingKey = '__durableStepState';

interface DurableStepState<State extends Record<string, unknown>> extends Record<string, unknown> {
  customState?: State;
  initialRunState?: {
    isRun: boolean;
  };
  pollState?: {
    attempt: number;
    nextPollAt: string;
    lastPollAt: string;
  };
  /** Epoch ms when the step entered its poll loop (after `run`). */
  startedAt?: string;
}

type PollStepDefinition<
  Input extends z.ZodType,
  Output extends z.ZodType,
  Config extends z.ZodObject,
  State
> = PollOnlyMode<Input, Output, Config, State> | RunPlusPollMode<Input, Output, Config, State>;

export interface StepHandler {
  onCancel(): Promise<void>;
  run<State>(
    input: unknown,
    rawInput: unknown,
    config: Record<string, unknown>
  ): Promise<RunStepResult>;
}

type PolicyCalculationResult =
  | { outcome: 'success'; nextPollAt: string }
  | { outcome: 'maxAttemptReached' }
  | { outcome: 'maxWaitMsExceeded' };

export class PollPolicyStepHandler implements StepHandler {
  constructor(
    private readonly stepDefinition: PollStepDefinition<unknown, unknown, unknown, unknown>,
    private readonly node: AtomicGraphNode,
    private readonly stepExecutionRuntime: StepExecutionRuntime,
    private readonly workflowLogger: IWorkflowEventLogger
  ) {}

  public async onCancel(): Promise<void> {
    // TBD: Implement cancellation cleanup for polling steps
  }

  public async run<State extends Record<string, unknown>>(
    input: unknown,
    rawInput: unknown,
    config: Record<string, unknown>
  ): Promise<RunStepResult> {
    let stepState = (await this.stepExecutionRuntime.getCurrentStepState())?.[bookkeepingKey] as
      | DurableStepState<State>
      | undefined;
    stepState = stepState ? { ...stepState } : {};

    if (this.stepDefinition.run) {
      if (!stepState?.initialRunState?.isRun) {
        const result = await this.stepDefinition.run(
          createHandlerContext(
            input,
            rawInput,
            config,
            this.node,
            this.stepExecutionRuntime,
            this.workflowLogger
          )
        );

        if (result && (result.output || result.error)) {
          return {
            input,
            output: result.output,
            error: result.error
              ? ExecutionError.fromError(result.error).toSerializableObject()
              : undefined,
          };
        }
        const customState = result && 'state' in result && result.state ? result.state : undefined;

        stepState = {
          ...stepState,
          startedAt: new Date().toISOString(),
          customState: customState as State | undefined,
          initialRunState: {
            isRun: true,
          },
        };
      }
    }
    let nextPollAtOverride: Date | undefined;
    let customState = stepState.customState;

    if (stepState?.pollState) {
      const pollResult = await this.stepDefinition.poll.handler(
        this.createPollHandlerContext(
          input,
          rawInput,
          config,
          stepState?.pollState?.attempt ?? 0,
          stepState?.customState
        )
      );

      if (pollResult.output || pollResult.error) {
        return {
          input,
          output: pollResult.output,
          error: pollResult.error
            ? ExecutionError.fromError(pollResult.error).toSerializableObject()
            : undefined,
        };
      }

      if ('nextPollDelayMs' in pollResult && pollResult?.nextPollDelayMs) {
        nextPollAtOverride = new Date(Date.now() + pollResult.nextPollDelayMs);
      }

      if ('state' in pollResult && pollResult.state !== undefined) {
        if (pollResult.state === null) {
          customState = undefined;
        } else {
          customState = pollResult.state as State | undefined;
        }
      }
    }

    const startedAt = stepState.startedAt ?? new Date().toISOString();

    let nextPollAt: string | undefined;
    const attempt = stepState?.pollState?.attempt ?? 0;
    const lastPollAt = stepState?.pollState?.lastPollAt ?? startedAt;
    const nextAttempt = attempt + 1;

    if (nextPollAtOverride) {
      nextPollAt = nextPollAtOverride.toISOString();
    }

    if (!nextPollAt) {
      nextPollAt = await this.calculateNextPollAt({
        currentNextPollAt: stepState.pollState?.nextPollAt ?? startedAt,
        currentAttempt: attempt,
      });
    }

    const data = await this.enforceCeilings({
      ceilings: this.stepDefinition.poll.ceilings,
      attempt,
      nextPollAt,
      lastPollAt: stepState?.pollState?.lastPollAt ?? startedAt,
      startedAt,
    });

    if (data.outcome !== 'success') {
      throw ExecutionError.fromError(new Error('Step execution failed.'));
    }

    nextPollAt = data.nextPollAt;

    stepState = {
      ...stepState,
      pollState: {
        attempt: nextAttempt,
        nextPollAt,
        lastPollAt,
      },
      customState,
    };
    this.setDurableStepState(stepState);

    this.stepExecutionRuntime.enterWaitUntil(
      new Date(nextPollAt),
      {
        [bookkeepingKey]: stepState,
      },
      nextAttempt >= 2 // force task schedule for more than 2 attempts
    );
    return { suspended: true, input };
  }

  private getDurableStepState<State extends Record<string, unknown>>(): DurableStepState<State> {
    const durableStepState =
      this.stepExecutionRuntime.getCurrentStepState()?.[bookkeepingKey] || {};

    return durableStepState as DurableStepState<State>;
  }

  private setDurableStepState<State extends Record<string, unknown>>(
    durableStepState: DurableStepState<State>
  ): void {
    this.stepExecutionRuntime.setCurrentStepState({
      [bookkeepingKey]: durableStepState,
    });
  }

  private createPollHandlerContext<
    Input extends z.ZodType,
    Config extends z.ZodObject,
    State = unknown
  >(
    input: unknown,
    rawInput: unknown,
    config: Record<string, unknown>,
    attempt: number,
    state: State | undefined
  ): PollHandlerContext<Input, Config, State> {
    return {
      ...createHandlerContext(
        input,
        rawInput,
        config,
        this.node,
        this.stepExecutionRuntime,
        this.workflowLogger
      ),
      state,
      attempt,
    } as PollHandlerContext<Input, Config, State>;
  }

  private async calculateNextPollAt(params: {
    currentNextPollAt: string;
    currentAttempt: number;
  }): Promise<string> {
    const { currentNextPollAt: currentNextPollAtString, currentAttempt } = params;
    const currentNextPollAt = new Date(currentNextPollAtString);
    const policy = this.stepDefinition.poll.policy;

    const lastPollAt = new Date(currentNextPollAt);

    switch (policy.strategy) {
      case 'fixed':
        return new Date(currentNextPollAt.getTime() + policy.intervalMs).toISOString();
      case 'exponential': {
        const multiplier = policy.multiplier ?? 2;
        const exponent = Math.max(currentAttempt, 0);
        const raw = policy.initialMs * Math.pow(multiplier, exponent);
        const capped = Math.min(raw, policy.maxMs);
        const delayMs = policy.jitter ? applyBackoffJitter(capped) : Math.floor(capped);
        return new Date(lastPollAt.getTime() + Math.max(0, delayMs)).toISOString();
      }

      default: {
        const unknownPolicy = policy as { strategy: string };
        throw new Error(`Unknown poll policy strategy: ${unknownPolicy.strategy}`);
      }
    }
  }

  private enforceCeilings(params: {
    ceilings?: PollCeilings;
    attempt: number;
    nextPollAt: string;
    lastPollAt: string;
    startedAt: string;
  }): PolicyCalculationResult {
    const {
      ceilings,
      attempt,
      nextPollAt: currentNextPollAtString,
      startedAt: startedAtString,
      lastPollAt: lastPollAtString,
    } = params;
    const maxWaitMs = ceilings?.maxWaitMs ?? DEFAULT_POLL_CEILINGS.maxWaitMs;
    const maxAttempts = ceilings?.maxAttempts ?? DEFAULT_POLL_CEILINGS.maxAttempts;

    if (attempt >= maxAttempts) {
      // Max attempts exceeded, return undefined to indicate that the step should fail.
      return { outcome: 'maxAttemptReached' };
    }

    const startedAt = new Date(startedAtString);
    let nextPollAt = new Date(currentNextPollAtString);
    const lastPollAt = lastPollAtString ? new Date(lastPollAtString) : startedAt;

    if (nextPollAt.getTime() - startedAt.getTime() > maxWaitMs) {
      const timeLeft = startedAt.getTime() + maxWaitMs - lastPollAt.getTime();

      if (timeLeft <= 0) {
        // If no time left, we don't need to schedule a next poll.
        return {
          outcome: 'maxWaitMsExceeded',
        };
      }

      nextPollAt = new Date(lastPollAt.getTime() + timeLeft);
    }

    return {
      outcome: 'success',
      nextPollAt: nextPollAt.toISOString(),
    };
  }
}
