/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import { streamsGetStreamStepDefinition } from './streams_get_stream_step';
import type { StepHandlerContext } from '../../step_registry/types';

// Mock the fetch function
const mockFetch = jest.fn();
global.fetch = mockFetch;

const createMockContext = (
  input: { name: string } = { name: 'logs' }
): StepHandlerContext<any, any> => ({
  config: {},
  input,
  rawInput: input,
  contextManager: {
    renderInputTemplate: jest.fn((templateInput) => templateInput),
    getContext: jest.fn().mockReturnValue({
      kibanaUrl: 'http://localhost:5601',
    }),
    getScopedEsClient: jest.fn(),
    getFakeRequest: jest.fn().mockReturnValue({
      headers: {
        authorization: 'Bearer test-token',
        cookie: 'test-cookie',
      },
    } as unknown as KibanaRequest),
  },
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  abortSignal: new AbortController().signal,
  stepId: 'test-step',
  stepType: 'streams.getStream',
});

describe('streamsGetStreamStepDefinition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handler', () => {
    it('should successfully get a stream', async () => {
      const mockStream = {
        name: 'logs',
        type: 'wired',
        definition: { fields: [] },
        features: [],
        dashboards: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockStream),
      });

      const context = createMockContext({ name: 'logs' });
      const result = await streamsGetStreamStepDefinition.handler(context);

      expect(result.output).toEqual({ stream: mockStream });
      expect(result.error).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5601/api/streams/logs',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            authorization: 'Bearer test-token',
            'elastic-api-version': '2023-10-31',
          }),
        })
      );
      expect(context.logger.debug).toHaveBeenCalledWith('Fetching stream: logs');
      expect(context.logger.debug).toHaveBeenCalledWith('Successfully fetched stream: logs');
    });

    it('should URL encode stream names with special characters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ name: 'logs/test' }),
      });

      const context = createMockContext({ name: 'logs/test' });
      await streamsGetStreamStepDefinition.handler(context);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5601/api/streams/logs%2Ftest',
        expect.any(Object)
      );
    });

    it('should handle stream not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: jest.fn().mockResolvedValueOnce('Stream not found'),
      });

      const context = createMockContext({ name: 'nonexistent' });
      const result = await streamsGetStreamStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('404');
      expect(context.logger.error).toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const context = createMockContext({ name: 'logs' });
      const result = await streamsGetStreamStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Connection refused');
      expect(context.logger.error).toHaveBeenCalled();
    });

    it('should forward authentication headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ name: 'logs' }),
      });

      const context = createMockContext({ name: 'logs' });
      await streamsGetStreamStepDefinition.handler(context);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: 'Bearer test-token',
            cookie: 'test-cookie',
            'kbn-xsrf': 'true',
          }),
        })
      );
    });
  });

  describe('schema validation', () => {
    it('should have correct step type ID', () => {
      expect(streamsGetStreamStepDefinition.id).toBe('streams.getStream');
    });

    it('should validate input schema with name', () => {
      const parseResult = streamsGetStreamStepDefinition.inputSchema.safeParse({ name: 'logs' });
      expect(parseResult.success).toBe(true);
    });

    it('should reject input without name', () => {
      const parseResult = streamsGetStreamStepDefinition.inputSchema.safeParse({});
      expect(parseResult.success).toBe(false);
    });

    it('should validate output schema', () => {
      const output = {
        stream: { name: 'test-stream', type: 'wired' },
      };

      const parseResult = streamsGetStreamStepDefinition.outputSchema.safeParse(output);
      expect(parseResult.success).toBe(true);
    });
  });
});
