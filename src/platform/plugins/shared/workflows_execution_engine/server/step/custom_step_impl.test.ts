/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CustomStepImpl, POLL_AUTHOR_STATE_KEY, POLL_BOOKKEEPING_KEY } from '.';

const createMocks = (initialPersistedState?: Record<string, unknown>) => {
  const persistedState: { value: Record<string, unknown> | undefined } = {
    value: initialPersistedState,
  };
  const stepExecutionRuntime = {
    contextManager: {
      renderValueAccordingToContext: jest.fn((v: unknown) => v),
      getContext: jest.fn(() => ({})),
      getEsClientAsUser: jest.fn(() => ({})),
      getFakeRequest: jest.fn(() => null),
    },
    abortController: new AbortController(),
    node: { configuration: { with: { key: 'value' } } },
    startStep: jest.fn(),
    flushEventLogs: jest.fn().mockResolvedValue(undefined),
    finishStep: jest.fn(),
    failStep: jest.fn(),
    setInput: jest.fn(),
    stepExecutionId: 'step-exec-1',
    workflowExecution: { workflowDefinition: {} },
    getCurrentStepState: jest.fn(() => persistedState.value),
    enterWaitUntil: jest.fn((resumeDate: Date, additionalState?: Record<string, unknown>) => {
      const next: Record<string, unknown> = {
        ...(persistedState.value ?? {}),
        ...(additionalState ?? {}),
        resumeAt: resumeDate.toISOString(),
      };
      for (const key of Object.keys(next)) {
        if (next[key] === undefined) {
          delete next[key];
        }
      }
      persistedState.value = next;
    }),
  };

  const connectorExecutor = {};

  const workflowRuntime = {
    navigateToNextNode: jest.fn(),
  };

  const workflowLogger = {
    logInfo: jest.fn(),
    logError: jest.fn(),
    logDebug: jest.fn(),
    logWarn: jest.fn(),
  };

  return {
    stepExecutionRuntime,
    connectorExecutor,
    workflowRuntime,
    workflowLogger,
    persistedState,
  };
};

