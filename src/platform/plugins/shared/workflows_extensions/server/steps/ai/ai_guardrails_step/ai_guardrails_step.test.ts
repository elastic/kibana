/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, KibanaRequest } from '@kbn/core/server';

jest.mock('../utils/resolve_connector_id', () => ({
  resolveConnectorId: jest.fn(),
}));

jest.mock('../../../../common/steps/ai', () => ({
  AiGuardrailsStepCommonDefinition: {
    id: 'ai.guardrails',
    inputSchema: {},
    outputSchema: {},
  },
}));

jest.mock('../../../step_registry/types', () => ({
  createServerStepDefinition: jest.fn((definition) => definition),
}));

import { aiGuardrailsStepDefinition } from './step';
import type { ContextManager, StepHandlerContext } from '../../../step_registry/types';
import type { WorkflowsExtensionsServerPluginStartDeps } from '../../../types';
import { resolveConnectorId } from '../utils/resolve_connector_id';

const mockResolveConnectorId = resolveConnectorId as jest.MockedFunction<typeof resolveConnectorId>;

describe('aiGuardrailsStepDefinition', () => {
  let mockCoreSetup: jest.Mocked<CoreSetup<WorkflowsExtensionsServerPluginStartDeps>>;
  let mockInference: { getChatModel: jest.Mock };
  let mockContextManager: jest.Mocked<ContextManager>;
  let mockContext: StepHandlerContext;
  let mockRunnable: { invoke: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveConnectorId.mockResolvedValue('resolved-connector-id');

    mockRunnable = {
      invoke: jest.fn().mockResolvedValue({ parsed: { pass: true } }),
    };

    const mockChatModel = {
      withStructuredOutput: jest.fn().mockReturnValue(mockRunnable),
    };

    mockInference = {
      getChatModel: jest.fn().mockResolvedValue(mockChatModel),
    };

    mockCoreSetup = {
      getStartServices: jest.fn().mockResolvedValue([{}, { inference: mockInference }]),
    } as any;

    mockContextManager = {
      getFakeRequest: jest.fn().mockReturnValue({} as KibanaRequest),
      getContext: jest.fn(),
      getScopedEsClient: jest.fn(),
      renderInputTemplate: jest.fn(),
    };

    mockContext = {
      config: {},
      input: { message: 'hello' },
      rawInput: { message: 'hello' },
      contextManager: mockContextManager,
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
      abortSignal: new AbortController().signal,
      stepId: 'guardrails',
      stepType: 'ai.guardrails',
    } as any;
  });

  it('returns pass: true when model returns pass true', async () => {
    const step = aiGuardrailsStepDefinition(mockCoreSetup);
    const result = await step.handler(mockContext);

    expect(result.output).toEqual({ pass: true });
  });

  it('returns pass: false with reason and abort when model returns pass false', async () => {
    mockRunnable.invoke.mockResolvedValue({
      parsed: { pass: false, reason: 'Policy violation.' },
    });

    const step = aiGuardrailsStepDefinition(mockCoreSetup);
    const result = await step.handler(mockContext);

    expect(result.output?.pass).toBe(false);
    expect(result.output?.reason).toBe('Policy violation.');
    expect(result.output?.abort).toBe(true);
    expect(result.output?.abort_message).toBe('Policy violation.');
  });

  it('uses default reason when model returns pass false without reason', async () => {
    mockRunnable.invoke.mockResolvedValue({ parsed: { pass: false } });

    const step = aiGuardrailsStepDefinition(mockCoreSetup);
    const result = await step.handler(mockContext);

    expect(result.output?.pass).toBe(false);
    expect(result.output?.reason).toBe('Guardrail evaluation failed.');
    expect(result.output?.abort).toBe(true);
  });

  it('sends system prompt and context text to the model', async () => {
    mockContext.input = {
      message: 'test message',
      conversation_history: [{ content: 'prev' }],
      attachments: [{ type: 'alert', data: { id: '1' } }],
    };

    const step = aiGuardrailsStepDefinition(mockCoreSetup);
    await step.handler(mockContext);

    expect(mockRunnable.invoke).toHaveBeenCalled();
    const [modelInput] = mockRunnable.invoke.mock.calls[0];
    expect(modelInput).toHaveLength(2);
    expect(modelInput[0].role).toBe('system');
    expect(modelInput[0].content).toContain('guardrail evaluator');
    expect(modelInput[1].role).toBe('user');
    expect(modelInput[1].content).toContain('test message');
    expect(modelInput[1].content).toContain('prev');
    expect(modelInput[1].content).toContain('alert');
  });

  it('limits conversation_history to last 20 messages', async () => {
    const manyMessages = Array.from({ length: 25 }, (_, i) => ({ content: `msg-${i}` }));
    mockContext.input = {
      message: 'current',
      conversation_history: manyMessages,
    };

    const step = aiGuardrailsStepDefinition(mockCoreSetup);
    await step.handler(mockContext);

    const [, userContent] = mockRunnable.invoke.mock.calls[0][0];
    expect(userContent.content).toContain('msg-5'); // from last 20 (indices 5..24)
    expect(userContent.content).not.toContain('msg-0');
    expect(userContent.content).toContain('msg-24');
  });

  it('truncates long attachment data and appends [truncated]', async () => {
    const longData = { payload: 'x'.repeat(10000) };
    mockContext.input = {
      message: 'check',
      attachments: [{ type: 'doc', data: longData }],
    };

    const step = aiGuardrailsStepDefinition(mockCoreSetup);
    await step.handler(mockContext);

    const [, userContent] = mockRunnable.invoke.mock.calls[0][0];
    expect(userContent.content).toContain('...[truncated]');
    expect(userContent.content).toContain('[doc]:');
  });
});
