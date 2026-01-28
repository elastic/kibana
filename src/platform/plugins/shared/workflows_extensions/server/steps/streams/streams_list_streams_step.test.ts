/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import { streamsListStreamsStepDefinition } from './streams_list_streams_step';
import type { StepHandlerContext } from '../../step_registry/types';

// Mock the fetch function
const mockFetch = jest.fn();
global.fetch = mockFetch;

const createMockContext = (): StepHandlerContext<any, any> => ({
  config: {},
  input: {},
  rawInput: {},
  contextManager: {
    renderInputTemplate: jest.fn((input) => input),
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
  stepType: 'streams.listStreams',
});

describe('streamsListStreamsStepDefinition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handler', () => {
    it('should successfully list streams', async () => {
      const mockStreams = [
        { name: 'logs', type: 'wired' },
        { name: 'metrics', type: 'classic' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ streams: mockStreams }),
      });

      const context = createMockContext();
      const result = await streamsListStreamsStepDefinition.handler(context);

      expect(result.output).toEqual({ streams: mockStreams });
      expect(result.error).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5601/api/streams',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            authorization: 'Bearer test-token',
            'elastic-api-version': '2023-10-31',
          }),
        })
      );
      expect(context.logger.debug).toHaveBeenCalledWith('Fetching list of streams');
      expect(context.logger.debug).toHaveBeenCalledWith('Successfully fetched 2 streams');
    });

    it('should handle empty streams list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ streams: [] }),
      });

      const context = createMockContext();
      const result = await streamsListStreamsStepDefinition.handler(context);

      expect(result.output).toEqual({ streams: [] });
      expect(result.error).toBeUndefined();
    });

    it('should handle API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValueOnce('Server error'),
      });

      const context = createMockContext();
      const result = await streamsListStreamsStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Kibana API request failed');
      expect(result.error?.message).toContain('500');
      expect(context.logger.error).toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const context = createMockContext();
      const result = await streamsListStreamsStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Network error');
      expect(context.logger.error).toHaveBeenCalled();
    });

    it('should forward authentication headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ streams: [] }),
      });

      const context = createMockContext();
      await streamsListStreamsStepDefinition.handler(context);

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
      expect(streamsListStreamsStepDefinition.id).toBe('streams.listStreams');
    });

    it('should validate input schema with empty object', () => {
      const parseResult = streamsListStreamsStepDefinition.inputSchema.safeParse({});
      expect(parseResult.success).toBe(true);
    });

    it('should validate output schema', () => {
      const output = {
        streams: [{ name: 'test-stream', type: 'wired' }],
      };

      const parseResult = streamsListStreamsStepDefinition.outputSchema.safeParse(output);
      expect(parseResult.success).toBe(true);
    });
  });
});
