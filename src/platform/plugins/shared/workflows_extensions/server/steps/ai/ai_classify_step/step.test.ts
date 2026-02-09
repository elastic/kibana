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

// Mock all external dependencies
jest.mock('./build_prompts', () => ({
  buildSystemPart: jest.fn(),
  buildDataPart: jest.fn(),
  buildInstructionsPart: jest.fn(),
  buildClassificationRequestPart: jest.fn(),
}));

jest.mock('./validate_model_response', () => ({
  validateModelResponse: jest.fn(),
}));

jest.mock('../../../../common/steps/ai', () => ({
  AiClassifyStepCommonDefinition: {
    id: 'ai.classify',
    inputSchema: {},
    outputSchema: {},
    configSchema: {},
  },
  buildStructuredOutputSchema: jest.fn(),
}));

jest.mock('../../../step_registry/types', () => ({
  createServerStepDefinition: jest.fn((definition) => definition),
}));

jest.mock('../utils/resolve_connector_id', () => ({
  resolveConnectorId: jest.fn(),
}));

import {
  buildClassificationRequestPart,
  buildDataPart,
  buildInstructionsPart,
  buildSystemPart,
} from './build_prompts';
import { aiClassifyStepDefinition } from './step';
import { validateModelResponse } from './validate_model_response';
import { buildStructuredOutputSchema } from '../../../../common/steps/ai';
import type { ContextManager, StepHandlerContext } from '../../../step_registry/types';
import { createServerStepDefinition } from '../../../step_registry/types';
import type { WorkflowsExtensionsServerPluginStartDeps } from '../../../types';
import { resolveConnectorId } from '../utils/resolve_connector_id';

const mockBuildSystemPart = buildSystemPart as jest.MockedFunction<typeof buildSystemPart>;
const mockBuildDataPart = buildDataPart as jest.MockedFunction<typeof buildDataPart>;
const mockBuildInstructionsPart = buildInstructionsPart as jest.MockedFunction<
  typeof buildInstructionsPart
>;
const mockBuildClassificationRequestPart = buildClassificationRequestPart as jest.MockedFunction<
  typeof buildClassificationRequestPart
>;
const mockValidateModelResponse = validateModelResponse as jest.MockedFunction<
  typeof validateModelResponse
>;
const mockBuildStructuredOutputSchema = buildStructuredOutputSchema as jest.MockedFunction<
  typeof buildStructuredOutputSchema
>;
const mockCreateServerStepDefinition = createServerStepDefinition as jest.MockedFunction<
  typeof createServerStepDefinition
>;
const mockResolveConnectorId = resolveConnectorId as jest.MockedFunction<typeof resolveConnectorId>;

