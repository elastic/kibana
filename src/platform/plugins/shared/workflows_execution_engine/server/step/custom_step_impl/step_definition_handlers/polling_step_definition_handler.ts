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

type PolicyCalculationResult =
  | { outcome: 'success'; nextPollAt: string }
  | { outcome: 'maxAttemptReached' }
  | { outcome: 'maxWaitMsExceeded' };

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
    // TBD: Implement cancellation cleanup for polling steps
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

    if ('run' in this.stepDefinition && !this.getDurableStepState().initialRunState?.isRun) {
      res = await this.handleRun(input, rawInput, config);
    } else if (this.stepDefinition.poll) {
      res = await this.handlePoll(input, rawInput, config);
    } else {
      throw new Error(`Step "${this.node.stepType}" has no "run" or "poll" phase.`);
    }

    return this.handleDurableResult(input, res);
  }

  private async handleRun(
    input: unknown,
    rawInput: unknown,
    config: Record<string, unknown>
  ): Promise<DurablePhaseResult> {
    if (!('run' in this.stepDefinition)) {
      throw new Error(`Step "${this.node.stepType}" has no "run" phase.`);
    }

    const result = await this.stepDefinition.run(
      this.createBaseHandlerContext(input, rawInput, config)
    );

    this.setDurableStepState({
      ...this.getDurableStepState(),
      startedAt: new Date().toISOString(),
      initialRunState: {
        isRun: true,
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
    const pollResult = await this.stepDefinition.poll.handler(
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
    const lastPollAt = stepState?.pollState?.lastPollAt ?? stepState.startedAt;
    const nextAttempt = attempt + 1;

    if (nextPollAtOverride) {
      nextPollAt = nextPollAtOverride.toISOString();
    }

    if (!nextPollAt) {
      nextPollAt = await this.calculateNextPollAt({
        currentAttempt: attempt,
      });
    }

    const data = await this.enforceCeilings({
      ceilings: this.stepDefinition.poll.ceilings,
      attempt,
      nextPollAt,
      startedAt: stepState.startedAt,
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
    const policy = this.stepDefinition.poll.policy;

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
    ceilings?: PollCeilings;
    attempt: number;
    nextPollAt: string;
    startedAt: string;
  }): PolicyCalculationResult {
    const {
      ceilings,
      attempt,
      nextPollAt: currentNextPollAtString,
      startedAt: startedAtString,
    } = params;
    const maxWaitMs = ceilings?.maxWaitMs ?? DEFAULT_POLL_CEILINGS.maxWaitMs;
    const maxAttempts = ceilings?.maxAttempts ?? DEFAULT_POLL_CEILINGS.maxAttempts;

    if (attempt >= maxAttempts) {
      // Max attempts exceeded, return undefined to indicate that the step should fail.
      return { outcome: 'maxAttemptReached' };
    }

    const startedAt = new Date(startedAtString);
    let nextPollAt = new Date(currentNextPollAtString);
    const now = new Date();

    if (nextPollAt.getTime() - startedAt.getTime() > maxWaitMs) {
      const timeLeft = startedAt.getTime() + maxWaitMs - now.getTime();

      if (timeLeft <= 0) {
        // If no time left, we don't need to schedule a next poll.
        return {
          outcome: 'maxWaitMsExceeded',
        };
      }

      nextPollAt = new Date(now.getTime() + timeLeft);
    }

    return {
      outcome: 'success',
      nextPollAt: nextPollAt.toISOString(),
    };
  }
}
