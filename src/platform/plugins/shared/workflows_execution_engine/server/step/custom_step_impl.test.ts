/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { CustomStepImpl } from './custom_step_impl';

const createMocks = () => {
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
    setCurrentStepState: jest.fn(),
    getCurrentStepState: jest.fn().mockReturnValue(undefined),
    tryEnterWaitUntil: jest.fn(),
    stepExecutionId: 'step-exec-1',
    workflowExecution: { workflowDefinition: {}, context: {} },
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

  return { stepExecutionRuntime, connectorExecutor, workflowRuntime, workflowLogger };
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

  describe('run() - WAITING_FOR_INPUT branch', () => {
    const makeWaitingImpl = (
      waitingForInput: Record<string, unknown>,
      currentStepState?: Record<string, unknown>
    ) => {
      const mocks = createMocks();
      mocks.stepExecutionRuntime.getCurrentStepState.mockReturnValue(currentStepState);

      const handler = jest.fn().mockResolvedValue({ waitingForInput });
      const stepDefinition = { handler };

      const node = {
        stepId: 'hitl-step',
        stepType: 'hitl-type',
        configuration: { with: {}, 'max-step-size': undefined },
      };

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

    it('calls setCurrentStepState with the kind sentinel on the initial run', async () => {
      const { impl, mocks } = makeWaitingImpl({ message: 'prompt' });

      await impl.run();

      expect(mocks.stepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'waiting_for_input' })
      );
    });

    it('spreads waitingForInput.stepState into the persisted state', async () => {
      const { impl, mocks } = makeWaitingImpl({
        stepState: { innerExecutionId: 'exec-99', conversationId: 'conv-1' },
      });

      await impl.run();

      expect(mocks.stepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith({
        kind: 'waiting_for_input',
        innerExecutionId: 'exec-99',
        conversationId: 'conv-1',
      });
    });

    it('calls setInput with agent_context when provided', async () => {
      const agentContext = {
        intended_tool: 'myTool',
        intended_tool_args: { x: 1 },
        reasoning: 'because',
      };
      const { impl, mocks } = makeWaitingImpl({ agent_context: agentContext });

      await impl.run();

      const calls = mocks.stepExecutionRuntime.setInput.mock.calls;
      // The second setInput call is the HITL-specific one (first is the initial input)
      const hitlSetInputCall = calls.find(
        (call: unknown[]) => (call[0] as Record<string, unknown>).agent_context !== undefined
      );
      expect(hitlSetInputCall).toBeDefined();
      expect(hitlSetInputCall![0]).toEqual({ agent_context: agentContext });
    });

    it('omits agent_context from setInput when undefined', async () => {
      const { impl, mocks } = makeWaitingImpl({ message: 'prompt' });

      await impl.run();

      const calls = mocks.stepExecutionRuntime.setInput.mock.calls;
      const hitlSetInputCall = calls[calls.length - 1];
      expect(hitlSetInputCall[0]).not.toHaveProperty('agent_context');
    });

    it('calls tryEnterWaitUntil with WAITING_FOR_INPUT status', async () => {
      const { impl, mocks } = makeWaitingImpl({ message: 'prompt' });

      await impl.run();

      expect(mocks.stepExecutionRuntime.tryEnterWaitUntil).toHaveBeenCalledWith(
        undefined,
        ExecutionStatus.WAITING_FOR_INPUT
      );
    });

    it('does NOT call navigateToNextNode when entering WAITING_FOR_INPUT', async () => {
      const { impl, mocks } = makeWaitingImpl({ message: 'prompt' });

      await impl.run();

      expect(mocks.workflowRuntime.navigateToNextNode).not.toHaveBeenCalled();
    });

    it('does NOT call setCurrentStepState on the resume run', async () => {
      // Even if handler returns waitingForInput, isResuming=true suppresses the pause branch
      const mocks = createMocks();
      mocks.stepExecutionRuntime.getCurrentStepState.mockReturnValue({
        kind: 'waiting_for_input',
        innerExecutionId: 'exec-1',
      });

      const handler = jest.fn().mockResolvedValue({ waitingForInput: { message: 'prompt' } });
      const node = {
        stepId: 'hitl-step',
        stepType: 'hitl-type',
        configuration: { with: {}, 'max-step-size': undefined },
      };
      const impl = new CustomStepImpl(
        node as any,
        { handler } as any,
        mocks.stepExecutionRuntime as any,
        mocks.connectorExecutor as any,
        mocks.workflowRuntime as any,
        mocks.workflowLogger as any
      );

      await impl.run();

      expect(mocks.stepExecutionRuntime.setCurrentStepState).not.toHaveBeenCalled();
    });
  });
});