describe('aiClassifyStepDefinition', () => {
  let mockCoreSetup: jest.Mocked<CoreSetup<WorkflowsExtensionsServerPluginStartDeps>>;
  let mockInference: jest.Mocked<InferenceServerStart>;
  let mockContextManager: jest.Mocked<ContextManager>;
  let mockContext: StepHandlerContext<any>;
  let mockChatModel: any;
  let mockRunnable: any;
  let mockAbortController: AbortController;
  let mockSchema: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAbortController = new AbortController();

    // Mock schema
    mockSchema = {
      parse: jest.fn(),
      safeParse: jest.fn(),
    };

    // Mock chat model runnable
    mockRunnable = {
      invoke: jest.fn().mockResolvedValue({
        parsed: {
          category: 'test-category',
          metadata: {},
        },
        raw: {
          response_metadata: {
            model: 'test-model',
            finish_reason: 'stop',
          },
        },
      }),
    };

    // Mock chat model
    mockChatModel = {
      invoke: jest.fn(),
      withStructuredOutput: jest.fn().mockReturnValue(mockRunnable),
    };

    // Mock inference service
    mockInference = {
      getChatModel: jest.fn().mockResolvedValue(mockChatModel),
    } as any;

    // Mock core setup
    mockCoreSetup = {
      getStartServices: jest.fn().mockResolvedValue([
        {}, // core
        { inference: mockInference }, // plugins
        {}, // own plugin
      ]),
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
        input: 'Test input data',
        categories: ['category1', 'category2'],
        instructions: 'Test instructions',
        allowMultipleCategories: false,
        fallbackCategory: undefined,
        includeRationale: false,
        temperature: 0.7,
      },
      rawInput: {
        input: 'Test input data',
        categories: ['category1', 'category2'],
        instructions: 'Test instructions',
        allowMultipleCategories: false,
        fallbackCategory: undefined,
        includeRationale: false,
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
      stepType: 'ai.classify',
    } as any;

    // Setup default mock implementations
    mockResolveConnectorId.mockResolvedValue('resolved-connector-id');
    mockBuildStructuredOutputSchema.mockReturnValue(mockSchema as any);
    mockBuildSystemPart.mockReturnValue([{ role: 'system', content: 'System prompt' }]);
    mockBuildDataPart.mockReturnValue([{ role: 'user', content: 'Data part' }]);
    mockBuildInstructionsPart.mockReturnValue([{ role: 'user', content: 'Instructions part' }]);
    mockBuildClassificationRequestPart.mockReturnValue([
      { role: 'user', content: 'Classification request' },
    ]);
    mockValidateModelResponse.mockImplementation(() => {});
  });

  describe('step definition creation', () => {
    it('should create step definition with correct structure', () => {
      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);

      expect(mockCreateServerStepDefinition).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'ai.classify',
          handler: expect.any(Function),
        })
      );
      expect(stepDefinition).toBeDefined();
      expect(stepDefinition.handler).toBeDefined();
    });
  });

  describe('handler execution', () => {
    it('should successfully classify data with single category', async () => {
      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      const result = await stepDefinition.handler(mockContext);

      expect(mockCoreSetup.getStartServices).toHaveBeenCalled();
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
      expect(result).toEqual({
        output: {
          category: 'test-category',
          metadata: {
            model: 'test-model',
            finish_reason: 'stop',
          },
        },
      });
    });

    it('should successfully classify data with multiple categories', async () => {
      mockContext.input.allowMultipleCategories = true;
      mockRunnable.invoke.mockResolvedValueOnce({
        parsed: {
          categories: ['category1', 'category2'],
          metadata: {},
        },
        raw: {
          response_metadata: {
            model: 'test-model',
          },
        },
      });

      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      const result = await stepDefinition.handler(mockContext);

      expect(result.output).toEqual({
        categories: ['category1', 'category2'],
        metadata: {
          model: 'test-model',
        },
      });
    });

    it('should include rationale when requested', async () => {
      mockContext.input.includeRationale = true;
      mockRunnable.invoke.mockResolvedValueOnce({
        parsed: {
          category: 'category1',
          rationale: 'This is the rationale',
          metadata: {},
        },
        raw: {
          response_metadata: {
            model: 'test-model',
          },
        },
      });

      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      const result = await stepDefinition.handler(mockContext);

      expect(result.output).toEqual({
        category: 'category1',
        rationale: 'This is the rationale',
        metadata: {
          model: 'test-model',
        },
      });
    });

    it('should use fallback category when provided', async () => {
      mockContext.input.fallbackCategory = 'fallback';
      mockRunnable.invoke.mockResolvedValueOnce({
        parsed: {
          category: 'fallback',
          metadata: {},
        },
        raw: {
          response_metadata: {
            model: 'test-model',
          },
        },
      });

      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      const result = await stepDefinition.handler(mockContext);

      expect(result).toBeDefined();
      expect(result.output).toBeDefined();
      expect(result.output!.category).toBe('fallback');
      expect(mockBuildClassificationRequestPart).toHaveBeenCalledWith(
        expect.objectContaining({
          fallbackCategory: 'fallback',
        })
      );
    });

    it('should handle custom temperature setting', async () => {
      mockContext.input.temperature = 0.3;

      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      await stepDefinition.handler(mockContext);

      expect(mockInference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({
          chatModelOptions: expect.objectContaining({
            temperature: 0.3,
          }),
        })
      );
    });

    it('should handle undefined temperature', async () => {
      mockContext.input.temperature = undefined;

      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      await stepDefinition.handler(mockContext);

      expect(mockInference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({
          chatModelOptions: expect.objectContaining({
            temperature: undefined,
          }),
        })
      );
    });
  });

  describe('prompt building', () => {
    it('should build correct prompt structure', async () => {
      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      await stepDefinition.handler(mockContext);

      expect(mockBuildSystemPart).toHaveBeenCalled();
      expect(mockBuildDataPart).toHaveBeenCalledWith('Test input data');
      expect(mockBuildClassificationRequestPart).toHaveBeenCalledWith({
        categories: ['category1', 'category2'],
        allowMultipleCategories: false,
        fallbackCategory: undefined,
        includeRationale: false,
      });
      expect(mockBuildInstructionsPart).toHaveBeenCalledWith('Test instructions');
    });

    it('should handle different input types', async () => {
      mockContext.input.input = { key: 'value' };

      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      await stepDefinition.handler(mockContext);

      expect(mockBuildDataPart).toHaveBeenCalledWith({ key: 'value' });
    });

    it('should handle array input', async () => {
      mockContext.input.input = ['item1', 'item2'];

      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      await stepDefinition.handler(mockContext);

      expect(mockBuildDataPart).toHaveBeenCalledWith(['item1', 'item2']);
    });

    it('should handle undefined instructions', async () => {
      mockContext.input.instructions = undefined;

      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      await stepDefinition.handler(mockContext);

      expect(mockBuildInstructionsPart).toHaveBeenCalledWith(undefined);
    });
  });

  describe('schema and validation', () => {
    it('should build structured output schema from input', async () => {
      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      await stepDefinition.handler(mockContext);

      expect(mockBuildStructuredOutputSchema).toHaveBeenCalledWith(mockContext.input);
    });

    it('should pass Zod schema directly to withStructuredOutput', async () => {
      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      await stepDefinition.handler(mockContext);

      expect(mockChatModel.withStructuredOutput).toHaveBeenCalledWith(mockSchema, {
        name: 'classify',
        includeRaw: true,
        method: 'json',
      });
    });

    it('should validate model response', async () => {
      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      await stepDefinition.handler(mockContext);

      expect(mockValidateModelResponse).toHaveBeenCalledWith({
        modelResponse: {
          category: 'test-category',
          metadata: {},
        },
        expectedCategories: ['category1', 'category2'],
        fallbackCategory: undefined,
        responseMetadata: {
          model: 'test-model',
          finish_reason: 'stop',
        },
      });
    });

    it('should propagate validation errors', async () => {
      mockValidateModelResponse.mockImplementationOnce(() => {
        throw new Error('Validation failed');
      });

      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);

      await expect(stepDefinition.handler(mockContext)).rejects.toThrow('Validation failed');
    });
  });

  describe('model invocation', () => {
    it('should invoke model with correct parameters', async () => {
      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      await stepDefinition.handler(mockContext);

      expect(mockRunnable.invoke).toHaveBeenCalledWith(
        [
          { role: 'system', content: 'System prompt' },
          { role: 'user', content: 'Data part' },
          { role: 'user', content: 'Classification request' },
          { role: 'user', content: 'Instructions part' },
        ],
        { signal: mockAbortController.signal }
      );
    });

    it('should respect abort signal', async () => {
      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      await stepDefinition.handler(mockContext);

      expect(mockRunnable.invoke).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          signal: mockAbortController.signal,
        })
      );
    });

    it('should handle model invocation errors', async () => {
      mockRunnable.invoke.mockRejectedValueOnce(new Error('Model invocation failed'));

      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);

      await expect(stepDefinition.handler(mockContext)).rejects.toThrow('Model invocation failed');
    });

    it('should set maxRetries to 0', async () => {
      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      await stepDefinition.handler(mockContext);

      expect(mockInference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({
          chatModelOptions: expect.objectContaining({
            maxRetries: 0,
          }),
        })
      );
    });
  });

  describe('connector resolution', () => {
    it('should resolve connector id from config', async () => {
      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      await stepDefinition.handler(mockContext);

      expect(mockResolveConnectorId).toHaveBeenCalledWith(
        'test-connector-id',
        mockInference,
        expect.any(Object)
      );
    });

    it('should handle undefined connector id in config', async () => {
      mockContext.config['connector-id'] = undefined;

      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      await stepDefinition.handler(mockContext);

      expect(mockResolveConnectorId).toHaveBeenCalledWith(
        undefined,
        mockInference,
        expect.any(Object)
      );
    });

    it('should use resolved connector id for chat model', async () => {
      mockResolveConnectorId.mockResolvedValueOnce('custom-resolved-id');

      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      await stepDefinition.handler(mockContext);

      expect(mockInference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'custom-resolved-id',
        })
      );
    });

    it('should handle connector resolution errors', async () => {
      mockResolveConnectorId.mockRejectedValueOnce(new Error('Connector not found'));

      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);

      await expect(stepDefinition.handler(mockContext)).rejects.toThrow('Connector not found');
    });
  });

  describe('output formatting', () => {
    it('should merge parsed response with metadata', async () => {
      mockRunnable.invoke.mockResolvedValueOnce({
        parsed: {
          category: 'category1',
          rationale: 'Test rationale',
        },
        raw: {
          response_metadata: {
            model: 'gpt-4',
            tokens: 100,
            custom: 'value',
          },
        },
      });

      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      const result = await stepDefinition.handler(mockContext);

      expect(result.output).toEqual({
        category: 'category1',
        rationale: 'Test rationale',
        metadata: {
          model: 'gpt-4',
          tokens: 100,
          custom: 'value',
        },
      });
    });

    it('should handle empty response metadata', async () => {
      mockRunnable.invoke.mockResolvedValueOnce({
        parsed: {
          category: 'category1',
        },
        raw: {
          response_metadata: {},
        },
      });

      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      const result = await stepDefinition.handler(mockContext);

      expect(result.output).toEqual({
        category: 'category1',
        metadata: {},
      });
    });

    it('should preserve all parsed fields in output', async () => {
      mockRunnable.invoke.mockResolvedValueOnce({
        parsed: {
          category: 'category1',
          rationale: 'Test rationale',
          confidence: 0.95,
        },
        raw: {
          response_metadata: {
            model: 'test-model',
          },
        },
      });

      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      const result = await stepDefinition.handler(mockContext);

      expect(result.output).toEqual({
        category: 'category1',
        rationale: 'Test rationale',
        confidence: 0.95,
        metadata: {
          model: 'test-model',
        },
      });
    });
  });

  describe('context manager integration', () => {
    it('should use fake request from context manager', async () => {
      const fakeRequest = { id: 'fake-request' } as KibanaRequest;
      mockContextManager.getFakeRequest.mockReturnValue(fakeRequest);

      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      await stepDefinition.handler(mockContext);

      expect(mockContextManager.getFakeRequest).toHaveBeenCalledTimes(2);
      expect(mockResolveConnectorId).toHaveBeenCalledWith(
        'test-connector-id',
        mockInference,
        fakeRequest
      );
      expect(mockInference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({
          request: fakeRequest,
        })
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty categories array', async () => {
      mockContext.input.categories = [];

      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      await stepDefinition.handler(mockContext);

      expect(mockBuildClassificationRequestPart).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: [],
        })
      );
    });

    it('should handle empty string input', async () => {
      mockContext.input.input = '';

      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      await stepDefinition.handler(mockContext);

      expect(mockBuildDataPart).toHaveBeenCalledWith('');
    });

    it('should handle complex nested object input', async () => {
      const complexInput = {
        nested: {
          deep: {
            value: 'test',
            array: [1, 2, 3],
          },
        },
      };
      mockContext.input.input = complexInput;

      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);
      await stepDefinition.handler(mockContext);

      expect(mockBuildDataPart).toHaveBeenCalledWith(complexInput);
    });

    it('should handle getChatModel failure', async () => {
      mockInference.getChatModel.mockRejectedValueOnce(new Error('Chat model unavailable'));

      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);

      await expect(stepDefinition.handler(mockContext)).rejects.toThrow('Chat model unavailable');
    });

    it('should handle getStartServices failure', async () => {
      mockCoreSetup.getStartServices.mockRejectedValueOnce(new Error('Services unavailable'));

      const stepDefinition = aiClassifyStepDefinition(mockCoreSetup);

      await expect(stepDefinition.handler(mockContext)).rejects.toThrow('Services unavailable');
    });
  });
});
