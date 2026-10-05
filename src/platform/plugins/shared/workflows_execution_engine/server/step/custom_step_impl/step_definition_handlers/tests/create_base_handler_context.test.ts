/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHandlerTestMocks, defaultTestNode } from './test_helpers';
import { createBaseHandlerContext } from '../create_base_handler_context';

describe('createBaseHandlerContext', () => {
  it('builds a StepHandlerContext wired to the execution runtime and node', () => {
    const mocks = createHandlerTestMocks();
    const input = { resolved: true };
    const rawInput = { template: '${{ value }}' };
    const config = { mode: 'async' };

    const context = createBaseHandlerContext(
      input,
      rawInput,
      config,
      defaultTestNode as any,
      mocks.stepExecutionRuntime as any,
      mocks.workflowLogger as any
    );

    expect(context.input).toBe(input);
    expect(context.rawInput).toEqual(rawInput);
    expect(context.config).toEqual(config);
    expect(context.stepId).toBe('custom-step');
    expect(context.stepType).toBe('my-custom-type');
    expect(context.maxStepSizeBytes).toBe(10 * 1024 * 1024);
    expect(context.abortSignal).toBe(mocks.stepExecutionRuntime.abortController.signal);

    context.contextManager.getContext();
    expect(mocks.stepExecutionRuntime.contextManager.getContext).toHaveBeenCalled();

    context.contextManager.getScopedEsClient();
    expect(mocks.stepExecutionRuntime.contextManager.getEsClientAsUser).toHaveBeenCalled();

    context.contextManager.renderInputTemplate({ x: 1 });
    expect(
      mocks.stepExecutionRuntime.contextManager.renderValueAccordingToContext
    ).toHaveBeenCalledWith({ x: 1 }, undefined);

    context.logger.info('hello', { meta: true });
    expect(mocks.workflowLogger.logInfo).toHaveBeenCalledWith('hello', { meta: true });
  });

  it('creates a renderer that snapshots the workflow context once', () => {
    const mocks = createHandlerTestMocks();
    const workflowContext = { workflow: { id: 'workflow-id' } };
    mocks.stepExecutionRuntime.contextManager.getContext.mockReturnValue(workflowContext);

    const context = createBaseHandlerContext(
      {},
      {},
      {},
      defaultTestNode as any,
      mocks.stepExecutionRuntime as any,
      mocks.workflowLogger as any
    );
    const renderTemplate = context.contextManager.createTemplateRenderer?.();

    renderTemplate?.('{{ item.id }}', { item: { id: 1 } });
    renderTemplate?.('{{ item.id }}', { item: { id: 2 } });

    expect(mocks.stepExecutionRuntime.contextManager.getContext).toHaveBeenCalledTimes(1);
    expect(
      mocks.stepExecutionRuntime.contextManager.renderValueWithContext
    ).toHaveBeenNthCalledWith(1, '{{ item.id }}', workflowContext, { item: { id: 1 } });
    expect(
      mocks.stepExecutionRuntime.contextManager.renderValueWithContext
    ).toHaveBeenNthCalledWith(2, '{{ item.id }}', workflowContext, { item: { id: 2 } });
  });

  it('defaults rawInput and config to empty objects when omitted', () => {
    const mocks = createHandlerTestMocks();

    const context = createBaseHandlerContext(
      {},
      undefined as unknown as Record<string, unknown>,
      undefined as unknown as Record<string, unknown>,
      defaultTestNode as any,
      mocks.stepExecutionRuntime as any,
      mocks.workflowLogger as any
    );

    expect(context.rawInput).toEqual({});
    expect(context.config).toEqual({});
  });

  it('forwards callKibanaApi to the execution runtime with abort signal', async () => {
    const mocks = createHandlerTestMocks();
    mocks.stepExecutionRuntime.contextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: { ok: true },
    });

    const context = createBaseHandlerContext(
      {},
      {},
      {},
      defaultTestNode as any,
      mocks.stepExecutionRuntime as any,
      mocks.workflowLogger as any
    );

    const result = await context.contextManager.callKibanaApi({
      method: 'GET',
      path: '/api/status',
    });

    expect(mocks.stepExecutionRuntime.contextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/status',
      signal: mocks.stepExecutionRuntime.abortController.signal,
    });
    expect(result).toEqual({ status: 200, headers: {}, body: { ok: true } });
  });

  it('resolves maxStepSizeBytes from the step max-step-size', () => {
    const mocks = createHandlerTestMocks();
    const node = {
      ...defaultTestNode,
      configuration: { with: {}, 'max-step-size': '5mb' },
    };

    const context = createBaseHandlerContext(
      {},
      {},
      {},
      node as any,
      mocks.stepExecutionRuntime as any,
      mocks.workflowLogger as any
    );

    expect(context.maxStepSizeBytes).toBe(5 * 1024 * 1024);
  });
});
