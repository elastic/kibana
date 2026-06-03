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
import {
  isPollStepDefinition,
  isStartPlusPollStepDefinition,
} from '@kbn/workflows-extensions/server';
import type {
  DurablePhaseResult,
  PollCeilings,
  PollHandlerContext,
  PollStepDefinition,
  StepHandlerContext,
} from '@kbn/workflows-extensions/server';
import { createBaseHandlerContext } from './create_base_handler_context';
import { applyBackoffJitter } from '../../../utils/backoff_jitter/backoff_jitter';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import type { RunStepResult } from '../../node_implementation';
import type { CustomStepDefinitionHandler } from '../types';

const bookkeepingKey = '__durableStepState';

interface DurableStepState {
  /** Author state JSON persisted between polls (opaque to the engine). */
  customState?: Record<string, unknown>;
  initialStartState?: {
    isStart: boolean;
  };
  pollState?: {
    attempt: number;
    nextPollAt: string;
    /** ISO time when the poll/start phase last completed (not used for ceiling math). */
    lastPollAt: string;
  };
  /** Epoch ms when the step entered its poll loop (after `start`). */
  startedAt?: string;
}

type PolicyCalculationResult =
  | { outcome: 'success'; nextPollAt: string }
  | { outcome: 'maxAttemptReached' };

export class PollPolicyStepHandler implements CustomStepDefinitionHandler {
  constructor(
    private readonly stepDefinition: PollStepDefinition,
    private readonly node: AtomicGraphNode,
    private readonly stepExecutionRuntime: StepExecutionRuntime,
    private readonly workflowLogger: IWorkflowEventLogger
  ) {}

  public async onCancel(
    input: unknown,
    rawInput: unknown,
    config: Record<string, unknown>
  ): Promise<void> {
    if ('onCancel' in this.stepDefinition && this.stepDefinition.onCancel) {
      await this.stepDefinition.onCancel(this.createPollHandlerContext(input, rawInput, config));
    }
  }

  public async run(
    input: unknown,
    rawInput: unknown,
    config: Record<string, unknown>
  ): Promise<RunStepResult> {
    let res;

    if (
      isStartPlusPollStepDefinition(this.stepDefinition) &&
      !this.getDurableStepState().initialStartState?.isStart
    ) {
      res = await this.handleStart(input, rawInput, config);
    } else if (isPollStepDefinition(this.stepDefinition)) {
      res = await this.handlePoll(input, rawInput, config);
    } else {
      throw new Error(`Step "${this.node.stepType}" has no "start" or "poll" phase.`);
    }

    return this.handleDurableResult(input, res);
  }

  private async handleStart(
    input: unknown,
    rawInput: unknown,
    config: Record<string, unknown>
  ): Promise<DurablePhaseResult> {
    if (!isStartPlusPollStepDefinition(this.stepDefinition)) {
      throw new Error(`Step "${this.node.stepType}" has no "start" phase.`);
    }

    const result = await this.stepDefinition.start(
      this.createBaseHandlerContext(input, rawInput, config)
    );

    this.setDurableStepState({
      ...this.getDurableStepState(),
      startedAt: new Date().toISOString(),
      initialStartState: {
        isStart: true,
      },
    });

    return result as DurablePhaseResult;
  }

  private async handlePoll(
    input: unknown,
    rawInput: unknown,
    config: Record<string, unknown>
  ): Promise<DurablePhaseResult> {
    const stepState = this.getDurableStepState();
    const pollResult = await this.stepDefinition.poll(
      this.createPollHandlerContext(input, rawInput, config)
    );

    this.setDurableStepState({
      ...stepState,
      startedAt: stepState.startedAt ?? new Date().toISOString(),
    });

    return pollResult as DurablePhaseResult;
  }

