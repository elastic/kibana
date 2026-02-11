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

jest.mock('./build_prompts', () => ({
  buildSystemPart: jest.fn(),
  buildDataPart: jest.fn(),
  buildRequirementsPart: jest.fn(),
  buildInstructionsPart: jest.fn(),
}));

jest.mock('../../../../common/steps/ai', () => ({
  AiSummarizeStepCommonDefinition: {
    id: 'ai.summarize',
    inputSchema: {},
    outputSchema: {},
    configSchema: {},
  },
}));

jest.mock('../../../step_registry/types', () => ({
  createServerStepDefinition: jest.fn((definition) => definition),
}));

import {
  buildDataPart,
  buildInstructionsPart,
  buildRequirementsPart,
  buildSystemPart,
} from './build_prompts';
import { aiSummarizeStepDefinition } from './step';
import { createServerStepDefinition } from '../../../step_registry/types';
import type { ContextManager, StepHandlerContext } from '../../../step_registry/types';
import type { WorkflowsExtensionsServerPluginStartDeps } from '../../../types';
import { resolveConnectorId } from '../utils/resolve_connector_id';

const mockResolveConnectorId = resolveConnectorId as jest.MockedFunction<typeof resolveConnectorId>;
const mockBuildSystemPart = buildSystemPart as jest.MockedFunction<typeof buildSystemPart>;
const mockBuildDataPart = buildDataPart as jest.MockedFunction<typeof buildDataPart>;
const mockBuildRequirementsPart = buildRequirementsPart as jest.MockedFunction<
  typeof buildRequirementsPart
>;
const mockBuildInstructionsPart = buildInstructionsPart as jest.MockedFunction<
  typeof buildInstructionsPart
>;
const mockCreateServerStepDefinition = createServerStepDefinition as jest.MockedFunction<
  typeof createServerStepDefinition
>;

