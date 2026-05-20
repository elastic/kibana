/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createHandlerTestMocks,
  DURABLE_STEP_STATE_KEY,
  getDurableState,
  type TestNode,
} from './test_helpers';
import { PollPolicyStepHandler } from '../polling_step_definition_handler';

const pollNode: TestNode = {
  stepId: 'poll-step',
  stepType: 'example.asyncJob',
  configuration: { with: {}, 'max-step-size': undefined },
};

const buildPollHandler = (
  stepDefinition: Record<string, unknown>,
  mocks = createHandlerTestMocks(),
  node: TestNode = pollNode
) =>
  new PollPolicyStepHandler(
    stepDefinition as any,
    node as any,
    mocks.stepExecutionRuntime as any,
    mocks.workflowLogger as any
  );

describe('PollPolicyStepHandler', () => {
  describe('run + poll lifecycle', () => {
    it('run + poll: { state } from run schedules first poll without invoking poll handler', async () => {
      const run = jest.fn().mockResolvedValue({ state: { actionId: 'abc' } });
      const pollHandler = jest.fn();
      const stepDefinition = {
        run,
        poll: {
          handler: pollHandler,
          policy: { strategy: 'fixed' as const, intervalMs: 5_000 },
          ceilings: { maxAttempts: 10, maxWaitMs: 60_000 },
        },
      };
      const mocks = createHandlerTestMocks();
      const handler = buildPollHandler(stepDefinition, mocks);

      const result = await handler.run({}, {}, pollNode.configuration);
      expect(result.suspended).toBe(true);
      expect(result.output).toBeUndefined();
      expect(pollHandler).not.toHaveBeenCalled();
      expect(mocks.stepExecutionRuntime.enterWaitUntil).toHaveBeenCalledTimes(1);

      const durable = getDurableState(mocks.persistedState.value);
      expect(durable.customState).toEqual({ actionId: 'abc' });
      expect(durable.initialRunState?.isRun).toBe(true);
      expect(durable.pollState?.attempt).toBe(1);
      expect(typeof durable.startedAt).toBe('string');
    });

    it('poll-only: invokes poll handler on first execution and continues on { state }', async () => {
      const pollHandler = jest.fn().mockResolvedValue({ state: { progress: 1 } });
      const stepDefinition = {
        poll: {
          handler: pollHandler,
          policy: { strategy: 'fixed' as const, intervalMs: 1_000 },
          ceilings: { maxAttempts: 10, maxWaitMs: 60_000 },
        },
      };
      const mocks = createHandlerTestMocks();
      const handler = buildPollHandler(stepDefinition, mocks);

      const result = await handler.run({}, {}, pollNode.configuration);
      expect(result.suspended).toBe(true);
      expect(pollHandler).toHaveBeenCalledTimes(1);
      expect(pollHandler.mock.calls[0][0]).toMatchObject({
        attempt: 0,
        state: undefined,
      });

      const durable = getDurableState(mocks.persistedState.value);
      expect(durable.customState).toEqual({ progress: 1 });
      expect(durable.pollState?.attempt).toBe(1);
    });

    it('resumed invocation: hydrates author state, calls poll, schedules next on { state }', async () => {
      const pollHandler = jest.fn().mockResolvedValue({ state: { progress: 2 } });
      const startedAt = new Date(Date.now() - 5_000).toISOString();
      const initialState = {
        [DURABLE_STEP_STATE_KEY]: {
          startedAt,
          initialRunState: { isRun: true },
          pollState: {
            attempt: 1,
            nextPollAt: startedAt,
            lastPollAt: startedAt,
          },
          customState: { progress: 1 },
        },
      };
      const mocks = createHandlerTestMocks(initialState);
      const stepDefinition = {
        poll: {
          handler: pollHandler,
          policy: { strategy: 'fixed' as const, intervalMs: 5_000 },
          ceilings: { maxAttempts: 100, maxWaitMs: 60 * 60_000 },
        },
      };
      const handler = buildPollHandler(stepDefinition, mocks);

      const result = await handler.run({}, {}, pollNode.configuration);
      expect(result.suspended).toBe(true);
      expect(pollHandler).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 1, state: { progress: 1 } })
      );

      const durable = getDurableState(mocks.persistedState.value);
      expect(durable.customState).toEqual({ progress: 2 });
      expect(durable.pollState?.attempt).toBe(2);
    });

    it('resumed invocation: { output } finalizes the step', async () => {
      const pollHandler = jest.fn().mockResolvedValue({ output: { rows: [1, 2, 3] } });
      const startedAt = new Date(Date.now() - 10_000).toISOString();
      const initialState = {
        [DURABLE_STEP_STATE_KEY]: {
          startedAt,
          initialRunState: { isRun: true },
          pollState: {
            attempt: 3,
            nextPollAt: startedAt,
            lastPollAt: startedAt,
          },
          customState: { actionId: 'abc' },
        },
      };
      const mocks = createHandlerTestMocks(initialState);
      const stepDefinition = {
        poll: {
          handler: pollHandler,
          policy: { strategy: 'fixed' as const, intervalMs: 5_000 },
        },
      };
      const handler = buildPollHandler(stepDefinition, mocks);

      const result = await handler.run({}, {}, pollNode.configuration);
      expect(result).toEqual({
        input: {},
        output: { rows: [1, 2, 3] },
        error: undefined,
      });
      expect(mocks.stepExecutionRuntime.enterWaitUntil).not.toHaveBeenCalled();
    });

    it('keeps previous author state when poll handler returns undefined', async () => {
      const pollHandler = jest.fn().mockResolvedValue(undefined);
      const startedAt = new Date(Date.now() - 2_000).toISOString();
      const initialState = {
        [DURABLE_STEP_STATE_KEY]: {
          startedAt,
          pollState: { attempt: 1, nextPollAt: startedAt, lastPollAt: startedAt },
          customState: { kept: true },
        },
      };
      const mocks = createHandlerTestMocks(initialState);
      const stepDefinition = {
        poll: {
          handler: pollHandler,
          policy: { strategy: 'fixed' as const, intervalMs: 1_000 },
          ceilings: { maxAttempts: 10, maxWaitMs: 60_000 },
        },
      };
      const handler = buildPollHandler(stepDefinition, mocks);

      const result = await handler.run({}, {}, pollNode.configuration);

      expect(result.suspended).toBe(true);
      expect(getDurableState(mocks.persistedState.value).customState).toEqual({ kept: true });
    });

    it('keeps previous author state when poll returns an empty continuation', async () => {
      const pollHandler = jest.fn().mockResolvedValue({});
      const startedAt = new Date(Date.now() - 2_000).toISOString();
      const initialState = {
        [DURABLE_STEP_STATE_KEY]: {
          startedAt,
          pollState: { attempt: 1, nextPollAt: startedAt, lastPollAt: startedAt },
          customState: { kept: true },
        },
      };
      const mocks = createHandlerTestMocks(initialState);
      const stepDefinition = {
        poll: {
          handler: pollHandler,
          policy: { strategy: 'fixed' as const, intervalMs: 1_000 },
          ceilings: { maxAttempts: 10, maxWaitMs: 60_000 },
        },
      };
      const handler = buildPollHandler(stepDefinition, mocks);

      await handler.run({}, {}, pollNode.configuration);

      expect(getDurableState(mocks.persistedState.value).customState).toEqual({ kept: true });
    });

    it('fails the step when maxAttempts ceiling is reached', async () => {
      const pollHandler = jest.fn().mockResolvedValue({ state: {} });
      const startedAt = new Date(Date.now() - 1_000).toISOString();
      const initialState = {
        [DURABLE_STEP_STATE_KEY]: {
          startedAt,
          pollState: {
            attempt: 5,
            nextPollAt: startedAt,
            lastPollAt: startedAt,
          },
        },
      };
      const mocks = createHandlerTestMocks(initialState);
      const stepDefinition = {
        poll: {
          handler: pollHandler,
          policy: { strategy: 'fixed' as const, intervalMs: 100 },
          ceilings: { maxAttempts: 5, maxWaitMs: 60_000 },
        },
      };
      const handler = buildPollHandler(stepDefinition, mocks);

      await expect(handler.run({}, {}, pollNode.configuration)).rejects.toThrow(
        /Step execution failed/
      );
      expect(mocks.stepExecutionRuntime.enterWaitUntil).not.toHaveBeenCalled();
    });

    it('fails the step when maxWaitMs has already elapsed', async () => {
      const pollHandler = jest.fn().mockResolvedValue({});
      const startedAt = new Date(Date.now() - 61_000).toISOString();
      const initialState = {
        [DURABLE_STEP_STATE_KEY]: {
          startedAt,
          pollState: {
            attempt: 5,
            nextPollAt: startedAt,
            lastPollAt: new Date(Date.now() - 1_000).toISOString(),
          },
        },
      };
      const mocks = createHandlerTestMocks(initialState);
      const stepDefinition = {
        poll: {
          handler: pollHandler,
          policy: { strategy: 'fixed' as const, intervalMs: 10_000 },
          ceilings: { maxAttempts: 100, maxWaitMs: 60_000 },
        },
      };
      const handler = buildPollHandler(stepDefinition, mocks);

      await expect(handler.run({}, {}, pollNode.configuration)).rejects.toThrow(
        /Step execution failed/
      );
    });

    it('uses nextPollDelayMs override for the next wake-up when provided', async () => {
      const pollHandler = jest.fn().mockResolvedValue({ state: {}, nextPollDelayMs: 123 });
      const startedAt = new Date(Date.now() - 1_000).toISOString();
      const before = Date.now();
      const initialState = {
        [DURABLE_STEP_STATE_KEY]: {
          startedAt,
          pollState: { attempt: 0, nextPollAt: startedAt, lastPollAt: startedAt },
        },
      };
      const mocks = createHandlerTestMocks(initialState);
      const stepDefinition = {
        poll: {
          handler: pollHandler,
          policy: { strategy: 'fixed' as const, intervalMs: 60_000 },
          ceilings: { maxAttempts: 10, maxWaitMs: 120_000 },
        },
      };
      const handler = buildPollHandler(stepDefinition, mocks);

      await handler.run({}, {}, pollNode.configuration);

      const resumeAt = (mocks.stepExecutionRuntime.enterWaitUntil as jest.Mock).mock
        .calls[0][0] as Date;
      expect(resumeAt.getTime()).toBeGreaterThanOrEqual(before + 123);
      expect(resumeAt.getTime()).toBeLessThanOrEqual(Date.now() + 123 + 50);
    });
  });

  describe('onCancel', () => {
    it('invokes step definition onCancel with poll context when defined', async () => {
      const onCancel = jest.fn();
      const pollHandler = jest.fn().mockResolvedValue({ output: { done: true } });
      const startedAt = new Date().toISOString();
      const initialState = {
        [DURABLE_STEP_STATE_KEY]: {
          startedAt,
          pollState: { attempt: 0, nextPollAt: startedAt, lastPollAt: startedAt },
          customState: { jobId: 'job-1' },
        },
      };
      const mocks = createHandlerTestMocks(initialState);
      const stepDefinition = {
        poll: {
          handler: pollHandler,
          policy: { strategy: 'fixed' as const, intervalMs: 1_000 },
        },
        onCancel,
      };
      const handler = buildPollHandler(stepDefinition, mocks);

      await handler.onCancel({ job: 1 }, {}, pollNode.configuration);

      expect(onCancel).toHaveBeenCalledWith(
        expect.objectContaining({
          input: { job: 1 },
          state: { jobId: 'job-1' },
          attempt: 0,
        })
      );
    });
  });
});
