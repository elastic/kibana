/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import { streamsGetSignificantEventsStepDefinition } from './streams_get_significant_events_step';
import type { StepHandlerContext } from '../../step_registry/types';

// Mock the fetch function
const mockFetch = jest.fn();
global.fetch = mockFetch;

const createMockContext = (
  input: {
    name: string;
    from: string;
    to: string;
    bucketSize: string;
    query?: string;
  } = {
    name: 'logs',
    from: '2024-01-01T00:00:00Z',
    to: '2024-01-02T00:00:00Z',
    bucketSize: '1h',
  }
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
  stepType: 'streams.getSignificantEvents',
});

describe('streamsGetSignificantEventsStepDefinition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handler', () => {
    it('should successfully get significant events', async () => {
      const mockResponse = {
        significant_events: [
          {
            stream_name: 'logs',
            kql: 'error:*',
            occurrences: [{ date: '2024-01-01T00:00:00Z', count: 5 }],
            change_points: {},
          },
        ],
        aggregated_occurrences: [{ date: '2024-01-01T00:00:00Z', count: 5 }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const context = createMockContext();
      const result = await streamsGetSignificantEventsStepDefinition.handler(context);

      expect(result.output).toEqual(mockResponse);
      expect(result.error).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/streams/logs/significant_events'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            authorization: 'Bearer test-token',
            'elastic-api-version': '2023-10-31',
          }),
        })
      );
      expect(context.logger.debug).toHaveBeenCalledWith(
        'Fetching significant events for stream: logs'
      );
    });

    it('should include query parameters in the URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          significant_events: [],
          aggregated_occurrences: [],
        }),
      });

      const context = createMockContext({
        name: 'logs',
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-02T00:00:00Z',
        bucketSize: '1h',
        query: 'severity:error',
      });
      await streamsGetSignificantEventsStepDefinition.handler(context);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('from=2024-01-01T00%3A00%3A00Z');
      expect(calledUrl).toContain('to=2024-01-02T00%3A00%3A00Z');
      expect(calledUrl).toContain('bucketSize=1h');
      expect(calledUrl).toContain('query=severity%3Aerror');
    });

    it('should handle empty significant events', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          significant_events: [],
          aggregated_occurrences: [],
        }),
      });

      const context = createMockContext();
      const result = await streamsGetSignificantEventsStepDefinition.handler(context);

      expect(result.output).toEqual({
        significant_events: [],
        aggregated_occurrences: [],
      });
      expect(result.error).toBeUndefined();
    });

    it('should handle API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: jest.fn().mockResolvedValueOnce('Access denied'),
      });

      const context = createMockContext();
      const result = await streamsGetSignificantEventsStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('403');
      expect(context.logger.error).toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Timeout'));

      const context = createMockContext();
      const result = await streamsGetSignificantEventsStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Timeout');
      expect(context.logger.error).toHaveBeenCalled();
    });

    it('should URL encode stream names with special characters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          significant_events: [],
          aggregated_occurrences: [],
        }),
      });

      const context = createMockContext({
        name: 'logs/test',
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-02T00:00:00Z',
        bucketSize: '1h',
      });
      await streamsGetSignificantEventsStepDefinition.handler(context);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('/api/streams/logs%2Ftest/significant_events');
    });

    it('should not include query parameter if not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          significant_events: [],
          aggregated_occurrences: [],
        }),
      });

      const context = createMockContext({
        name: 'logs',
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-02T00:00:00Z',
        bucketSize: '1h',
      });
      await streamsGetSignificantEventsStepDefinition.handler(context);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).not.toContain('query=');
    });
  });

  describe('schema validation', () => {
    it('should have correct step type ID', () => {
      expect(streamsGetSignificantEventsStepDefinition.id).toBe('streams.getSignificantEvents');
    });

    it('should validate input schema with required fields', () => {
      const parseResult = streamsGetSignificantEventsStepDefinition.inputSchema.safeParse({
        name: 'logs',
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-02T00:00:00Z',
        bucketSize: '1h',
      });
      expect(parseResult.success).toBe(true);
    });

    it('should validate input schema with optional query', () => {
      const parseResult = streamsGetSignificantEventsStepDefinition.inputSchema.safeParse({
        name: 'logs',
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-02T00:00:00Z',
        bucketSize: '1h',
        query: 'severity:error',
      });
      expect(parseResult.success).toBe(true);
    });

    it('should reject input without required fields', () => {
      const parseResult = streamsGetSignificantEventsStepDefinition.inputSchema.safeParse({
        name: 'logs',
      });
      expect(parseResult.success).toBe(false);
    });

    it('should validate output schema', () => {
      const output = {
        significant_events: [{ stream_name: 'logs' }],
        aggregated_occurrences: [{ date: '2024-01-01', count: 5 }],
      };

      const parseResult = streamsGetSignificantEventsStepDefinition.outputSchema.safeParse(output);
      expect(parseResult.success).toBe(true);
    });
  });
});
