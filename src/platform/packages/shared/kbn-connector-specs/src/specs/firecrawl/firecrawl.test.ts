/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { Firecrawl } from './firecrawl';

describe('Firecrawl', () => {
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
    expect(Firecrawl).toBeDefined();
  });

  it('should have correct metadata', () => {
    expect(Firecrawl.metadata.id).toBe('.firecrawl');
    expect(Firecrawl.metadata.displayName).toBe('Firecrawl');
    expect(Firecrawl.metadata.description).toBeDefined();
  });

  it('should have a valid schema', () => {
    expect(Firecrawl.schema).toBeDefined();
    expect(Firecrawl.schema.parse({})).toEqual({});
  });

  it('should have a test handler', () => {
    expect(Firecrawl.test).toBeDefined();
    expect(typeof Firecrawl.test?.handler).toBe('function');
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      mockClient.post.mockResolvedValue({ data: { success: true } });

      if (!Firecrawl.test) {
        throw new Error('Test handler not defined');
      }
      const result = await Firecrawl.test.handler(mockContext);

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.firecrawl.dev/v2/scrape',
        { url: 'https://example.com' }
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith('Firecrawl test handler');
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Firecrawl API',
      });
    });

    it('should return failure when API is not accessible', async () => {
      mockClient.post.mockRejectedValue(new Error('Invalid API key'));

      if (!Firecrawl.test) {
        throw new Error('Test handler not defined');
      }
      const result = await Firecrawl.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Failed to connect');
    });
  });
});
