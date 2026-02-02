/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { BraveSearchConnector } from './brave_search';

describe('BraveSearchConnector', () => {
  const mockClient = {
    get: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: {},
  } as unknown as ActionContext;

  // Minimal mock response to prevent NPE - reused across tests
  const createMockResponse = (overrides = {}) => ({
    data: {
      query: { original: 'test query' },
      web: { results: [] },
      type: 'search',
      ...overrides,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation
    mockClient.get.mockResolvedValue(createMockResponse());
  });

  describe('webSearch action', () => {
    it('should perform a basic web search with default parameters and return correct structure', async () => {
      const mockResponse = createMockResponse({
        query: { original: 'test query' },
        web: {
          results: [
            {
              title: 'Test Result',
              url: 'https://example.com',
              description: 'A test result',
            },
          ],
        },
      });
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await BraveSearchConnector.actions.webSearch.handler(mockContext, {
        q: 'test query',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.search.brave.com/res/v1/web/search',
        {
          params: {
            q: 'test query',
            count: 10,
            offset: 0,
          },
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip',
          },
        }
      );
      expect(result).toEqual({
        query: mockResponse.data.query,
        results: mockResponse.data.web.results,
        type: 'search',
      });
    });

    it('should perform a web search with custom count parameter', async () => {
      await BraveSearchConnector.actions.webSearch.handler(mockContext, {
        q: 'test query',
        count: 3,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.search.brave.com/res/v1/web/search',
        {
          params: {
            q: 'test query',
            count: 3,
            offset: 0,
          },
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip',
          },
        }
      );
    });

    it('should perform a web search with custom offset for pagination', async () => {
      await BraveSearchConnector.actions.webSearch.handler(mockContext, {
        q: 'test query',
        count: 10,
        offset: 10,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.search.brave.com/res/v1/web/search',
        {
          params: {
            q: 'test query',
            count: 10,
            offset: 10,
          },
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip',
          },
        }
      );
    });

    it('should handle response with no web results', async () => {
      mockClient.get.mockResolvedValue(
        createMockResponse({
          web: undefined, // No web property
        })
      );

      const result = (await BraveSearchConnector.actions.webSearch.handler(mockContext, {
        q: 'obscure query',
      })) as {
        query: string;
        results: [];
        type: string;
      };

      expect(result.results).toEqual([]);
    });

    it('should perform a web search with maximum count', async () => {
      await BraveSearchConnector.actions.webSearch.handler(mockContext, {
        q: 'popular query',
        count: 20,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.search.brave.com/res/v1/web/search',
        {
          params: {
            q: 'popular query',
            count: 20,
            offset: 0,
          },
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip',
          },
        }
      );
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      if (!BraveSearchConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await BraveSearchConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.search.brave.com/res/v1/web/search',
        {
          params: {
            q: 'test',
            count: 1,
          },
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip',
          },
        }
      );
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Brave Search API',
      });
    });

    it('should return failure when API is not accessible', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid API key'));

      if (!BraveSearchConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await BraveSearchConnector.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Failed to connect to Brave Search API');
      expect(result.message).toContain('Invalid API key');
    });
  });
});
