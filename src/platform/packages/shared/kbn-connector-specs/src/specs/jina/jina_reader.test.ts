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

    it('should handle errors without code', async () => {
      const error: HttpError = new Error('Network error');
      error.response = { status: 500, data: { message: 'Server error' } };
      mockClient.post.mockRejectedValue(error);

      await expect(
        JinaReaderConnector.actions.browse.handler(mockContext, {
          url: 'https://example.com',
        })
      ).rejects.toThrow('Network error');
    });

    it('should handle errors with code by returning error response', async () => {
      const error: HttpError = new Error('API error');
      error.response = {
        status: 400,
        data: {
          code: 400,
          message: 'Invalid URL provided',
        },
      };
      mockClient.post.mockRejectedValue(error);

      const result = await JinaReaderConnector.actions.browse.handler(mockContext, {
        url: 'https://invalid-url',
      });

      expect((result as { ok: boolean }).ok).toBe(false);
      expect((result as { code?: number }).code).toBe(400);
    });

    it('should handle errors with different numeric codes', async () => {
      const error: HttpError = new Error('API error');
      error.response = {
        status: 404,
        data: {
          code: 404,
          message: 'Resource not found',
        },
      };
      mockClient.post.mockRejectedValue(error);

      const result = await JinaReaderConnector.actions.browse.handler(mockContext, {
        url: 'https://example.com/not-found',
      });

      expect((result as { ok: boolean }).ok).toBe(false);
      expect((result as { code?: number }).code).toBe(404);
    });

    it('should use default return format when not provided', async () => {
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
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://r.jina.ai',
        {
          url: 'https://example.com',
          respondWith: 'content', // default format
        },
        {
          headers: { Accept: 'application/json' },
        }
      );
    });

    it('should test all return format mappings', async () => {
      const formats = [
        { input: 'markdown', expected: 'content' },
        { input: 'fullMarkdown', expected: 'markdown' },
        { input: 'plainText', expected: 'text' },
        { input: '1stScreenScreenshot', expected: 'screenshot' },
        { input: 'fullPageScreenshot', expected: 'pageshot' },
        { input: 'html', expected: 'html' },
      ];

      for (const format of formats) {
        jest.clearAllMocks();
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
          returnFormat: format.input as
            | 'markdown'
            | 'fullMarkdown'
            | 'plainText'
            | '1stScreenScreenshot'
            | 'fullPageScreenshot'
            | 'html',
        });

        expect(mockClient.post).toHaveBeenCalledWith(
          'https://r.jina.ai',
          {
            url: 'https://example.com',
            respondWith: format.expected,
          },
          {
            headers: { Accept: 'application/json' },
          }
        );
      }
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

    it('should handle errors with code by returning error response', async () => {
      const error: HttpError = new Error('API error');
      error.response = {
        status: 400,
        data: {
          code: 400,
          message: 'Invalid search query',
        },
      };
      mockClient.post.mockRejectedValue(error);

      const result = await JinaReaderConnector.actions.search.handler(mockContext, {
        query: 'invalid',
      });

      expect((result as { ok: boolean }).ok).toBe(false);
      expect((result as { code?: number }).code).toBe(400);
    });

    it('should handle errors without code by rejecting', async () => {
      const error: HttpError = new Error('Network error');
      error.response = { status: 500, data: { message: 'Server error' } };
      mockClient.post.mockRejectedValue(error);

      await expect(
        JinaReaderConnector.actions.search.handler(mockContext, {
          query: 'test',
        })
      ).rejects.toThrow('Network error');
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

    it('should handle errors with code by returning error response', async () => {
      const fileContent = Buffer.from('test file content').toString('base64');
      const error: HttpError = new Error('API error');
      error.response = {
        status: 400,
        data: {
          code: 400,
          message: 'Invalid file format',
        },
      };
      mockClient.post.mockRejectedValue(error);

      const result = await JinaReaderConnector.actions.fileToMarkdown.handler(mockContext, {
        file: fileContent,
        filename: 'test.pdf',
      });

      expect((result as { ok: boolean }).ok).toBe(false);
      expect((result as { code?: number }).code).toBe(400);
    });

    it('should handle errors without code by rejecting', async () => {
      const fileContent = Buffer.from('test file content').toString('base64');
      const error: HttpError = new Error('Network error');
      error.response = { status: 500, data: { message: 'Server error' } };
      mockClient.post.mockRejectedValue(error);

      await expect(
        JinaReaderConnector.actions.fileToMarkdown.handler(mockContext, {
          file: fileContent,
          filename: 'test.pdf',
        })
      ).rejects.toThrow('Network error');
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

    it('should not include page number URL when pageNumber is 1', async () => {
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
        pageNumber: 1,
      });

      expect(mockClient.post).toHaveBeenCalled();
    });

    it('should handle errors with code by returning error response', async () => {
      const fileContent = Buffer.from('test file content').toString('base64');
      const error: HttpError = new Error('API error');
      error.response = {
        status: 400,
        data: {
          code: 400,
          message: 'Failed to render document',
        },
      };
      mockClient.post.mockRejectedValue(error);

      const result = await JinaReaderConnector.actions.fileToRenderedImage.handler(mockContext, {
        file: fileContent,
        filename: 'test.pdf',
      });

      expect((result as { ok: boolean }).ok).toBe(false);
      expect((result as { code?: number }).code).toBe(400);
    });

    it('should handle errors without code by rejecting', async () => {
      const fileContent = Buffer.from('test file content').toString('base64');
      const error: HttpError = new Error('Network error');
      error.response = { status: 500, data: { message: 'Server error' } };
      mockClient.post.mockRejectedValue(error);

      await expect(
        JinaReaderConnector.actions.fileToRenderedImage.handler(mockContext, {
          file: fileContent,
          filename: 'test.pdf',
        })
      ).rejects.toThrow('Network error');
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
      expect(result.message).toContain('Network error');
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
