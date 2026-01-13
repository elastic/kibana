/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { rerankStepDefinition } from './rerank_step';
import type { StepHandlerContext } from '../../step_registry/types';

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
};

const createMockEsClient = (mockResponse?: any) => ({
  transport: {
    request: jest.fn().mockResolvedValue(mockResponse || {
      rerank: [
        { index: 1, relevance_score: 0.95, text: 'doc2' },
        { index: 0, relevance_score: 0.85, text: 'doc1' },
        { index: 2, relevance_score: 0.75, text: 'doc3' },
      ],
    }),
  },
});

const createMockContextManager = (esClient: any) => ({
  getScopedEsClient: jest.fn().mockReturnValue(esClient),
});

describe('rerankStepDefinition', () => {
  describe('handler', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should stringify objects when no field extraction specified', async () => {
      const mockEsClient = createMockEsClient();
      const mockContextManager = createMockContextManager(mockEsClient);

      const context: StepHandlerContext = {
        input: {
          user_question: 'What is the best laptop?',
          data: [
            { id: 1, title: 'Laptop A', content: 'Good laptop' },
            { id: 2, title: 'Laptop B', content: 'Great laptop' },
            { id: 3, title: 'Laptop C', content: 'Average laptop' },
          ],
          embedding_model_id: '.jina-embeddings-v3',
        },
        logger: mockLogger as any,
        contextManager: mockContextManager as any,
      } as any;

      const result = await rerankStepDefinition.handler(context);

      expect(result.output).toEqual([
        { id: 2, title: 'Laptop B', content: 'Great laptop' },
        { id: 1, title: 'Laptop A', content: 'Good laptop' },
        { id: 3, title: 'Laptop C', content: 'Average laptop' },
      ]);

      expect(mockEsClient.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_inference/rerank/.jina-reranker-v2',
        querystring: {
          timeout: '5m',
        },
        body: {
          query: 'What is the best laptop?',
          input: [
            '{"id":1,"title":"Laptop A","content":"Good laptop"}',
            '{"id":2,"title":"Laptop B","content":"Great laptop"}',
            '{"id":3,"title":"Laptop C","content":"Average laptop"}',
          ],
        },
      });
    });

    it('should pass through strings without modification when no field extraction', async () => {
      const mockEsClient = createMockEsClient();
      const mockContextManager = createMockContextManager(mockEsClient);

      const context: StepHandlerContext = {
        input: {
          user_question: 'What is the best laptop?',
          data: [
            'This is a great laptop with amazing features',
            'Budget-friendly option for students',
            'Premium ultrabook for professionals',
          ],
        },
        logger: mockLogger as any,
        contextManager: mockContextManager as any,
      } as any;

      await rerankStepDefinition.handler(context);

      expect(mockEsClient.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_inference/rerank/.jina-reranker-v2',
        querystring: {
          timeout: '5m',
        },
        body: {
          query: 'What is the best laptop?',
          input: [
            'This is a great laptop with amazing features',
            'Budget-friendly option for students',
            'Premium ultrabook for professionals',
          ],
        },
      });
    });

    it('should rerank documents with field extraction', async () => {
      const mockEsClient = createMockEsClient();
      const mockContextManager = createMockContextManager(mockEsClient);

      const context: StepHandlerContext = {
        input: {
          user_question: 'What is the best laptop?',
          data: [
            { id: 1, title: 'Laptop A', content: 'Good laptop', price: 999 },
            { id: 2, title: 'Laptop B', content: 'Great laptop', price: 1299 },
            { id: 3, title: 'Laptop C', content: 'Average laptop', price: 799 },
          ],
          fields: [['title'], ['content']],
        },
        logger: mockLogger as any,
        contextManager: mockContextManager as any,
      } as any;

      const result = await rerankStepDefinition.handler(context);

      expect(result.output).toEqual([
        { id: 2, title: 'Laptop B', content: 'Great laptop', price: 1299 },
        { id: 1, title: 'Laptop A', content: 'Good laptop', price: 999 },
        { id: 3, title: 'Laptop C', content: 'Average laptop', price: 799 },
      ]);

      expect(mockEsClient.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_inference/rerank/.jina-reranker-v2',
        querystring: {
          timeout: '5m',
        },
        body: {
          query: 'What is the best laptop?',
          input: [
            'Laptop A Good laptop',
            'Laptop B Great laptop',
            'Laptop C Average laptop',
          ],
        },
      });
    });

    it('should handle nested field paths', async () => {
      const mockEsClient = createMockEsClient();
      const mockContextManager = createMockContextManager(mockEsClient);

      const context: StepHandlerContext = {
        input: {
          user_question: 'Find messages about deployment',
          data: [
            { user: { name: 'Alice' }, message: { text: 'Deploy to prod' } },
            { user: { name: 'Bob' }, message: { text: 'Fix bug' } },
            { user: { name: 'Charlie' }, message: { text: 'Update deployment config' } },
          ],
          fields: [['user', 'name'], ['message', 'text']],
        },
        logger: mockLogger as any,
        contextManager: mockContextManager as any,
      } as any;

      const result = await rerankStepDefinition.handler(context);

      expect(mockEsClient.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_inference/rerank/.jina-reranker-v2',
        querystring: {
          timeout: '5m',
        },
        body: {
          query: 'Find messages about deployment',
          input: [
            'Alice Deploy to prod',
            'Bob Fix bug',
            'Charlie Update deployment config',
          ],
        },
      });

      expect(result.output).toHaveLength(3);
    });

    it('should rerank all documents when rank_window_size is not specified', async () => {
      const mockEsClient = createMockEsClient({
        rerank: [
          { index: 4, relevance_score: 0.99 },
          { index: 2, relevance_score: 0.95 },
          { index: 0, relevance_score: 0.90 },
          { index: 3, relevance_score: 0.85 },
          { index: 1, relevance_score: 0.80 },
        ],
      });
      const mockContextManager = createMockContextManager(mockEsClient);

      const context: StepHandlerContext = {
        input: {
          user_question: 'Test query',
          data: [
            { id: 1 },
            { id: 2 },
            { id: 3 },
            { id: 4 },
            { id: 5 },
          ],
        },
        logger: mockLogger as any,
        contextManager: mockContextManager as any,
      } as any;

      const result = await rerankStepDefinition.handler(context);

      // All documents reranked
      expect(result.output).toHaveLength(5);
      expect(result.output).toEqual([
        { id: 5 },
        { id: 3 },
        { id: 1 },
        { id: 4 },
        { id: 2 },
      ]);

      // API called with all 5 documents
      expect(mockEsClient.transport.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            input: expect.arrayContaining([expect.any(String)]),
          }),
        })
      );
      const callInput = mockEsClient.transport.request.mock.calls[0][0].body.input;
      expect(callInput).toHaveLength(5);
    });

    it('should limit input to rank_window_size and append remaining docs', async () => {
      const mockEsClient = createMockEsClient({
        rerank: [
          { index: 2, relevance_score: 0.95 },
          { index: 0, relevance_score: 0.90 },
          { index: 1, relevance_score: 0.85 },
        ],
      });
      const mockContextManager = createMockContextManager(mockEsClient);

      const context: StepHandlerContext = {
        input: {
          user_question: 'Test query',
          data: [
            { id: 1 },
            { id: 2 },
            { id: 3 },
            { id: 4 },
            { id: 5 },
          ],
          rank_window_size: 3,
        },
        logger: mockLogger as any,
        contextManager: mockContextManager as any,
      } as any;

      const result = await rerankStepDefinition.handler(context);

      // Returns all 5 documents
      expect(result.output).toBeDefined();
      expect(result.output).toHaveLength(5);
      
      // First 3 are reranked
      expect(result.output!.slice(0, 3)).toEqual([
        { id: 3 },
        { id: 1 },
        { id: 2 },
      ]);
      
      // Last 2 are in original order
      expect(result.output!.slice(3)).toEqual([
        { id: 4 },
        { id: 5 },
      ]);

      // API called with only 3 documents (cost optimization)
      const callInput = mockEsClient.transport.request.mock.calls[0][0].body.input;
      expect(callInput).toHaveLength(3);
    });

    it('should handle rank_window_size larger than input array', async () => {
      const mockEsClient = createMockEsClient({
        rerank: [
          { index: 1, relevance_score: 0.95 },
          { index: 0, relevance_score: 0.85 },
        ],
      });
      const mockContextManager = createMockContextManager(mockEsClient);

      const context: StepHandlerContext = {
        input: {
          user_question: 'Test query',
          data: [
            { id: 1 },
            { id: 2 },
          ],
          rank_window_size: 10,
        },
        logger: mockLogger as any,
        contextManager: mockContextManager as any,
      } as any;

      const result = await rerankStepDefinition.handler(context);

      // All documents reranked, no remaining
      expect(result.output).toHaveLength(2);
      expect(result.output).toEqual([
        { id: 2 },
        { id: 1 },
      ]);

      const callInput = mockEsClient.transport.request.mock.calls[0][0].body.input;
      expect(callInput).toHaveLength(2);
    });

    it('should apply rank_window_size with field extraction', async () => {
      const mockEsClient = createMockEsClient({
        rerank: [
          { index: 1, relevance_score: 0.95 },
          { index: 0, relevance_score: 0.85 },
        ],
      });
      const mockContextManager = createMockContextManager(mockEsClient);

      const context: StepHandlerContext = {
        input: {
          user_question: 'Test query',
          data: [
            { id: 1, title: 'Doc 1', content: 'Content 1' },
            { id: 2, title: 'Doc 2', content: 'Content 2' },
            { id: 3, title: 'Doc 3', content: 'Content 3' },
            { id: 4, title: 'Doc 4', content: 'Content 4' },
          ],
          fields: [['title'], ['content']],
          rank_window_size: 2,
        },
        logger: mockLogger as any,
        contextManager: mockContextManager as any,
      } as any;

      const result = await rerankStepDefinition.handler(context);

      // Returns all 4 documents
      expect(result.output).toHaveLength(4);
      
      // First 2 are reranked
      expect(result.output!.slice(0, 2)).toEqual([
        { id: 2, title: 'Doc 2', content: 'Content 2' },
        { id: 1, title: 'Doc 1', content: 'Content 1' },
      ]);
      
      // Last 2 are in original order
      expect(result.output!.slice(2)).toEqual([
        { id: 3, title: 'Doc 3', content: 'Content 3' },
        { id: 4, title: 'Doc 4', content: 'Content 4' },
      ]);

      // API called with only 2 concatenated field values
      const callInput = mockEsClient.transport.request.mock.calls[0][0].body.input;
      expect(callInput).toHaveLength(2);
      expect(callInput).toEqual(['Doc 1 Content 1', 'Doc 2 Content 2']);
    });

    it('should return empty array when data is empty', async () => {
      const mockEsClient = createMockEsClient();
      const mockContextManager = createMockContextManager(mockEsClient);

      const context: StepHandlerContext = {
        input: {
          user_question: 'Test query',
          data: [],
        },
        logger: mockLogger as any,
        contextManager: mockContextManager as any,
      } as any;

      const result = await rerankStepDefinition.handler(context);

      expect(result.output).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith('No data to rerank');
      expect(mockEsClient.transport.request).not.toHaveBeenCalled();
    });

    it('should return empty array when data is not an array', async () => {
      const mockEsClient = createMockEsClient();
      const mockContextManager = createMockContextManager(mockEsClient);

      const context: StepHandlerContext = {
        input: {
          user_question: 'Test query',
          data: 'not an array' as any,
        },
        logger: mockLogger as any,
        contextManager: mockContextManager as any,
      } as any;

      const result = await rerankStepDefinition.handler(context);

      expect(result.output).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith('No data to rerank');
      expect(mockEsClient.transport.request).not.toHaveBeenCalled();
    });

    it('should fallback to original order when rerank response is invalid', async () => {
      const mockEsClient = createMockEsClient({ invalid: 'response' });
      const mockContextManager = createMockContextManager(mockEsClient);

      const context: StepHandlerContext = {
        input: {
          user_question: 'Test query',
          data: [
            { id: 1 },
            { id: 2 },
            { id: 3 },
          ],
        },
        logger: mockLogger as any,
        contextManager: mockContextManager as any,
      } as any;

      const result = await rerankStepDefinition.handler(context);

      expect(result.output).toEqual([
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ]);
    });

    it('should handle errors and return error object', async () => {
      const mockError = new Error('Elasticsearch request failed');
      const mockEsClient = {
        transport: {
          request: jest.fn().mockRejectedValue(mockError),
        },
      };
      const mockContextManager = createMockContextManager(mockEsClient);

      const context: StepHandlerContext = {
        input: {
          user_question: 'Test query',
          data: [{ id: 1 }],
        },
        logger: mockLogger as any,
        contextManager: mockContextManager as any,
      } as any;

      const result = await rerankStepDefinition.handler(context);

      expect(result.error).toEqual(mockError);
      expect(mockLogger.error).toHaveBeenCalledWith('Rerank step failed', mockError);
    });

    it('should handle missing fields gracefully', async () => {
      const mockEsClient = createMockEsClient();
      const mockContextManager = createMockContextManager(mockEsClient);

      const context: StepHandlerContext = {
        input: {
          user_question: 'Test query',
          data: [
            { title: 'Doc 1' },
            { content: 'Doc 2 content' },
            {},
          ],
          fields: [['title'], ['content'], ['missing']],
        },
        logger: mockLogger as any,
        contextManager: mockContextManager as any,
      } as any;

      const result = await rerankStepDefinition.handler(context);

      expect(mockEsClient.transport.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            query: 'Test query',
            input: [
              'Doc 1',
              'Doc 2 content',
              '',
            ],
          },
        })
      );

      expect(result.output).toHaveLength(3);
    });

    it('should filter out empty field values', async () => {
      const mockEsClient = createMockEsClient();
      const mockContextManager = createMockContextManager(mockEsClient);

      const context: StepHandlerContext = {
        input: {
          user_question: 'Test query',
          data: [
            { title: 'Title 1', content: '', metadata: null },
          ],
          fields: [['title'], ['content'], ['metadata']],
        },
        logger: mockLogger as any,
        contextManager: mockContextManager as any,
      } as any;

      await rerankStepDefinition.handler(context);

      expect(mockEsClient.transport.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            query: 'Test query',
            input: ['Title 1'],
          },
        })
      );
    });

    it('should use custom model ID when provided', async () => {
      const mockEsClient = createMockEsClient();
      const mockContextManager = createMockContextManager(mockEsClient);

      const context: StepHandlerContext = {
        input: {
          user_question: 'Test query',
          data: [{ id: 1 }],
          inference_id: 'custom-rerank-model',
        },
        logger: mockLogger as any,
        contextManager: mockContextManager as any,
      } as any;

      await rerankStepDefinition.handler(context);

      expect(mockEsClient.transport.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/_inference/rerank/custom-rerank-model',
        })
      );
    });

    it('should log relevant information during execution', async () => {
      const mockEsClient = createMockEsClient({
        rerank: [
          { index: 1, relevance_score: 0.95 },
          { index: 0, relevance_score: 0.85 },
        ],
      });
      const mockContextManager = createMockContextManager(mockEsClient);

      const context: StepHandlerContext = {
        input: {
          user_question: 'Test query',
          data: [{ id: 1 }, { id: 2 }],
          fields: [['id']],
          inference_id: 'test-model',
          rank_window_size: 2,
        },
        logger: mockLogger as any,
        contextManager: mockContextManager as any,
      } as any;

      await rerankStepDefinition.handler(context);

      expect(mockLogger.info).toHaveBeenCalledWith('Rerank step started', {
        userQuestion: 'Test query',
        dataLength: 2,
        inferenceId: 'test-model',
        hasFieldExtraction: true,
        rankWindowSize: 2,
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Rerank step completed', {
        inputCount: 2,
        rerankedCount: 2,
        remainingCount: 0,
        outputCount: 2,
        inferenceId: 'test-model',
      });
    });

    it('should log correctly with remaining documents', async () => {
      const mockEsClient = createMockEsClient({
        rerank: [
          { index: 1, relevance_score: 0.95 },
          { index: 0, relevance_score: 0.85 },
        ],
      });
      const mockContextManager = createMockContextManager(mockEsClient);

      const context: StepHandlerContext = {
        input: {
          user_question: 'Test query',
          data: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
          rank_window_size: 2,
        },
        logger: mockLogger as any,
        contextManager: mockContextManager as any,
      } as any;

      await rerankStepDefinition.handler(context);

      expect(mockLogger.info).toHaveBeenCalledWith('Rerank step completed', {
        inputCount: 4,
        rerankedCount: 2,
        remainingCount: 2,
        outputCount: 4,
        inferenceId: '.jina-reranker-v2',
      });
    });

    it('should handle rank_window_size of 0 by reranking all documents', async () => {
      const mockEsClient = createMockEsClient({
        rerank: [
          { index: 1, relevance_score: 0.95 },
          { index: 0, relevance_score: 0.85 },
        ],
      });
      const mockContextManager = createMockContextManager(mockEsClient);

      const context: StepHandlerContext = {
        input: {
          user_question: 'Test query',
          data: [{ id: 1 }, { id: 2 }],
          rank_window_size: 0,
        },
        logger: mockLogger as any,
        contextManager: mockContextManager as any,
      } as any;

      const result = await rerankStepDefinition.handler(context);

      // When rank_window_size is 0 (falsy), should rerank all
      expect(result.output).toHaveLength(2);
      
      const callInput = mockEsClient.transport.request.mock.calls[0][0].body.input;
      expect(callInput).toHaveLength(2);
    });

    it('should handle rank_window_size of 1', async () => {
      const mockEsClient = createMockEsClient({
        rerank: [
          { index: 0, relevance_score: 0.95 },
        ],
      });
      const mockContextManager = createMockContextManager(mockEsClient);

      const context: StepHandlerContext = {
        input: {
          user_question: 'Test query',
          data: [
            { id: 1 },
            { id: 2 },
            { id: 3 },
          ],
          rank_window_size: 1,
        },
        logger: mockLogger as any,
        contextManager: mockContextManager as any,
      } as any;

      const result = await rerankStepDefinition.handler(context);

      // Only first doc reranked (stays in place), rest appended
      expect(result.output).toEqual([
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ]);
      
      const callInput = mockEsClient.transport.request.mock.calls[0][0].body.input;
      expect(callInput).toHaveLength(1);
    });

    it('should handle rank_window_size with invalid API response fallback', async () => {
      const mockEsClient = createMockEsClient({ invalid: 'response' });
      const mockContextManager = createMockContextManager(mockEsClient);

      const context: StepHandlerContext = {
        input: {
          user_question: 'Test query',
          data: [
            { id: 1 },
            { id: 2 },
            { id: 3 },
            { id: 4 },
          ],
          rank_window_size: 2,
        },
        logger: mockLogger as any,
        contextManager: mockContextManager as any,
      } as any;

      const result = await rerankStepDefinition.handler(context);

      // Falls back to original order for window, then appends remaining
      expect(result.output).toEqual([
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 },
      ]);
      
      // Only first 2 sent to API
      const callInput = mockEsClient.transport.request.mock.calls[0][0].body.input;
      expect(callInput).toHaveLength(2);
    });
  });

  describe('schema validation', () => {
    it('should have correct step type ID', () => {
      expect(rerankStepDefinition.id).toBe('workflows.rerank');
    });

    it('should validate valid input', () => {
      const validInput = {
        user_question: 'Test query',
        data: [{ id: 1 }],
      };

      const result = rerankStepDefinition.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should apply default values', () => {
      const input = {
        user_question: 'Test query',
        data: [{ id: 1 }],
      };

      const result = rerankStepDefinition.inputSchema.parse(input);
      expect(result.inference_id).toBe('.jina-reranker-v2');
      expect(result.rank_window_size).toBeUndefined(); // Optional, no default
    });

    it('should reject invalid input', () => {
      const invalidInput = {
        user_question: 123, // Should be string
        data: 'not an array', // Should be array
      };

      const result = rerankStepDefinition.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate optional fields parameter', () => {
      const inputWithFields = {
        user_question: 'Test',
        data: [{ id: 1 }],
        fields: [['title'], ['content']],
      };

      const result = rerankStepDefinition.inputSchema.safeParse(inputWithFields);
      expect(result.success).toBe(true);
    });

    it('should validate optional rank_window_size parameter', () => {
      const inputWithRankWindow = {
        user_question: 'Test',
        data: [{ id: 1 }],
        rank_window_size: 5,
      };

      const result = rerankStepDefinition.inputSchema.safeParse(inputWithRankWindow);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rank_window_size).toBe(5);
      }
    });

    it('should validate output schema', () => {
      const validOutput = [{ id: 1 }, { id: 2 }];
      const result = rerankStepDefinition.outputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });
  });
});
