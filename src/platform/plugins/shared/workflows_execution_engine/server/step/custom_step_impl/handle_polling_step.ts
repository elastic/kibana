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
  PollPolicy,
  RunHandoffResult,
  RunPlusPollMode,
} from '@kbn/workflows-extensions/server';
import type { z } from '@kbn/zod/v4';
import { createHandlerContext } from './step_context_handler';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { RunStepResult } from '../node_implementation';

export function applyJitter(delayMs: number, random: () => number = Math.random): number {
  const factor = 0.5 + random();
  return Math.floor(delayMs * factor);
}

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

function createPollHandlerContext<
  Input extends z.ZodType,
  Config extends z.ZodObject,
  State = unknown
>(
  input: unknown,
  rawInput: unknown,
  config: Record<string, unknown>,
  node: AtomicGraphNode,
  stepExecutionRuntime: StepExecutionRuntime,
  workflowLogger: IWorkflowEventLogger,
  attempt: number,
  state: State | undefined
): PollHandlerContext<Input, Config, State> {
  return {
    ...createHandlerContext(input, rawInput, config, node, stepExecutionRuntime, workflowLogger),
    state,
    attempt,
  } as PollHandlerContext<Input, Config, State>;
}

type PollStepDefinition<
  Input extends z.ZodType,
  Output extends z.ZodType,
  Config extends z.ZodObject,
  State
> = PollOnlyMode<Input, Output, Config, State> | RunPlusPollMode<Input, Output, Config, State>;

export async function handlePollingStep<
  Input extends z.ZodType,
  Output extends z.ZodType,
  Config extends z.ZodObject,
  State
>(
  input: unknown,
  rawInput: unknown,
  config: Record<string, unknown>,
  stepDefinition: PollStepDefinition<Input, Output, Config, State>,
  node: AtomicGraphNode,
  stepExecutionRuntime: StepExecutionRuntime,
  workflowLogger: IWorkflowEventLogger
): Promise<RunStepResult> {
  let stepState = (await stepExecutionRuntime.getCurrentStepState())?.[bookkeepingKey] as
    | DurableStepState<State>
    | undefined;

  if (stepDefinition.run) {
    if (!stepState?.initialRunState?.isRun) {
      const result = await stepDefinition.run(
        createHandlerContext(input, rawInput, config, node, stepExecutionRuntime, workflowLogger)
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

  const policyCalculationResult = await calculatePolicyData(
    stepDefinition.poll.policy,
    stepDefinition.poll.ceilings ?? DEFAULT_POLL_CEILINGS,
    stepState || {}
  );

  if (policyCalculationResult.outcome === 'maxAttemptReached') {
    throw ExecutionError.fromError(new Error('Step execution failed.'));
  }

  const attempt =
    policyCalculationResult.outcome === 'maxWaitMsExceeded'
      ? policyCalculationResult.attempt
      : policyCalculationResult.data.nextAttempt;

  const pollResult = await stepDefinition.poll.handler(
    createPollHandlerContext(
      input,
      rawInput,
      config,
      node,
      stepExecutionRuntime,
      workflowLogger,
      attempt,
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

  stepExecutionRuntime.enterWaitUntil(
    policyCalculationResult.data.nextPollAt,
    {
      [bookkeepingKey]: stepState,
    },
    policyCalculationResult.data.nextAttempt >= 2 // force task schedule for more than 2 attempts
  );
  return { suspended: true, input };
}

interface PolicyData {
  nextAttempt: number;
  startedAt: Date;
  /** Epoch ms of the most recent poll handler invocation. */
  lastPollAt: Date;
  nextPollAt: Date;
}

type PolicyCalculationResult =
  | { outcome: 'success'; data: PolicyData }
  | { outcome: 'maxAttemptReached' }
  | { outcome: 'maxWaitMsExceeded'; attempt: number };

async function calculatePolicyData<State>(
  policy: PollPolicy<State>,
  ceilings: PollCeilings,
  durableStepState: DurableStepState
): Promise<PolicyCalculationResult> {
  const currentAttempt = durableStepState.pollState?.attempt ?? 0;
  const startedAt = durableStepState.startedAt ? new Date(durableStepState.startedAt) : new Date();

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
      const factor = policy.factor ?? 2;
      const exponent = Math.max(currentAttempt, 0);
      const raw = policy.initialMs * Math.pow(factor, exponent);
      const capped = Math.min(raw, policy.maxMs);
      const delayMs = policy.jitter ? applyJitter(capped) : Math.floor(capped);
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

  return enforceCeilings(ceilings, policyData);
}

function enforceCeilings(
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
