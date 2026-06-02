/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
    stepExecutionId: 'step-exec-1',
    workflowExecution: { workflowDefinition: {} },
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
});