describe('CustomStepImpl', () => {
  it('executes the handler and returns output', async () => {
    const { stepExecutionRuntime, connectorExecutor, workflowRuntime, workflowLogger } =
      createMocks();

    const handler = jest.fn().mockResolvedValue({ output: { result: 42 } });
    const stepDefinition = { handler };

    const node = {
      stepId: 'custom-step',
      stepType: 'my-custom-type',
      configuration: { with: { key: 'value' }, 'max-step-size': undefined },
    };

    const impl = new CustomStepImpl(
      node as any,
      stepDefinition as any,
      stepExecutionRuntime as any,
      connectorExecutor as any,
      workflowRuntime as any,
      workflowLogger as any
    );

    const result = await (impl as any)._run({ key: 'value' });
    expect(result.output).toEqual({ result: 42 });
    expect(result.error).toBeUndefined();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { key: 'value' },
        stepId: 'custom-step',
        stepType: 'my-custom-type',
      })
    );
  });

  it('returns error when handler returns an error', async () => {
    const { stepExecutionRuntime, connectorExecutor, workflowRuntime, workflowLogger } =
      createMocks();

    const handler = jest
      .fn()
      .mockResolvedValue({ output: undefined, error: new Error('handler error') });
    const stepDefinition = { handler };

    const node = {
      stepId: 'custom-step',
      stepType: 'my-custom-type',
      configuration: { with: {}, 'max-step-size': undefined },
    };

    const impl = new CustomStepImpl(
      node as any,
      stepDefinition as any,
      stepExecutionRuntime as any,
      connectorExecutor as any,
      workflowRuntime as any,
      workflowLogger as any
    );

    const result = await (impl as any)._run({});
    expect(result.error).toBeDefined();
  });

  it('catches handler exceptions and returns them as errors', async () => {
    const { stepExecutionRuntime, connectorExecutor, workflowRuntime, workflowLogger } =
      createMocks();

    const handler = jest.fn().mockRejectedValue(new Error('handler threw'));
    const stepDefinition = { handler };

    const node = {
      stepId: 'custom-step',
      stepType: 'my-custom-type',
      configuration: { with: {}, 'max-step-size': undefined },
    };

    const impl = new CustomStepImpl(
      node as any,
      stepDefinition as any,
      stepExecutionRuntime as any,
      connectorExecutor as any,
      workflowRuntime as any,
      workflowLogger as any
    );

    const result = await (impl as any)._run({});
    expect(result.error).toBeDefined();
    expect(result.output).toBeUndefined();
  });

  it('registers onCancel when step definition provides it', () => {
    const { stepExecutionRuntime, connectorExecutor, workflowRuntime, workflowLogger } =
      createMocks();

    const onCancel = jest.fn();
    const handler = jest.fn();
    const stepDefinition = { handler, onCancel };

    const node = {
      stepId: 'custom-step',
      stepType: 'my-custom-type',
      configuration: { with: {}, 'max-step-size': undefined },
    };

    const impl = new CustomStepImpl(
      node as any,
      stepDefinition as any,
      stepExecutionRuntime as any,
      connectorExecutor as any,
      workflowRuntime as any,
      workflowLogger as any
    );

    expect(typeof (impl as any).onCancel).toBe('function');
  });

  it('getInput renders the with data from node configuration', () => {
    const { stepExecutionRuntime, connectorExecutor, workflowRuntime, workflowLogger } =
      createMocks();

    const handler = jest.fn();
    const stepDefinition = { handler };

    const node = {
      stepId: 'custom-step',
      stepType: 'my-custom-type',
      configuration: { with: { foo: 'bar' }, 'max-step-size': undefined },
    };

    const impl = new CustomStepImpl(
      node as any,
      stepDefinition as any,
      stepExecutionRuntime as any,
      connectorExecutor as any,
      workflowRuntime as any,
      workflowLogger as any
    );

    const input = impl.getInput();
    expect(input).toEqual({ foo: 'bar' });
    expect(stepExecutionRuntime.contextManager.renderValueAccordingToContext).toHaveBeenCalledWith({
      foo: 'bar',
    });
  });

  describe('run + poll lifecycle', () => {
    const node = {
      stepId: 'poll-step',
      stepType: 'osquery.runQueryAndWait',
      configuration: { with: {}, 'max-step-size': undefined },
    };

    const buildImpl = (
      stepDefinition: unknown,
      mocks: ReturnType<typeof createMocks> = createMocks()
    ) => {
      const impl = new CustomStepImpl(
        node as any,
        stepDefinition as any,
        mocks.stepExecutionRuntime as any,
        mocks.connectorExecutor as any,
        mocks.workflowRuntime as any,
        mocks.workflowLogger as any
      );
      return { impl, mocks };
    };

    it('handler-only definition finalizes immediately on { output }', async () => {
      const handler = jest.fn().mockResolvedValue({ output: { ok: true } });
      const { impl, mocks } = buildImpl({ handler });

      const result = await (impl as any)._run({});
      expect(result).toEqual({ input: {}, output: { ok: true }, error: undefined });
      expect(mocks.stepExecutionRuntime.enterWaitUntil).not.toHaveBeenCalled();
    });

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
      const { impl, mocks } = buildImpl(stepDefinition);

      const result = await (impl as any)._run({});
      expect(result.suspended).toBe(true);
      expect(result.output).toBeUndefined();
      expect(pollHandler).not.toHaveBeenCalled();
      expect(mocks.stepExecutionRuntime.enterWaitUntil).toHaveBeenCalledTimes(1);

      const persisted = mocks.persistedState.value!;
      expect(persisted[POLL_AUTHOR_STATE_KEY]).toEqual({ actionId: 'abc' });
      const bookkeeping = persisted[POLL_BOOKKEEPING_KEY] as {
        attempt: number;
        startedAt: number;
      };
      expect(bookkeeping.attempt).toBe(0);
      expect(typeof bookkeeping.startedAt).toBe('number');
    });

    it('poll-only: invokes poll handler immediately on first execution and continues on { state }', async () => {
      const pollHandler = jest.fn().mockResolvedValue({ state: { progress: 1 } });
      const stepDefinition = {
        poll: {
          handler: pollHandler,
          policy: { strategy: 'fixed' as const, intervalMs: 1_000 },
          ceilings: { maxAttempts: 10, maxWaitMs: 60_000 },
        },
      };
      const { impl, mocks } = buildImpl(stepDefinition);

      const result = await (impl as any)._run({});
      expect(result.suspended).toBe(true);
      expect(pollHandler).toHaveBeenCalledTimes(1);
      expect(pollHandler.mock.calls[0][0]).toMatchObject({
        attempt: 1,
        state: undefined,
      });

      const persisted = mocks.persistedState.value!;
      expect(persisted[POLL_AUTHOR_STATE_KEY]).toEqual({ progress: 1 });
      expect((persisted[POLL_BOOKKEEPING_KEY] as { attempt: number }).attempt).toBe(1);
    });

    it('resumed invocation: hydrates author state, calls poll, schedules next on { state }', async () => {
      const pollHandler = jest.fn().mockResolvedValue({ state: { progress: 2 } });
      const startedAt = Date.now() - 5_000;
      const initialState = {
        [POLL_BOOKKEEPING_KEY]: {
          attempt: 1,
          startedAt,
          lastInvocationAt: startedAt,
        },
        [POLL_AUTHOR_STATE_KEY]: { progress: 1 },
      };
      const mocks = createMocks(initialState);
      const stepDefinition = {
        poll: {
          handler: pollHandler,
          policy: { strategy: 'fixed' as const, intervalMs: 5_000 },
          ceilings: { maxAttempts: 100, maxWaitMs: 60 * 60_000 },
        },
      };
      const { impl } = buildImpl(stepDefinition, mocks);

      const result = await (impl as any)._run({});
      expect(result.suspended).toBe(true);
      expect(pollHandler).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 2, state: { progress: 1 } })
      );

      const persisted = mocks.persistedState.value!;
      expect(persisted[POLL_AUTHOR_STATE_KEY]).toEqual({ progress: 2 });
      expect((persisted[POLL_BOOKKEEPING_KEY] as { attempt: number }).attempt).toBe(2);
    });

    it('resumed invocation: { output } finalizes the step', async () => {
      const pollHandler = jest.fn().mockResolvedValue({ output: { rows: [1, 2, 3] } });
      const t = Date.now() - 10_000;
      const initialState = {
        [POLL_BOOKKEEPING_KEY]: {
          attempt: 3,
          startedAt: t,
          lastInvocationAt: t,
        },
        [POLL_AUTHOR_STATE_KEY]: { actionId: 'abc' },
      };
      const mocks = createMocks(initialState);
      const stepDefinition = {
        poll: {
          handler: pollHandler,
          policy: { strategy: 'fixed' as const, intervalMs: 5_000 },
        },
      };
      const { impl } = buildImpl(stepDefinition, mocks);

      const result = await (impl as any)._run({});
      expect(result).toEqual({
        input: {},
        output: { rows: [1, 2, 3] },
        error: undefined,
      });
      expect(mocks.stepExecutionRuntime.enterWaitUntil).not.toHaveBeenCalled();
    });

    it('keeps previous author state when poll returns { state: undefined }', async () => {
      const pollHandler = jest.fn().mockResolvedValue({});
      const t = Date.now() - 2_000;
      const initialState = {
        [POLL_BOOKKEEPING_KEY]: {
          attempt: 1,
          startedAt: t,
          lastInvocationAt: t,
        },
        [POLL_AUTHOR_STATE_KEY]: { kept: true },
      };
      const mocks = createMocks(initialState);
      const stepDefinition = {
        poll: {
          handler: pollHandler,
          policy: { strategy: 'fixed' as const, intervalMs: 1_000 },
          ceilings: { maxAttempts: 10, maxWaitMs: 60_000 },
        },
      };
      const { impl } = buildImpl(stepDefinition, mocks);

      await (impl as any)._run({});

      expect(mocks.persistedState.value![POLL_AUTHOR_STATE_KEY]).toEqual({ kept: true });
    });

    it('clears author state when poll returns { state: null }', async () => {
      const pollHandler = jest.fn().mockResolvedValue({ state: null });
      const t = Date.now() - 2_000;
      const initialState = {
        [POLL_BOOKKEEPING_KEY]: {
          attempt: 1,
          startedAt: t,
          lastInvocationAt: t,
        },
        [POLL_AUTHOR_STATE_KEY]: { stale: true },
      };
      const mocks = createMocks(initialState);
      const stepDefinition = {
        poll: {
          handler: pollHandler,
          policy: { strategy: 'fixed' as const, intervalMs: 1_000 },
          ceilings: { maxAttempts: 10, maxWaitMs: 60_000 },
        },
      };
      const { impl } = buildImpl(stepDefinition, mocks);

      await (impl as any)._run({});

      expect(mocks.persistedState.value![POLL_AUTHOR_STATE_KEY]).toBeUndefined();
    });

    it('fails the step with PollCeilingExceeded when maxAttempts is reached', async () => {
      const pollHandler = jest.fn().mockResolvedValue({ state: {} });
      const initialState = {
        [POLL_BOOKKEEPING_KEY]: {
          attempt: 4,
          startedAt: Date.now() - 1_000,
          lastInvocationAt: Date.now() - 100,
        },
        [POLL_AUTHOR_STATE_KEY]: undefined,
      };
      const mocks = createMocks(initialState);
      const stepDefinition = {
        poll: {
          handler: pollHandler,
          policy: { strategy: 'fixed' as const, intervalMs: 100 },
          ceilings: { maxAttempts: 5, maxWaitMs: 60_000 },
        },
      };
      const { impl } = buildImpl(stepDefinition, mocks);

      const result = await (impl as any)._run({});
      expect(result.suspended).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error.type).toBe('PollCeilingExceeded');
      expect(result.error.details.reason).toBe('maxAttempts');
      expect(mocks.stepExecutionRuntime.enterWaitUntil).not.toHaveBeenCalled();
    });

    it('fails the step pre-emptively when next sleep would exceed maxWaitMs', async () => {
      const pollHandler = jest.fn().mockResolvedValue({});
      const startedAt = Date.now() - 55_000; // 55s ago
      const initialState = {
        [POLL_BOOKKEEPING_KEY]: {
          attempt: 5,
          startedAt,
          lastInvocationAt: Date.now() - 1_000,
        },
        [POLL_AUTHOR_STATE_KEY]: undefined,
      };
      const mocks = createMocks(initialState);
      const stepDefinition = {
        poll: {
          handler: pollHandler,
          policy: { strategy: 'fixed' as const, intervalMs: 10_000 }, // would push past 60s ceiling
          ceilings: { maxAttempts: 100, maxWaitMs: 60_000 },
        },
      };
      const { impl } = buildImpl(stepDefinition, mocks);

      const result = await (impl as any)._run({});
      expect(result.error?.type).toBe('PollCeilingExceeded');
      expect(result.error?.details.reason).toBe('maxWaitMs');
    });

    it('catches exceptions thrown by the poll handler and returns them as errors', async () => {
      const pollHandler = jest.fn().mockRejectedValue(new Error('upstream blew up'));
      const stepDefinition = {
        poll: {
          handler: pollHandler,
          policy: { strategy: 'fixed' as const, intervalMs: 1_000 },
          ceilings: { maxAttempts: 5, maxWaitMs: 60_000 },
        },
      };
      const { impl } = buildImpl(stepDefinition);

      const result = await (impl as any)._run({});
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('upstream blew up');
      expect(result.suspended).toBeUndefined();
    });

    it('throws when run is declared without poll (defensive)', async () => {
      const run = jest.fn().mockResolvedValue({ state: {} });
      const stepDefinition = { run };
      const { impl } = buildImpl(stepDefinition);

      const result = await (impl as any)._run({});
      expect(result.error).toBeDefined();
      expect(result.error.message).toMatch(/defines "run" without "poll"/);
    });
  });
});
