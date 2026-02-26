/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { FirecrawlConnector } from './firecrawl';

describe('FirecrawlConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: { debug: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(FirecrawlConnector).toBeDefined();
  });

  it('should have correct metadata', () => {
    expect(FirecrawlConnector.metadata.id).toBe('.firecrawl');
    expect(FirecrawlConnector.metadata.displayName).toBe('Firecrawl');
    expect(FirecrawlConnector.metadata.description).toBeDefined();
  });

  it('should have a valid schema', () => {
    const schema = FirecrawlConnector.schema;
    expect(schema).toBeDefined();
    if (schema) {
      expect(schema.parse({})).toEqual({});
    }
  });

  it('should have a test handler', () => {
    expect(FirecrawlConnector.test).toBeDefined();
    expect(typeof FirecrawlConnector.test?.handler).toBe('function');
    expect(FirecrawlConnector.test?.description).toBeDefined();
  });

  it('should use bearer auth type', () => {
    expect(FirecrawlConnector.auth).toBeDefined();
    expect(FirecrawlConnector.auth?.types).toContain('bearer');
  });

  describe('scrape action', () => {
    it('should scrape URL and return response data', async () => {
      const mockData = { success: true, data: { markdown: '# Hello' } };
      mockClient.post.mockResolvedValue({ data: mockData });

      const result = await FirecrawlConnector.actions.scrape.handler(mockContext, {
        url: 'https://example.com',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.firecrawl.dev/v2/scrape',
        expect.objectContaining({ url: 'https://example.com' })
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('search action', () => {
    it('should search with query and return response data', async () => {
      const mockData = { success: true, data: [] };
      mockClient.post.mockResolvedValue({ data: mockData });

      const result = await FirecrawlConnector.actions.search.handler(mockContext, {
        query: 'test query',
        limit: 5,
      });

      expect(mockClient.post).toHaveBeenCalledWith('https://api.firecrawl.dev/v2/search', {
        query: 'test query',
        limit: 5,
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('map action', () => {
    it('should map URL and return response data', async () => {
      const mockData = { success: true, links: [] };
      mockClient.post.mockResolvedValue({ data: mockData });

      const result = await FirecrawlConnector.actions.map.handler(mockContext, {
        url: 'https://example.com',
        limit: 5000,
        includeSubdomains: true,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.firecrawl.dev/v2/map',
        expect.objectContaining({
          url: 'https://example.com',
          limit: 5000,
          includeSubdomains: true,
        })
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('crawl action', () => {
    it('should start crawl and return response data', async () => {
      const mockData = { success: true, id: '550e8400-e29b-41d4-a716-446655440000' };
      mockClient.post.mockResolvedValue({ data: mockData });

      const result = await FirecrawlConnector.actions.crawl.handler(mockContext, {
        url: 'https://example.com',
        limit: 100,
        allowExternalLinks: false,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.firecrawl.dev/v2/crawl',
        expect.objectContaining({
          url: 'https://example.com',
          limit: 100,
          allowExternalLinks: false,
        })
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('getCrawlStatus action', () => {
    it('should get crawl status by id and return response data', async () => {
      const crawlId = '550e8400-e29b-41d4-a716-446655440000';
      const mockData = { status: 'completed', total: 10, completed: 10 };
      mockClient.get.mockResolvedValue({ data: mockData });

      const result = await FirecrawlConnector.actions.getCrawlStatus.handler(mockContext, {
        id: crawlId,
      });

      expect(mockClient.get).toHaveBeenCalledWith(`https://api.firecrawl.dev/v2/crawl/${crawlId}`);
      expect(result).toEqual(mockData);
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      mockClient.post.mockResolvedValue({ data: { success: true } });

      if (!FirecrawlConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await FirecrawlConnector.test.handler(mockContext);

      expect(mockClient.post).toHaveBeenCalledWith('https://api.firecrawl.dev/v2/scrape', {
        url: 'https://example.com',
      });
      expect(mockContext.log.debug).toHaveBeenCalledWith('Firecrawl test handler');
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Firecrawl API',
      });
    });

    it('should return failure when API is not accessible', async () => {
      mockClient.post.mockRejectedValue(new Error('Invalid API key'));

      if (!FirecrawlConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await FirecrawlConnector.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Failed to connect');
      expect(result.message).toContain('Invalid API key');
    });

    it('should return failure with specific message when API returns 401', async () => {
      const err = new Error('Unauthorized') as Error & { response?: { status: number } };
      err.response = { status: 401 };
      mockClient.post.mockRejectedValue(err);

      if (!FirecrawlConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await FirecrawlConnector.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Invalid or missing API key');
    });
  });
});
