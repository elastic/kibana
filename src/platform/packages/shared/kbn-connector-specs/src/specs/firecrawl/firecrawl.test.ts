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

    it('should truncate markdown when exceeding maxMarkdownLength', async () => {
      const longMarkdown = 'x'.repeat(5000);
      mockClient.post.mockResolvedValue({
        data: { markdown: longMarkdown, metadata: { title: 'Page' } },
      });

      const result = await FirecrawlConnector.actions.scrape.handler(mockContext, {
        url: 'https://example.com',
        maxMarkdownLength: 100,
      });

      expect(result).toMatchObject({
        metadata: { title: 'Page' },
        markdown: 'x'.repeat(100) + '\n\n[... content truncated for length ...]',
      });
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

  describe('crawlAndWait action', () => {
    it('should start crawl, poll until completed, and return slimmed result', async () => {
      const jobId = '550e8400-e29b-41d4-a716-446655440000';
      mockClient.post.mockResolvedValue({
        data: { success: true, id: jobId },
      });
      mockClient.get
        .mockResolvedValueOnce({
          data: { status: 'active', current: 2, total: 10 },
        })
        .mockResolvedValueOnce({
          data: {
            status: 'completed',
            total: 10,
            data: [
              {
                metadata: { url: 'https://example.com', title: 'Example' },
                markdown: '# Hello',
              },
            ],
          },
        });

      const result = await FirecrawlConnector.actions.crawlAndWait.handler(mockContext, {
        url: 'https://example.com',
        limit: 100,
        pollIntervalMs: 10,
        maxWaitMs: 5000,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.firecrawl.dev/v2/crawl',
        expect.objectContaining({ url: 'https://example.com', limit: 100 })
      );
      expect(mockClient.get).toHaveBeenCalledTimes(2);
      expect(mockClient.get).toHaveBeenCalledWith(`https://api.firecrawl.dev/v2/crawl/${jobId}`);
      expect(result).toEqual({
        status: 'completed',
        total: 10,
        data: [
          {
            url: 'https://example.com',
            title: 'Example',
            markdownSnippet: '# Hello',
          },
        ],
      });
    });

    it('should return immediately when first status is completed', async () => {
      const jobId = '660e8400-e29b-41d4-a716-446655440001';
      mockClient.post.mockResolvedValue({ data: { id: jobId } });
      mockClient.get.mockResolvedValue({
        data: { status: 'completed', total: 1, data: [] },
      });

      const result = await FirecrawlConnector.actions.crawlAndWait.handler(mockContext, {
        url: 'https://example.org',
        pollIntervalMs: 1000,
        maxWaitMs: 10_000,
      });

      expect(mockClient.get).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ status: 'completed', total: 1, data: [] });
    });

    it('should return when status is failed and preserve error', async () => {
      const jobId = '770e8400-e29b-41d4-a716-446655440002';
      mockClient.post.mockResolvedValue({ data: { id: jobId } });
      mockClient.get.mockResolvedValue({
        data: { status: 'failed', error: 'Crawl failed' },
      });

      const result = await FirecrawlConnector.actions.crawlAndWait.handler(mockContext, {
        url: 'https://example.net',
        pollIntervalMs: 10,
        maxWaitMs: 5000,
      });

      expect(mockClient.get).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        status: 'failed',
        total: 0,
        data: [],
        error: 'Crawl failed',
      });
    });

    it('should throw when start response has no job ID', async () => {
      mockClient.post.mockResolvedValue({ data: { success: false } });

      await expect(
        FirecrawlConnector.actions.crawlAndWait.handler(mockContext, {
          url: 'https://example.com',
          pollIntervalMs: 10,
          maxWaitMs: 1000,
        })
      ).rejects.toThrow('did not contain a job ID');
    });

    it('should throw when maxWaitMs exceeded', async () => {
      const jobId = '880e8400-e29b-41d4-a716-446655440003';
      mockClient.post.mockResolvedValue({ data: { id: jobId } });
      mockClient.get.mockResolvedValue({ data: { status: 'active', current: 1, total: 100 } });

      await expect(
        FirecrawlConnector.actions.crawlAndWait.handler(mockContext, {
          url: 'https://example.com',
          pollIntervalMs: 50,
          maxWaitMs: 100,
        })
      ).rejects.toThrow('did not complete within');
    });

    it('should slim output: truncate markdown snippet and cap page count', async () => {
      const jobId = '990e8400-e29b-41d4-a716-446655440004';
      const longMarkdown = 'x'.repeat(1000);
      mockClient.post.mockResolvedValue({ data: { id: jobId } });
      mockClient.get.mockResolvedValue({
        data: {
          status: 'completed',
          total: 2,
          data: [
            {
              metadata: { sourceURL: 'https://a.example.com', title: 'Page A' },
              markdown: longMarkdown,
            },
            {
              metadata: { canonical: 'https://b.example.com', ogTitle: 'Page B' },
              markdown: 'short',
            },
          ],
        },
      });

      const result = await FirecrawlConnector.actions.crawlAndWait.handler(mockContext, {
        url: 'https://example.com',
        pollIntervalMs: 10,
        maxWaitMs: 5000,
      });

      expect(result.status).toBe('completed');
      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        url: 'https://a.example.com',
        title: 'Page A',
        markdownSnippet: 'x'.repeat(500) + '...',
      });
      expect(result.data[1]).toEqual({
        url: 'https://b.example.com',
        title: 'Page B',
        markdownSnippet: 'short',
      });
    });
  });

  describe('getCrawlStatus action', () => {
    it('should get crawl status by id and return slimmed response', async () => {
      const crawlId = '550e8400-e29b-41d4-a716-446655440000';
      const longMarkdown = 'x'.repeat(600);
      const mockData = {
        status: 'completed',
        total: 2,
        data: [
          {
            metadata: { sourceURL: 'https://example.com/a', title: 'Page A' },
            markdown: longMarkdown,
          },
          {
            metadata: { url: 'https://example.com/b', ogTitle: 'Page B' },
            markdown: 'Short',
          },
        ],
      };
      mockClient.get.mockResolvedValue({ data: mockData });

      const result = await FirecrawlConnector.actions.getCrawlStatus.handler(mockContext, {
        id: crawlId,
      });

      expect(mockClient.get).toHaveBeenCalledWith(`https://api.firecrawl.dev/v2/crawl/${crawlId}`);
      expect(result).toEqual({
        status: 'completed',
        total: 2,
        data: [
          {
            url: 'https://example.com/a',
            title: 'Page A',
            markdownSnippet: 'x'.repeat(500) + '...',
          },
          { url: 'https://example.com/b', title: 'Page B', markdownSnippet: 'Short' },
        ],
      });
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
