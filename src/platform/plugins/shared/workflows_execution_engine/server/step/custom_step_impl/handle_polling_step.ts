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
import { DEFAULT_POLL_CEILINGS } from '@kbn/workflows-extensions/server';
import type {
  PollCeilings,
  PollContinueResult,
  PollHandlerContext,
  PollOnlyMode,
  RunHandoffResult,
  RunPlusPollMode,
} from '@kbn/workflows-extensions/server';
import type { z } from '@kbn/zod/v4';
import { createHandlerContext } from './step_context_handler';
import { applyBackoffJitter } from '../../utils/backoff_jitter/backoff_jitter';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { RunStepResult } from '../node_implementation';

const bookkeepingKey = '__durableStepState';

interface DurableStepState<State = unknown> extends Record<string, unknown> {
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

interface PolicyData {
  nextAttempt: number;
  startedAt: Date;
  /** Epoch ms of the most recent poll handler invocation. */
  lastPollAt: Date;
  nextPollAt: Date;
}

export interface StepHandler {
  onCancel(): Promise<void>;
  run<State>(
    input: unknown,
    rawInput: unknown,
    config: Record<string, unknown>
  ): Promise<RunStepResult>;
}

type PolicyCalculationResult =
  | { outcome: 'success'; data: PolicyData }
  | { outcome: 'maxAttemptReached' }
  | { outcome: 'maxWaitMsExceeded'; attempt: number };

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

  public async run<State>(
    input: unknown,
    rawInput: unknown,
    config: Record<string, unknown>
  ): Promise<RunStepResult> {
    let stepState = (await this.stepExecutionRuntime.getCurrentStepState())?.[bookkeepingKey] as
      | DurableStepState<State>
      | undefined;

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

        if (result.output || result.error) {
          return {
            input,
            output: result.output,
            error: result.error
              ? ExecutionError.fromError(result.error).toSerializableObject()
              : undefined,
          };
        }

        stepState = {
          ...stepState,
          startedAt: new Date().toISOString(),
          customState: (result as RunHandoffResult<State>).state || undefined,
          initialRunState: {
            isRun: true,
          },
        };
      }
    }

    const policyCalculationResult = await this.calculatePolicyData(stepState || {});

    if (policyCalculationResult.outcome === 'maxAttemptReached') {
      throw ExecutionError.fromError(new Error('Step execution failed.'));
    }

    const attempt =
      policyCalculationResult.outcome === 'maxWaitMsExceeded'
        ? policyCalculationResult.attempt
        : policyCalculationResult.data.nextAttempt;

    const pollResult = await this.stepDefinition.poll.handler(
      this.createPollHandlerContext(input, rawInput, config, attempt, stepState?.customState)
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

    if (policyCalculationResult.outcome === 'maxWaitMsExceeded') {
      throw ExecutionError.fromError(new Error('Step execution failed.'));
    }

    stepState = {
      ...stepState,
      customState: (pollResult as PollContinueResult<State>).state || undefined,
      pollState: {
        attempt: policyCalculationResult.data.nextAttempt,
        nextPollAt: policyCalculationResult.data.nextPollAt.toISOString(),
        lastPollAt: policyCalculationResult.data.lastPollAt?.toISOString(),
      },
    };

    this.stepExecutionRuntime.enterWaitUntil(
      policyCalculationResult.data.nextPollAt,
      {
        [bookkeepingKey]: stepState,
      },
      policyCalculationResult.data.nextAttempt >= 2 // force task schedule for more than 2 attempts
    );
    return { suspended: true, input };
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

  private async calculatePolicyData<State>(
    durableStepState: DurableStepState
  ): Promise<PolicyCalculationResult> {
    const policy = this.stepDefinition.poll.policy;
    const ceilings = this.stepDefinition.poll.ceilings ?? DEFAULT_POLL_CEILINGS;
    const currentAttempt = durableStepState.pollState?.attempt ?? 0;
    const startedAt = durableStepState.startedAt
      ? new Date(durableStepState.startedAt)
      : new Date();

    const lastPollAt = durableStepState.pollState?.nextPollAt
      ? new Date(durableStepState.pollState.nextPollAt)
      : startedAt;
    let policyData: PolicyData;

    switch (policy.strategy) {
      case 'fixed': {
        policyData = {
          startedAt,
          lastPollAt,
          nextPollAt: new Date(lastPollAt.getTime() + policy.intervalMs),
          nextAttempt: currentAttempt + 1,
        };
        break;
      }
      case 'exponential': {
        const multiplier = policy.multiplier ?? 2;
        const exponent = Math.max(currentAttempt, 0);
        const raw = policy.initialMs * Math.pow(multiplier, exponent);
        const capped = Math.min(raw, policy.maxMs);
        const delayMs = policy.jitter ? applyBackoffJitter(capped) : Math.floor(capped);
        policyData = {
          startedAt,
          lastPollAt,
          nextPollAt: new Date(lastPollAt.getTime() + Math.max(0, delayMs)),
          nextAttempt: currentAttempt + 1,
        };
        break;
      }
      case 'dynamic': {
        const nextResult = await policy.next({
          attempt: currentAttempt,
          startedAt: startedAt.toISOString(),
          lastPollAt: lastPollAt?.toISOString(),
          state: durableStepState.customState as State | undefined,
        });

        policyData = {
          startedAt,
          lastPollAt,
          nextPollAt: new Date(lastPollAt.getTime() + nextResult),
          nextAttempt: currentAttempt + 1,
        };
        break;
      }
      default: {
        const unknownPolicy = policy as { strategy: string };
        throw new Error(`Unknown poll policy strategy: ${unknownPolicy.strategy}`);
      }
    }

    return this.enforceCeilings(ceilings, policyData);
  }

  private enforceCeilings(
    ceilings: PollCeilings,
    pollPolicyData: PolicyData
  ): PolicyCalculationResult {
    const maxWaitMs = ceilings.maxWaitMs ?? DEFAULT_POLL_CEILINGS.maxWaitMs;
    const maxAttempts = ceilings.maxAttempts ?? DEFAULT_POLL_CEILINGS.maxAttempts;
    const startedAt = pollPolicyData.startedAt;

    const lastPollAt = pollPolicyData.lastPollAt;
    let nextPollAt = pollPolicyData.nextPollAt;

    if (pollPolicyData.nextAttempt >= maxAttempts) {
      // Max attempts exceeded, return undefined to indicate that the step should fail.
      return { outcome: 'maxAttemptReached' };
    }

    if (nextPollAt.getTime() - startedAt.getTime() > maxWaitMs) {
      const timeLeft = startedAt.getTime() + maxWaitMs - lastPollAt.getTime();

      if (timeLeft <= 0) {
        // If no time left, we don't need to schedule a next poll.
        return { outcome: 'maxWaitMsExceeded', attempt: pollPolicyData.nextAttempt };
      }

      nextPollAt = new Date(lastPollAt.getTime() + timeLeft);
    }

    return {
      outcome: 'success',
      data: {
        ...pollPolicyData,
        nextPollAt,
      },
    };
  }
}
