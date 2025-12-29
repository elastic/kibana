/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { JinaReaderConnector } from './jina_reader';

interface HttpError extends Error {
  response?: {
    status: number;
    data?: unknown;
  };
}

describe('JinaReaderConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: { debug: jest.fn() },
    config: {},
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('browse action', () => {
    it('should browse URL and return markdown content', async () => {
      const mockResponse = {
        data: {
          data: {
            title: 'Test Page',
            content: '# Test Content',
            markdown: '# Test Content',
            metadata: { url: 'https://example.com' },
          },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await JinaReaderConnector.actions.browse.handler(mockContext, {
        url: 'https://example.com',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://r.jina.ai',
        {
          url: 'https://example.com',
          respondWith: 'content',
        },
        {
          headers: { Accept: 'application/json' },
        }
      );
      expect(result).toEqual({
        ok: true,
        title: 'Test Page',
        content: '# Test Content',
        markdown: '# Test Content',
        metadata: { url: 'https://example.com' },
      });
    });

    it('should use custom return format', async () => {
      const mockResponse = {
        data: {
          data: {
            title: 'Test Page',
            html: '<h1>Test Content</h1>',
          },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await JinaReaderConnector.actions.browse.handler(mockContext, {
        url: 'https://example.com',
        returnFormat: 'html',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://r.jina.ai',
        {
          url: 'https://example.com',
          respondWith: 'html',
        },
        {
          headers: { Accept: 'application/json' },
        }
      );
      expect((result as { ok: boolean; title?: string }).ok).toBe(true);
      expect((result as { ok: boolean; title?: string }).title).toBe('Test Page');
    });

    it('should use overrideBrowseUrl from config', async () => {
      const mockResponse = {
        data: {
          data: {
            title: 'Test Page',
            content: 'Test Content',
          },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const contextWithConfig = {
        ...mockContext,
        config: { overrideBrowseUrl: 'https://custom.jina.ai' },
      } as unknown as ActionContext;

      await JinaReaderConnector.actions.browse.handler(contextWithConfig, {
        url: 'https://example.com',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://custom.jina.ai',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should include additional options', async () => {
      const mockResponse = {
        data: {
          data: {
            title: 'Test Page',
            content: 'Test Content',
          },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      await JinaReaderConnector.actions.browse.handler(mockContext, {
        url: 'https://example.com',
        options: { customOption: 'value' },
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://r.jina.ai',
        {
          url: 'https://example.com',
          respondWith: 'content',
          customOption: 'value',
        },
        {
          headers: { Accept: 'application/json' },
        }
      );
    });

    it('should return ok: false when data is missing', async () => {
      const mockResponse = {
        data: {
          error: 'Invalid URL',
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await JinaReaderConnector.actions.browse.handler(mockContext, {
        url: 'https://invalid-url',
      });

      expect((result as { ok: boolean; error?: string }).ok).toBe(false);
      expect((result as { ok: boolean; error?: string }).error).toBe('Invalid URL');
    });

    it('should handle errors', async () => {
      const error: HttpError = new Error('Network error');
      error.response = { status: 500, data: { message: 'Server error' } };
      mockClient.post.mockRejectedValue(error);

      await expect(
        JinaReaderConnector.actions.browse.handler(mockContext, {
          url: 'https://example.com',
        })
      ).rejects.toThrow('Network error');
    });
  });

  describe('search action', () => {
    it('should perform web search', async () => {
      const mockResponse = {
        data: {
          data: [
            { title: 'Result 1', url: 'https://example.com/1' },
            { title: 'Result 2', url: 'https://example.com/2' },
          ],
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await JinaReaderConnector.actions.search.handler(mockContext, {
        query: 'test query',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://s.jina.ai',
        {
          q: 'test query',
          respondWith: 'no-content',
        },
        {
          headers: { Accept: 'application/json' },
        }
      );
      expect(result).toEqual({
        ok: true,
        results: [
          { title: 'Result 1', url: 'https://example.com/1' },
          { title: 'Result 2', url: 'https://example.com/2' },
        ],
      });
    });

    it('should use custom return format', async () => {
      const mockResponse = {
        data: {
          data: [{ title: 'Result 1', content: 'Content 1' }],
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      await JinaReaderConnector.actions.search.handler(mockContext, {
        query: 'test query',
        returnFormat: 'markdown',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://s.jina.ai',
        {
          q: 'test query',
          respondWith: 'content',
        },
        {
          headers: { Accept: 'application/json' },
        }
      );
    });

    it('should use overrideSearchUrl from config', async () => {
      const mockResponse = {
        data: {
          data: [{ title: 'Result 1', url: 'https://example.com/1' }],
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const contextWithConfig = {
        ...mockContext,
        config: { overrideSearchUrl: 'https://custom-search.jina.ai' },
      } as unknown as ActionContext;

      await JinaReaderConnector.actions.search.handler(contextWithConfig, {
        query: 'test query',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://custom-search.jina.ai',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should include additional options', async () => {
      const mockResponse = {
        data: {
          data: [{ title: 'Result 1', url: 'https://example.com/1' }],
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      await JinaReaderConnector.actions.search.handler(mockContext, {
        query: 'test query',
        options: { limit: 10 },
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://s.jina.ai',
        {
          q: 'test query',
          respondWith: 'no-content',
          limit: 10,
        },
        {
          headers: { Accept: 'application/json' },
        }
      );
    });

    it('should return ok: false when data is missing', async () => {
      const mockResponse = {
        data: {
          error: 'Invalid query',
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await JinaReaderConnector.actions.search.handler(mockContext, {
        query: '',
      });

      expect((result as { ok: boolean; error?: string }).ok).toBe(false);
      expect((result as { ok: boolean; error?: string }).error).toBe('Invalid query');
    });
  });

  describe('fileToMarkdown action', () => {
    it('should convert file to markdown', async () => {
      const fileContent = Buffer.from('test file content').toString('base64');
      const mockResponse = {
        data: {
          data: {
            title: 'Document',
            content: '# Document\n\nContent',
            markdown: '# Document\n\nContent',
          },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await JinaReaderConnector.actions.fileToMarkdown.handler(mockContext, {
        file: fileContent,
        filename: 'test.pdf',
      });

      expect(mockClient.post).toHaveBeenCalledWith('https://r.jina.ai', expect.any(FormData), {
        headers: { Accept: 'application/json' },
      });
      expect((result as { ok: boolean; title?: string }).ok).toBe(true);
      expect((result as { ok: boolean; title?: string }).title).toBe('Document');
    });

    it('should include additional options', async () => {
      const fileContent = Buffer.from('test file content').toString('base64');
      const mockResponse = {
        data: {
          data: {
            title: 'Document',
            content: 'Content',
          },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      await JinaReaderConnector.actions.fileToMarkdown.handler(mockContext, {
        file: fileContent,
        filename: 'test.pdf',
        options: { customOption: 'value' },
      });

      expect(mockClient.post).toHaveBeenCalled();
    });

    it('should use default filename when not provided', async () => {
      const fileContent = Buffer.from('test file content').toString('base64');
      const mockResponse = {
        data: {
          data: {
            title: 'Document',
            content: 'Content',
          },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      await JinaReaderConnector.actions.fileToMarkdown.handler(mockContext, {
        file: fileContent,
      });

      expect(mockClient.post).toHaveBeenCalled();
    });
  });

  describe('fileToRenderedImage action', () => {
    it('should render file to image', async () => {
      const fileContent = Buffer.from('test file content').toString('base64');
      const mockResponse = {
        data: {
          data: {
            screenshotUrl: 'https://example.com/screenshot.png',
          },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await JinaReaderConnector.actions.fileToRenderedImage.handler(mockContext, {
        file: fileContent,
        filename: 'test.pdf',
      });

      expect(mockClient.post).toHaveBeenCalledWith('https://r.jina.ai', expect.any(FormData), {
        headers: { Accept: 'application/json' },
      });
      expect((result as { ok: boolean; screenshotUrl?: string }).ok).toBe(true);
      expect((result as { ok: boolean; screenshotUrl?: string }).screenshotUrl).toBe(
        'https://example.com/screenshot.png'
      );
    });

    it('should include page number when provided', async () => {
      const fileContent = Buffer.from('test file content').toString('base64');
      const mockResponse = {
        data: {
          data: {
            screenshotUrl: 'https://example.com/screenshot.png',
          },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      await JinaReaderConnector.actions.fileToRenderedImage.handler(mockContext, {
        file: fileContent,
        filename: 'test.pdf',
        pageNumber: 2,
      });

      expect(mockClient.post).toHaveBeenCalled();
    });

    it('should include additional options', async () => {
      const fileContent = Buffer.from('test file content').toString('base64');
      const mockResponse = {
        data: {
          data: {
            screenshotUrl: 'https://example.com/screenshot.png',
          },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      await JinaReaderConnector.actions.fileToRenderedImage.handler(mockContext, {
        file: fileContent,
        filename: 'test.pdf',
        options: { customOption: 'value' },
      });

      expect(mockClient.post).toHaveBeenCalled();
    });
  });

  describe('listTools action', () => {
    it('should return list of available tools', async () => {
      const result = await JinaReaderConnector.actions.listTools.handler(mockContext, {});

      expect(result).toEqual({
        tools: [
          expect.objectContaining({
            name: 'browse',
            description: 'Turn any URL to markdown/image for LLM consumption',
          }),
          expect.objectContaining({
            name: 'web-search',
            description: 'Web search to find relevant context for LLMs',
          }),
        ],
      });
      expect((result as { tools: unknown[] }).tools).toHaveLength(2);
    });
  });

  describe('callTool action', () => {
    it('should call browse tool', async () => {
      const mockResponse = {
        data: {
          data: {
            title: 'Test Page',
            content: 'Test Content',
            markdown: 'Test Content',
            metadata: { url: 'https://example.com' },
          },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await JinaReaderConnector.actions.callTool.handler(mockContext, {
        name: 'browse',
        arguments: {
          url: 'https://example.com',
        },
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://r.jina.ai',
        {
          url: 'https://example.com',
          respondWith: 'content',
        },
        {
          headers: { Accept: 'application/json' },
        }
      );
      expect((result as { isError: boolean; content: Array<{ type: string }> }).isError).toBe(
        false
      );
      expect(
        (result as { isError: boolean; content: Array<{ type: string }> }).content
      ).toHaveLength(1);
      expect(
        (result as { isError: boolean; content: Array<{ type: string }> }).content[0].type
      ).toBe('text');
    });

    it('should call web-search tool', async () => {
      const mockResponse = {
        data: 'Search results text',
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await JinaReaderConnector.actions.callTool.handler(mockContext, {
        name: 'web-search',
        arguments: {
          query: 'test query',
        },
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://r.jina.ai',
        {
          q: 'test query',
          respondWith: 'no-content',
        },
        {
          headers: { Accept: 'text/plain' },
        }
      );
      expect((result as { isError: boolean; content: Array<{ type: string }> }).isError).toBe(
        false
      );
      expect(
        (result as { isError: boolean; content: Array<{ type: string }> }).content
      ).toHaveLength(1);
      expect(
        (result as { isError: boolean; content: Array<{ type: string }> }).content[0].type
      ).toBe('text');
    });

    it('should throw error for unknown tool', async () => {
      await expect(
        JinaReaderConnector.actions.callTool.handler(mockContext, {
          name: 'unknown-tool',
          arguments: {},
        })
      ).rejects.toThrow('Unknown tool: unknown-tool');
    });

    it('should handle browse tool error', async () => {
      const mockResponse = {
        data: {
          readableMessage: 'Invalid URL',
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      await expect(
        JinaReaderConnector.actions.callTool.handler(mockContext, {
          name: 'browse',
          arguments: {
            url: 'invalid-url',
          },
        })
      ).rejects.toThrow('Invalid URL');
    });

    it('should handle search tool error when response is not string', async () => {
      const mockResponse = {
        data: {
          readableMessage: 'Invalid query',
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      await expect(
        JinaReaderConnector.actions.callTool.handler(mockContext, {
          name: 'web-search',
          arguments: {
            query: '',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      const mockResponse = {
        status: 200,
        data: 'OK',
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!JinaReaderConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await JinaReaderConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith('https://r.jina.ai');
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Jina Reader API: \nOK',
      });
    });

    it('should return failure when API is not accessible', async () => {
      const error: HttpError = new Error('Network error');
      error.response = { status: 500, data: {} };
      mockClient.get.mockRejectedValue(error);

      if (!JinaReaderConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await JinaReaderConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith('https://r.jina.ai');
      expect(result.ok).toBe(false);
      expect(result.message).toContain('Failed to connect');
    });

    it('should use overrideBrowseUrl from config', async () => {
      const mockResponse = {
        status: 200,
        data: 'OK',
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const contextWithConfig = {
        ...mockContext,
        config: { overrideBrowseUrl: 'https://custom.jina.ai' },
      } as unknown as ActionContext;

      if (!JinaReaderConnector.test) {
        throw new Error('Test handler not defined');
      }
      await JinaReaderConnector.test.handler(contextWithConfig);

      expect(mockClient.get).toHaveBeenCalledWith('https://custom.jina.ai');
    });
  });
});
