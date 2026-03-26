/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, KibanaRequest } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';

// Mock external dependencies
jest.mock('../utils/resolve_connector_id', () => ({
  resolveConnectorId: jest.fn(),
}));

jest.mock('../../../../common/steps/ai', () => ({
  AiPromptStepCommonDefinition: {
    id: 'ai.prompt',
    inputSchema: {},
    outputSchema: {},
  },
}));

jest.mock('../../../step_registry/types', () => ({
  createServerStepDefinition: jest.fn((definition) => definition),
}));

import { aiPromptStepDefinition } from './step';
import type { ContextManager, StepHandlerContext } from '../../../step_registry/types';
import { createServerStepDefinition } from '../../../step_registry/types';
import type { WorkflowsExtensionsServerPluginStartDeps } from '../../../types';
import { resolveConnectorId } from '../utils/resolve_connector_id';

const mockResolveConnectorId = resolveConnectorId as jest.MockedFunction<typeof resolveConnectorId>;
const mockCreateServerStepDefinition = createServerStepDefinition as jest.MockedFunction<
  typeof createServerStepDefinition
>;

describe('aiPromptStepDefinition', () => {
  let mockCoreSetup: jest.Mocked<CoreSetup<WorkflowsExtensionsServerPluginStartDeps>>;
  let mockInference: jest.Mocked<InferenceServerStart>;
  let mockContextManager: jest.Mocked<ContextManager>;
  let mockContext: StepHandlerContext<any>;
  let mockChatModel: any;
  let mockRunnable: any;
  let mockAbortController: AbortController;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAbortController = new AbortController();

    // Mock chat model
    mockRunnable = {
      invoke: jest.fn(),
    };

    mockChatModel = {
      invoke: jest.fn(),
      withStructuredOutput: jest.fn().mockReturnValue(mockRunnable),
    };

    // Mock inference service
    mockInference = {
      getChatModel: jest.fn().mockResolvedValue(mockChatModel),
    } as any;

    // Mock context manager
    mockContextManager = {
      getFakeRequest: jest.fn().mockReturnValue({} as KibanaRequest),
      getContext: jest.fn(),
      getScopedEsClient: jest.fn(),
      renderInputTemplate: jest.fn(),
    };

    // Mock step handler context
    mockContext = {
      config: {
        'connector-id': 'test-connector-id',
      },
      input: {
        prompt: 'Test prompt',
        temperature: 0.7,
      },
      rawInput: {
        prompt: 'Test prompt',
        temperature: 0.7,
      },
      contextManager: mockContextManager,
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
      abortSignal: mockAbortController.signal,
      stepId: 'test-step-id',
      stepType: 'ai.prompt',
    };

    // Mock CoreSetup
    mockCoreSetup = {
      getStartServices: jest.fn().mockResolvedValue([{}, { inference: mockInference }]),
    } as any;

    mockResolveConnectorId.mockResolvedValue('resolved-connector-id');
    mockCreateServerStepDefinition.mockImplementation((def) => def);
  });

  describe('step definition creation', () => {
    it('should create a step definition with correct structure', () => {
      const stepDefinition = aiPromptStepDefinition(mockCoreSetup);

      expect(mockCreateServerStepDefinition).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'ai.prompt',
          inputSchema: {},
          outputSchema: {},
          handler: expect.any(Function),
        })
      );

      expect(stepDefinition).toBeDefined();
      expect(typeof stepDefinition.handler).toBe('function');
    });
  });

  describe('handler execution', () => {
    let stepDefinition: any;
    let handler: Function;

    beforeEach(() => {
      stepDefinition = aiPromptStepDefinition(mockCoreSetup);
      handler = stepDefinition.handler;
    });

    describe('with basic input (no output schema)', () => {
      it('should successfully execute AI prompt and return response', async () => {
        const mockResponse = {
          content: 'AI generated response',
          response_metadata: { model: 'gpt-3.5-turbo', usage: { tokens: 100 } },
        };

        mockChatModel.invoke.mockResolvedValue(mockResponse);
        mockContext.input.systemPrompt = 'You are a helpful assistant.';
        const result = await handler(mockContext);

        expect(mockCoreSetup.getStartServices).toHaveBeenCalledTimes(1);
        expect(mockResolveConnectorId).toHaveBeenCalledWith(
          'test-connector-id',
          mockInference,
          expect.any(Object)
        );
        expect(mockInference.getChatModel).toHaveBeenCalledWith({
          connectorId: 'resolved-connector-id',
          request: expect.any(Object),
          chatModelOptions: {
            temperature: 0.7,
            maxRetries: 0,
          },
        });
        expect(mockChatModel.invoke).toHaveBeenCalledWith(
          [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Test prompt' },
          ],
          { signal: mockAbortController.signal }
        );

        expect(result).toEqual({
          output: {
            content: 'AI generated response',
            metadata: { model: 'gpt-3.5-turbo', usage: { tokens: 100 } },
          },
        });
      });

      it('should handle missing temperature in input', async () => {
        const contextWithoutTemperature = {
          ...mockContext,
          input: {
            prompt: 'Test prompt',
            connectorId: 'test-connector-id',
          },
        };

        const mockResponse = {
          content: 'AI response',
          response_metadata: {},
        };

        mockChatModel.invoke.mockResolvedValue(mockResponse);

        await handler(contextWithoutTemperature);

        expect(mockInference.getChatModel).toHaveBeenCalledWith({
          connectorId: 'resolved-connector-id',
          request: expect.any(Object),
          chatModelOptions: {
            temperature: undefined,
            maxRetries: 0,
          },
        });
      });

      it('should handle missing connectorId in input', async () => {
        const contextWithoutConnectorId = {
          ...mockContext,
          config: {
            ...mockContext.config,
            'connector-id': undefined,
          },
          input: {
            prompt: 'Test prompt',
            temperature: 0.5,
          },
        };

        const mockResponse = {
          content: 'AI response',
          response_metadata: {},
        };

        mockChatModel.invoke.mockResolvedValue(mockResponse);

        await handler(contextWithoutConnectorId);

        expect(mockResolveConnectorId).toHaveBeenCalledWith(
          undefined,
          mockInference,
          expect.any(Object)
        );
      });
    });

    describe('with structured output schema', () => {
      it('should use structured output when outputSchema is provided', async () => {
        const contextWithSchema = {
          ...mockContext,
          input: {
            ...mockContext.input,
            schema: {
              type: 'object',
              properties: {
                summary: { type: 'string' },
                sentiment: { type: 'string' },
              },
            },
          },
        };

        const mockStructuredResponse = {
          response: {
            summary: 'This is a summary',
            sentiment: 'positive',
          },
        };

        mockRunnable.invoke.mockResolvedValue({
          parsed: mockStructuredResponse,
          raw: {
            response_metadata: { tokens_used: 150 },
          },
        });

        const result = await handler(contextWithSchema);

        expect(mockChatModel.withStructuredOutput).toHaveBeenCalledWith(
          {
            type: 'object',
            properties: {
              response: {
                type: 'object',
                properties: {
                  summary: { type: 'string' },
                  sentiment: { type: 'string' },
                },
              },
            },
          },
          {
            name: 'extract_structured_response',
            includeRaw: true,
            method: 'jsonMode',
          }
        );

        expect(mockRunnable.invoke).toHaveBeenCalledWith(
          [{ role: 'user', content: 'Test prompt' }],
          { signal: mockAbortController.signal }
        );

        expect(result).toEqual({
          output: {
            content: {
              summary: 'This is a summary',
              sentiment: 'positive',
            },
            metadata: { tokens_used: 150 },
          },
        });

        // Ensure regular invoke is not called when using structured output
        expect(mockChatModel.invoke).not.toHaveBeenCalled();
      });

      it('should handle array output schema by wrapping in response object', async () => {
        const contextWithArraySchema = {
          ...mockContext,
          input: {
            ...mockContext.input,
            schema: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        };

        const mockStructuredResponse = {
          response: ['item1', 'item2', 'item3'],
        };

        mockRunnable.invoke.mockResolvedValue({
          parsed: mockStructuredResponse,
          raw: {
            response_metadata: { tokens_used: 150 },
          },
        });

        const result = await handler(contextWithArraySchema);

        expect(mockChatModel.withStructuredOutput).toHaveBeenCalledWith(
          {
            type: 'object',
            properties: {
              response: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
          {
            name: 'extract_structured_response',
            includeRaw: true,
            method: 'jsonMode',
          }
        );

        expect(result).toEqual({
          output: expect.objectContaining({
            content: ['item1', 'item2', 'item3'],
          }),
        });
      });
    });

    describe('error handling', () => {
      it('should propagate errors from resolveConnectorId', async () => {
        const error = new Error('Connector resolution failed');
        mockResolveConnectorId.mockRejectedValue(error);

        await expect(handler(mockContext)).rejects.toThrow('Connector resolution failed');
      });

      it('should propagate errors from getChatModel', async () => {
        const error = new Error('Chat model initialization failed');
        mockInference.getChatModel.mockRejectedValue(error);

        await expect(handler(mockContext)).rejects.toThrow('Chat model initialization failed');
      });

      it('should propagate errors from chat model invoke', async () => {
        const error = new Error('AI model invocation failed');
        mockChatModel.invoke.mockRejectedValue(error);

        await expect(handler(mockContext)).rejects.toThrow('AI model invocation failed');
      });

      it('should propagate errors from structured output invoke', async () => {
        const contextWithSchema = {
          ...mockContext,
          input: {
            ...mockContext.input,
            schema: { type: 'object', properties: {} },
          },
        };

        const error = new Error('Structured output invocation failed');
        mockRunnable.invoke.mockRejectedValue(error);

        await expect(handler(contextWithSchema)).rejects.toThrow(
          'Structured output invocation failed'
        );
      });

      it('should handle abortion via abortSignal', async () => {
        mockAbortController.abort();

        const error = new Error('Aborted');
        error.name = 'AbortError';
        mockChatModel.invoke.mockRejectedValue(error);

        await expect(handler(mockContext)).rejects.toThrow('Aborted');
      });
    });

    describe('service integration', () => {
      it('should pass correct parameters to all services', async () => {
        const mockResponse = {
          content: 'Test response',
          response_metadata: {},
        };

        mockChatModel.invoke.mockResolvedValue(mockResponse);

        await handler(mockContext);

        // Verify CoreSetup.getStartServices is called
        expect(mockCoreSetup.getStartServices).toHaveBeenCalledTimes(1);

        // Verify contextManager.getFakeRequest is called twice (for resolveConnectorId and getChatModel)
        expect(mockContextManager.getFakeRequest).toHaveBeenCalledTimes(2);

        // Verify resolveConnectorId is called with correct parameters
        expect(mockResolveConnectorId).toHaveBeenCalledWith(
          'test-connector-id',
          mockInference,
          expect.any(Object)
        );

        // Verify getChatModel is called with correct parameters
        expect(mockInference.getChatModel).toHaveBeenCalledWith({
          connectorId: 'resolved-connector-id',
          request: expect.any(Object),
          chatModelOptions: {
            temperature: 0.7,
            maxRetries: 0,
          },
        });

        // Verify chat model invoke is called with correct parameters
        expect(mockChatModel.invoke).toHaveBeenCalledWith(
          [{ role: 'user', content: 'Test prompt' }],
          { signal: mockAbortController.signal }
        );
      });

      it('should use the same fake request for connector resolution and chat model', async () => {
        const mockFakeRequest = { headers: {}, auth: {} } as KibanaRequest;
        mockContextManager.getFakeRequest.mockReturnValue(mockFakeRequest);

        const mockResponse = {
          content: 'Test response',
          response_metadata: {},
        };

        mockChatModel.invoke.mockResolvedValue(mockResponse);

        await handler(mockContext);

        // Verify the same fake request is used in both calls
        expect(mockResolveConnectorId).toHaveBeenCalledWith(
          'test-connector-id',
          mockInference,
          mockFakeRequest
        );

        expect(mockInference.getChatModel).toHaveBeenCalledWith({
          connectorId: 'resolved-connector-id',
          request: mockFakeRequest,
          chatModelOptions: {
            temperature: 0.7,
            maxRetries: 0,
          },
        });
      });
    });

    describe('input validation and processing', () => {
      it('should handle various temperature values', async () => {
        const temperatures = [0, 0.1, 0.5, 0.9, 1.0];
        const mockResponse = { content: 'response', response_metadata: {} };
        mockChatModel.invoke.mockResolvedValue(mockResponse);

        for (const temperature of temperatures) {
          const contextWithTemperature = {
            ...mockContext,
            input: {
              ...mockContext.input,
              temperature,
            },
          };

          await handler(contextWithTemperature);

          expect(mockInference.getChatModel).toHaveBeenCalledWith(
            expect.objectContaining({
              chatModelOptions: expect.objectContaining({
                temperature,
                maxRetries: 0,
              }),
            })
          );
        }
      });

      it('should handle different prompt types', async () => {
        const prompts = [
          'Simple text prompt',
          'Multi\nline\nprompt',
          'Prompt with special characters: @#$%^&*()',
          '',
          'Very long prompt that exceeds normal length expectations and continues for a while to test edge cases',
        ];

        const mockResponse = { content: 'response', response_metadata: {} };
        mockChatModel.invoke.mockResolvedValue(mockResponse);

        for (const prompt of prompts) {
          const contextWithPrompt = {
            ...mockContext,
            input: {
              ...mockContext.input,
              prompt,
            },
          };

          await handler(contextWithPrompt);

          expect(mockChatModel.invoke).toHaveBeenCalledWith([{ role: 'user', content: prompt }], {
            signal: mockAbortController.signal,
          });
        }
      });
    });
  });
});
