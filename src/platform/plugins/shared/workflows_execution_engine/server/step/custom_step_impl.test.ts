/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { CustomStepImpl } from './custom_step_impl';

const createMocks = () => {
  const stepExecutionRuntime = {
    contextManager: {
      renderValueAccordingToContext: jest.fn((v: unknown) => v),
      getContext: jest.fn(() => ({})),
      getEsClientAsUser: jest.fn(() => ({})),
      getFakeRequest: jest.fn(() => null),
      callKibanaApi: jest.fn(),
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
        rawInput: { key: 'value' },
        config: {},
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

  it('exposes callKibanaApi on the handler contextManager and forwards calls', async () => {
    const { stepExecutionRuntime, connectorExecutor, workflowRuntime, workflowLogger } =
      createMocks();
    stepExecutionRuntime.contextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: { ok: true },
    });

    let observedCallKibanaApi: unknown;
    const handler = jest.fn(async (ctx: any) => {
      observedCallKibanaApi = ctx.contextManager.callKibanaApi;
      const result = await ctx.contextManager.callKibanaApi({ method: 'GET', path: '/api/status' });
      return { output: result };
    });
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
    expect(typeof observedCallKibanaApi).toBe('function');
    expect(stepExecutionRuntime.contextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/status',
      signal: stepExecutionRuntime.abortController.signal,
    });
    expect(result.output).toEqual({ status: 200, headers: {}, body: { ok: true } });
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

  it('passes rendered schema-defined config to the handler', async () => {
    const { stepExecutionRuntime, connectorExecutor, workflowRuntime, workflowLogger } =
      createMocks();

    const renderedConfig = {
      'agent-id': 'elastic-ai-agent',
      'connector-id': 'my-connector',
      'create-conversation': true,
    };
    stepExecutionRuntime.contextManager.renderValueAccordingToContext.mockReturnValueOnce(
      renderedConfig
    );

    const handler = jest.fn().mockResolvedValue({ output: { result: 42 } });
    const stepDefinition = {
      configSchema: z.object({
        'agent-id': z.string().optional(),
        'connector-id': z.string().optional(),
        'create-conversation': z.boolean().optional(),
      }),
      handler,
    };

    const node = {
      stepId: 'custom-step',
      stepType: 'ai.agent',
      configuration: {
        name: 'custom-step',
        type: 'ai.agent',
        'agent-id': '{{ consts.agent_id }}',
        'connector-id': '{{ inputs.connector_id }}',
        'create-conversation': true,
        with: { message: 'hello' },
        'max-step-size': undefined,
        unexpected: '{{ consts.unexpected }}',
      },
    };

    const impl = new CustomStepImpl(
      node as any,
      stepDefinition as any,
      stepExecutionRuntime as any,
      connectorExecutor as any,
      workflowRuntime as any,
      workflowLogger as any
    );

    await (impl as any)._run({ message: 'hello' });

    expect(stepExecutionRuntime.contextManager.renderValueAccordingToContext).toHaveBeenCalledWith({
      'agent-id': '{{ consts.agent_id }}',
      'connector-id': '{{ inputs.connector_id }}',
      'create-conversation': true,
    });
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        config: renderedConfig,
        rawInput: { message: 'hello' },
      })
    );
  });

  it('filters config to keys declared by the config schema', async () => {
    const { stepExecutionRuntime, connectorExecutor, workflowRuntime, workflowLogger } =
      createMocks();

    const handler = jest.fn().mockResolvedValue({ output: { result: 42 } });
    const stepDefinition = {
      configSchema: z.object({
        source: z.unknown(),
      }),
      handler,
    };

    const node = {
      stepId: 'custom-step',
      stepType: 'data.parse_json',
      configuration: {
        name: 'custom-step',
        type: 'data.parse_json',
        source: '{{ steps.previous.output }}',
        with: { foo: 'bar' },
        if: '{{ condition }}',
        timeout: '1m',
        'max-step-size': undefined,
        'on-failure': { continue: true },
      },
    };

    const impl = new CustomStepImpl(
      node as any,
      stepDefinition as any,
      stepExecutionRuntime as any,
      connectorExecutor as any,
      workflowRuntime as any,
      workflowLogger as any
    );

    await (impl as any)._run({ foo: 'bar' });

    expect(stepExecutionRuntime.contextManager.renderValueAccordingToContext).toHaveBeenCalledWith({
      source: '{{ steps.previous.output }}',
    });
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        config: {
          source: '{{ steps.previous.output }}',
        },
        rawInput: { foo: 'bar' },
      })
    );
  });
});