  private async handleDurableResult(
    input: unknown,
    pollResult: DurablePhaseResult
  ): Promise<RunStepResult> {
    let stepState = this.getDurableStepState();

    if (!stepState.startedAt) {
      throw new Error('Step has not started yet.');
    }

    let nextPollAtOverride: Date | undefined;
    let customState = stepState.customState;

    if (pollResult?.output || pollResult?.error) {
      return {
        input,
        output: pollResult.output,
        error: pollResult.error
          ? ExecutionError.fromError(pollResult.error).toSerializableObject()
          : undefined,
      };
    }

    if (pollResult && 'nextPollDelayMs' in pollResult && pollResult.nextPollDelayMs) {
      nextPollAtOverride = new Date(Date.now() + pollResult.nextPollDelayMs);
    }

    if (pollResult && 'state' in pollResult && pollResult.state !== undefined) {
      customState = pollResult.state as Record<string, unknown>;
    }

    let nextPollAt: string | undefined;
    const attempt = stepState?.pollState?.attempt ?? 0;
    const pollCompletedAt = new Date().toISOString();
    const nextAttempt = attempt + 1;

    if (nextPollAtOverride) {
      nextPollAt = nextPollAtOverride.toISOString();
    }

    if (!nextPollAt) {
      nextPollAt = await this.calculateNextPollAt({
        currentAttempt: attempt,
      });
    }

    const data = this.enforceCeilings({
      attempt,
      nextPollAt,
    });

    if (data.outcome === 'maxAttemptReached') {
      const maxAttempts = this.stepDefinition.ceilings?.maxAttempts;
      this.workflowLogger.logWarn(`Poll step attempt ceiling exceeded ${maxAttempts}`);
      throw new ExecutionError({
        type: 'StepFailed',
        message: 'The step did not complete within the allowed time.',
      });
    }

    nextPollAt = data.nextPollAt;

    stepState = {
      ...stepState,
      pollState: {
        attempt: nextAttempt,
        nextPollAt,
        lastPollAt: pollCompletedAt,
      },
      customState,
    };

    this.setDurableStepState(stepState);
    this.stepExecutionRuntime.enterWaitUntil(
      new Date(nextPollAt),
      undefined,
      nextAttempt >= 2 // force task schedule for more than 2 attempts
    );
    return { suspended: true, input };
  }

  private getDurableStepState(): DurableStepState {
    const durableStepState =
      this.stepExecutionRuntime.getCurrentStepState()?.[bookkeepingKey] || {};

    return durableStepState as DurableStepState;
  }

  private setDurableStepState(durableStepState: DurableStepState): void {
    this.stepExecutionRuntime.setCurrentStepState({
      [bookkeepingKey]: durableStepState,
    });
  }

  private createBaseHandlerContext(
    input: unknown,
    rawInput: unknown,
    config: Record<string, unknown>
  ): StepHandlerContext {
    return createBaseHandlerContext(
      input,
      rawInput,
      config,
      this.node,
      this.stepExecutionRuntime,
      this.workflowLogger
    );
  }

  private createPollHandlerContext(
    input: unknown,
    rawInput: unknown,
    config: Record<string, unknown>
  ): PollHandlerContext {
    const stepState = this.getDurableStepState();
    return {
      ...this.createBaseHandlerContext(input, rawInput, config),
      state: stepState.customState,
      attempt: stepState.pollState?.attempt ?? 0,
    } as PollHandlerContext;
  }

  private async calculateNextPollAt(params: { currentAttempt: number }): Promise<string> {
    const { currentAttempt } = params;
    const policy = this.stepDefinition.policy;

    const now = new Date();

    switch (policy.strategy) {
      case 'fixed':
        return new Date(now.getTime() + policy.intervalMs).toISOString();
      case 'exponential': {
        const multiplier = policy.multiplier ?? 2;
        const exponent = Math.max(currentAttempt, 0);
        const raw = policy.initialMs * Math.pow(multiplier, exponent);
        const capped = Math.min(raw, policy.maxMs);
        const delayMs = policy.jitter ? applyBackoffJitter(capped) : Math.floor(capped);
        return new Date(now.getTime() + Math.max(0, delayMs)).toISOString();
      }

      default: {
        const unknownPolicy = policy as { strategy: string };
        throw new Error(`Unknown poll policy strategy: ${unknownPolicy.strategy}`);
      }
    }
  }

  private enforceCeilings(params: {
    attempt: number;
    nextPollAt: string;
  }): PolicyCalculationResult {
    const { attempt, nextPollAt: currentNextPollAtString } = params;
    const ceilings = this.getCeilings();
    const maxWaitMs = ceilings?.maxWaitMs;
    const maxAttempts = ceilings?.maxAttempts;

    if (attempt >= maxAttempts) {
      return { outcome: 'maxAttemptReached' };
    }

    const now = new Date();
    const scheduledNextPollAt = new Date(currentNextPollAtString);
    const scheduledDelayMs = scheduledNextPollAt.getTime() - now.getTime();

    if (scheduledDelayMs < 0) {
      return {
        outcome: 'success',
        nextPollAt: now.toISOString(),
      };
    }

    if (scheduledDelayMs > maxWaitMs) {
      return {
        outcome: 'success',
        nextPollAt: new Date(now.getTime() + maxWaitMs).toISOString(),
      };
    }

    return {
      outcome: 'success',
      nextPollAt: scheduledNextPollAt.toISOString(),
    };
  }

  private getCeilings(): PollCeilings {
    if (!this.stepDefinition.ceilings) {
      throw new Error('Poll step ceilings are not configured');
    }

    return this.stepDefinition.ceilings;
  }
}