describe('aiSummarizeStepDefinition', () => {
  let mockCoreSetup: jest.Mocked<CoreSetup<WorkflowsExtensionsServerPluginStartDeps>>;
  let mockInference: jest.Mocked<InferenceServerStart>;
  let mockContextManager: jest.Mocked<ContextManager>;
  let mockContext: StepHandlerContext<any>;
  let mockChatModel: any;
  let mockAbortController: AbortController;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAbortController = new AbortController();

    // Mock chat model
    mockChatModel = {
      invoke: jest.fn(),
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
        input: 'Text to summarize',
        temperature: 0.7,
      },
      rawInput: {
        input: 'Text to summarize',
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
      stepType: 'ai.summarize',
    };

    // Mock CoreSetup
    mockCoreSetup = {
      getStartServices: jest.fn().mockResolvedValue([{}, { inference: mockInference }]),
    } as any;

    // Mock build functions to return sample message parts
    mockBuildSystemPart.mockReturnValue([{ role: 'system', content: 'System prompt' }]);
    mockBuildDataPart.mockReturnValue([{ role: 'user', content: 'Data to summarize' }]);
    mockBuildRequirementsPart.mockReturnValue([
      { role: 'user', content: 'Requirements for summary' },
    ]);
    mockBuildInstructionsPart.mockReturnValue([
      { role: 'user', content: 'Additional instructions' },
    ]);

    mockResolveConnectorId.mockResolvedValue('resolved-connector-id');
    mockCreateServerStepDefinition.mockImplementation((def) => def);
  });

  describe('handler execution', () => {
    let stepDefinition: any;
    let handler: Function;

    beforeEach(() => {
      stepDefinition = aiSummarizeStepDefinition(mockCoreSetup);
      handler = stepDefinition.handler;
    });

    describe('with basic input', () => {
      it('should successfully execute AI summarize and return response with string content', async () => {
        const mockResponse = {
          content: 'This is a summary of the text',
          response_metadata: { model: 'gpt-3.5-turbo', usage: { tokens: 100 } },
        };

        mockChatModel.invoke.mockResolvedValue(mockResponse);

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

        // Verify build functions were called with correct parameters
        expect(mockBuildSystemPart).toHaveBeenCalledTimes(1);
        expect(mockBuildDataPart).toHaveBeenCalledWith('Text to summarize');
        expect(mockBuildRequirementsPart).toHaveBeenCalledWith({ maxLength: undefined });
        expect(mockBuildInstructionsPart).toHaveBeenCalledWith(undefined);

        expect(mockChatModel.invoke).toHaveBeenCalledWith(
          [
            { role: 'system', content: 'System prompt' },
            { role: 'user', content: 'Data to summarize' },
            { role: 'user', content: 'Requirements for summary' },
            { role: 'user', content: 'Additional instructions' },
          ],
          { signal: mockAbortController.signal }
        );

        expect(result).toEqual({
          output: {
            content: 'This is a summary of the text',
            metadata: { model: 'gpt-3.5-turbo', usage: { tokens: 100 } },
          },
        });
      });

      it('should handle array content in response', async () => {
        const mockResponse = {
          content: [
            { type: 'text', text: 'First part of summary' },
            { type: 'text', text: 'Second part of summary' },
          ],
          response_metadata: { model: 'gpt-4' },
        };

        mockChatModel.invoke.mockResolvedValue(mockResponse);

        const result = await handler(mockContext);

        expect(result).toEqual({
          output: {
            content: 'First part of summarySecond part of summary',
            metadata: { model: 'gpt-4' },
          },
        });
      });

      it('should handle array content with non-text parts', async () => {
        const mockResponse = {
          content: [
            { type: 'text', text: 'Text part' },
            { type: 'image', url: 'http://example.com/image.jpg' },
            { type: 'text', text: 'Another text part' },
          ],
          response_metadata: {},
        };

        mockChatModel.invoke.mockResolvedValue(mockResponse);

        const result = await handler(mockContext);

        expect(result).toEqual({
          output: {
            content: 'Text partAnother text part',
            metadata: {},
          },
        });
      });

      it('should handle missing temperature in input', async () => {
        const contextWithoutTemperature = {
          ...mockContext,
          input: {
            input: 'Text to summarize',
          },
        };

        const mockResponse = {
          content: 'Summary',
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

      it('should handle missing connector-id in config', async () => {
        const contextWithoutConnectorId = {
          ...mockContext,
          config: {},
        };

        const mockResponse = {
          content: 'Summary',
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

    describe('with optional parameters', () => {
      it('should handle maxLength parameter', async () => {
        const contextWithMaxLength = {
          ...mockContext,
          input: {
            input: 'Text to summarize',
            maxLength: 100,
          },
        };

        const mockResponse = {
          content: 'Short summary',
          response_metadata: {},
        };

        mockChatModel.invoke.mockResolvedValue(mockResponse);

        await handler(contextWithMaxLength);

        expect(mockBuildRequirementsPart).toHaveBeenCalledWith({ maxLength: 100 });
      });

      it('should handle instructions parameter', async () => {
        const contextWithInstructions = {
          ...mockContext,
          input: {
            input: 'Text to summarize',
            instructions: 'Focus on key points only',
          },
        };

        const mockResponse = {
          content: 'Focused summary',
          response_metadata: {},
        };

        mockChatModel.invoke.mockResolvedValue(mockResponse);

        await handler(contextWithInstructions);

        expect(mockBuildInstructionsPart).toHaveBeenCalledWith('Focus on key points only');
      });

      it('should handle both maxLength and instructions', async () => {
        const contextWithBoth = {
          ...mockContext,
          input: {
            input: 'Text to summarize',
            maxLength: 150,
            instructions: 'Be concise and factual',
            temperature: 0.5,
          },
        };

        const mockResponse = {
          content: 'Concise summary',
          response_metadata: {},
        };

        mockChatModel.invoke.mockResolvedValue(mockResponse);

        await handler(contextWithBoth);

        expect(mockBuildRequirementsPart).toHaveBeenCalledWith({ maxLength: 150 });
        expect(mockBuildInstructionsPart).toHaveBeenCalledWith('Be concise and factual');
      });
    });

    describe('with different input types', () => {
      it('should handle string input', async () => {
        const contextWithString = {
          ...mockContext,
          input: {
            input: 'Simple text string',
          },
        };

        const mockResponse = {
          content: 'Summary',
          response_metadata: {},
        };

        mockChatModel.invoke.mockResolvedValue(mockResponse);

        await handler(contextWithString);

        expect(mockBuildDataPart).toHaveBeenCalledWith('Simple text string');
      });

      it('should handle object input', async () => {
        const inputObject = { name: 'John', age: 30, city: 'New York' };
        const contextWithObject = {
          ...mockContext,
          input: {
            input: inputObject,
          },
        };

        const mockResponse = {
          content: 'Summary',
          response_metadata: {},
        };

        mockChatModel.invoke.mockResolvedValue(mockResponse);

        await handler(contextWithObject);

        expect(mockBuildDataPart).toHaveBeenCalledWith(inputObject);
      });

      it('should handle array input', async () => {
        const inputArray = ['item1', 'item2', 'item3'];
        const contextWithArray = {
          ...mockContext,
          input: {
            input: inputArray,
          },
        };

        const mockResponse = {
          content: 'Summary',
          response_metadata: {},
        };

        mockChatModel.invoke.mockResolvedValue(mockResponse);

        await handler(contextWithArray);

        expect(mockBuildDataPart).toHaveBeenCalledWith(inputArray);
      });
    });

    describe('error handling', () => {
      it('should handle abortion via abortSignal', async () => {
        mockAbortController.abort();

        const error = new Error('Aborted');
        error.name = 'AbortError';
        mockChatModel.invoke.mockRejectedValue(error);

        await expect(handler(mockContext)).rejects.toThrow('Aborted');
      });
    });

    describe('prompt composition', () => {
      it('should compose prompts in correct order', async () => {
        const mockResponse = {
          content: 'Summary',
          response_metadata: {},
        };

        mockChatModel.invoke.mockResolvedValue(mockResponse);

        await handler(mockContext);

        // Verify build functions were called in order
        const callOrder = [
          mockBuildSystemPart.mock.invocationCallOrder[0],
          mockBuildDataPart.mock.invocationCallOrder[0],
          mockBuildRequirementsPart.mock.invocationCallOrder[0],
          mockBuildInstructionsPart.mock.invocationCallOrder[0],
        ];

        expect(callOrder[0]).toBeLessThan(callOrder[1]);
        expect(callOrder[1]).toBeLessThan(callOrder[2]);
        expect(callOrder[2]).toBeLessThan(callOrder[3]);
      });

      it('should flatten all prompt parts into single array', async () => {
        mockBuildSystemPart.mockReturnValue([
          { role: 'system', content: 'System 1' },
          { role: 'system', content: 'System 2' },
        ]);
        mockBuildDataPart.mockReturnValue([
          { role: 'user', content: 'Data 1' },
          { role: 'user', content: 'Data 2' },
        ]);

        const mockResponse = {
          content: 'Summary',
          response_metadata: {},
        };

        mockChatModel.invoke.mockResolvedValue(mockResponse);

        await handler(mockContext);

        expect(mockChatModel.invoke).toHaveBeenCalledWith(
          [
            { role: 'system', content: 'System 1' },
            { role: 'system', content: 'System 2' },
            { role: 'user', content: 'Data 1' },
            { role: 'user', content: 'Data 2' },
            { role: 'user', content: 'Requirements for summary' },
            { role: 'user', content: 'Additional instructions' },
          ],
          { signal: mockAbortController.signal }
        );
      });
    });
  });
});
