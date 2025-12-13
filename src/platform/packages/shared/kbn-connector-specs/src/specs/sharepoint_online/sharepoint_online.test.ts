/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { SharepointOnline } from './sharepoint_online';

describe('SharepointOnline', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: { debug: jest.fn(), error: jest.fn() },
    config: { region: 'NAM' },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('search action', () => {
    it('should search with default entity types', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              hitsContainers: [
                {
                  hits: [
                    {
                      hitId: '1',
                      resource: {
                        '@odata.type': '#microsoft.graph.driveItem',
                        name: 'Document.docx',
                      },
                    },
                  ],
                  total: 1,
                },
              ],
            },
          ],
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await SharepointOnline.actions.search.handler(mockContext, {
        query: 'test document',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/search/query',
        {
          requests: [
            {
              entityTypes: ['driveItem'],
              query: {
                queryString: 'test document',
              },
              region: 'NAM',
            },
          ],
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should search with custom entity types', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              hitsContainers: [
                {
                  hits: [
                    {
                      hitId: '1',
                      resource: {
                        '@odata.type': '#microsoft.graph.site',
                        displayName: 'Test Site',
                      },
                    },
                  ],
                  total: 1,
                },
              ],
            },
          ],
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      await SharepointOnline.actions.search.handler(mockContext, {
        query: 'project site',
        entityTypes: ['site', 'list'],
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/search/query',
        {
          requests: [
            {
              entityTypes: ['site', 'list'],
              query: {
                queryString: 'project site',
              },
              region: 'NAM',
            },
          ],
        }
      );
    });

    it('should include pagination parameters', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              hitsContainers: [
                {
                  hits: [],
                  total: 100,
                  moreResultsAvailable: true,
                },
              ],
            },
          ],
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      await SharepointOnline.actions.search.handler(mockContext, {
        query: 'documents',
        from: 10,
        size: 25,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/search/query',
        {
          requests: [
            {
              entityTypes: ['driveItem'],
              query: {
                queryString: 'documents',
              },
              region: 'NAM',
              from: 10,
              size: 25,
            },
          ],
        }
      );
    });

    it('should handle empty search results', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              hitsContainers: [
                {
                  hits: [],
                  total: 0,
                },
              ],
            },
          ],
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await SharepointOnline.actions.search.handler(mockContext, {
        query: 'nonexistent',
      });

      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      const mockResponse = {
        data: {
          id: 'root',
          displayName: 'Contoso',
          name: 'contoso',
          webUrl: 'https://contoso.sharepoint.com',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!SharepointOnline.test) {
        throw new Error('Test handler not defined');
      }
      const result = await SharepointOnline.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith('https://graph.microsoft.com/v1.0/sites/root');
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to SharePoint Online: Contoso',
      });
    });

    it('should handle site without display name', async () => {
      const mockResponse = {
        data: {
          id: 'root',
          name: 'root',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!SharepointOnline.test) {
        throw new Error('Test handler not defined');
      }
      const result = await SharepointOnline.test.handler(mockContext);

      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to SharePoint Online: Unknown',
      });
    });

    it('should return failure when API is not accessible', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid credentials'));

      if (!SharepointOnline.test) {
        throw new Error('Test handler not defined');
      }
      const result = await SharepointOnline.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Invalid credentials');
    });

    it('should handle network errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Network timeout'));

      if (!SharepointOnline.test) {
        throw new Error('Test handler not defined');
      }
      const result = await SharepointOnline.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Network timeout');
    });

    it('should handle authentication errors', async () => {
      mockClient.get.mockRejectedValue(new Error('401 Unauthorized'));

      if (!SharepointOnline.test) {
        throw new Error('Test handler not defined');
      }
      const result = await SharepointOnline.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toBe('401 Unauthorized');
    });
  });
});
