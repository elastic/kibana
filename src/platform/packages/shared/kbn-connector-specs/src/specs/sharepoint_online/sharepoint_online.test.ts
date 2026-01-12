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

/**
 * Typed HTTP error interface for testing error scenarios
 */
interface HttpError extends Error {
  response?: {
    status: number;
    data?: {
      error?: {
        code?: string;
        message?: string;
      };
    };
  };
}

/**
 * Standard SharePoint API response structure
 */
interface SharePointListResponse<T = unknown> {
  value: T[];
  '@odata.nextLink'?: string;
}

/**
 * SharePoint site information
 */
interface SharePointSite {
  id: string;
  displayName?: string;
  name?: string;
  webUrl: string;
}

/**
 * SharePoint page information
 */
interface SharePointPage {
  id: string;
  name: string;
  webUrl: string;
}

/**
 * SharePoint search hit resource
 */
interface SharePointSearchHit {
  hitId: string;
  resource: {
    '@odata.type': string;
    name?: string;
    displayName?: string;
  };
}

/**
 * SharePoint search response structure
 */
interface SharePointSearchResponse {
  value: Array<{
    hitsContainers: Array<{
      hits: SharePointSearchHit[];
      total: number;
      moreResultsAvailable?: boolean;
    }>;
  }>;
}

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

  describe('listAllSites action', () => {
    it('should list all sites', async () => {
      const mockResponse = {
        data: {
          value: [
            { id: 'site-1', displayName: 'Site 1', webUrl: 'https://contoso.sharepoint.com/sites/site1' },
            { id: 'site-2', displayName: 'Site 2', webUrl: 'https://contoso.sharepoint.com/sites/site2' },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await SharepointOnline.actions.listAllSites.handler(
        mockContext,
        {}
      )) as SharePointListResponse<SharePointSite>;

      expect(mockClient.get).toHaveBeenCalledWith('https://graph.microsoft.com/v1.0/sites/getAllSites/');
      expect(mockContext.log.debug).toHaveBeenCalledWith('SharePoint listing all sites');
      expect(result).toEqual(mockResponse.data);
      expect(result.value).toHaveLength(2);
    });

    it('should handle empty site list', async () => {
      const mockResponse = {
        data: {
          value: [],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await SharepointOnline.actions.listAllSites.handler(
        mockContext,
        {}
      )) as SharePointListResponse<SharePointSite>;

      expect(result).toEqual(mockResponse.data);
      expect(result.value).toHaveLength(0);
    });

    it('should work with undefined input', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await SharepointOnline.actions.listAllSites.handler(
        mockContext,
        undefined
      )) as SharePointListResponse<SharePointSite>;

      expect(mockClient.get).toHaveBeenCalledWith('https://graph.microsoft.com/v1.0/sites/getAllSites/');
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      const error: HttpError = new Error('Forbidden');
      error.response = {
        status: 403,
        data: {
          error: {
            code: 'AccessDenied',
            message: 'Access denied to this resource',
          },
        },
      };
      mockClient.get.mockRejectedValue(error);

      await expect(
        SharepointOnline.actions.listAllSites.handler(mockContext, {})
      ).rejects.toThrow('Forbidden');
    });

    it('should handle unauthorized errors', async () => {
      const error: HttpError = new Error('Unauthorized');
      error.response = {
        status: 401,
        data: {
          error: {
            code: 'InvalidAuthenticationToken',
            message: 'Access token is invalid',
          },
        },
      };
      mockClient.get.mockRejectedValue(error);

      await expect(
        SharepointOnline.actions.listAllSites.handler(mockContext, {})
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('listSitePages action', () => {
    it('should list pages for a given site', async () => {
      const mockResponse = {
        data: {
          value: [
            { id: 'page-1', name: 'Home.aspx', webUrl: 'https://contoso.sharepoint.com/sites/site1/SitePages/Home.aspx' },
            { id: 'page-2', name: 'About.aspx', webUrl: 'https://contoso.sharepoint.com/sites/site1/SitePages/About.aspx' },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await SharepointOnline.actions.listSitePages.handler(mockContext, {
        siteId: 'site-123',
      })) as SharePointListResponse<SharePointPage>;

      expect(mockClient.get).toHaveBeenCalledWith('https://graph.microsoft.com/v1.0/sites/site-123/pages/');
      expect(mockContext.log.debug).toHaveBeenCalledWith('Sharepoint listing all pages from siteId site-123');
      expect(result).toEqual(mockResponse.data);
      expect(result.value).toHaveLength(2);
    });

    it('should handle empty pages list', async () => {
      const mockResponse = {
        data: {
          value: [],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await SharepointOnline.actions.listSitePages.handler(mockContext, {
        siteId: 'empty-site',
      })) as SharePointListResponse<SharePointPage>;

      expect(result).toEqual(mockResponse.data);
      expect(result.value).toHaveLength(0);
    });

    it('should handle special characters in siteId', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await SharepointOnline.actions.listSitePages.handler(mockContext, {
        siteId: 'contoso.sharepoint.com,abc-123,def-456',
      })) as SharePointListResponse<SharePointPage>;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com,abc-123,def-456/pages/'
      );
      expect(result.value).toEqual([]);
    });

    it('should handle site not found error', async () => {
      const error: HttpError = new Error('Not Found');
      error.response = {
        status: 404,
        data: {
          error: {
            code: 'itemNotFound',
            message: 'The resource could not be found',
          },
        },
      };
      mockClient.get.mockRejectedValue(error);

      await expect(
        SharepointOnline.actions.listSitePages.handler(mockContext, {
          siteId: 'nonexistent-site',
        })
      ).rejects.toThrow('Not Found');
    });

    it('should handle forbidden access to site', async () => {
      const error: HttpError = new Error('Forbidden');
      error.response = {
        status: 403,
        data: {
          error: {
            code: 'AccessDenied',
            message: 'User does not have access to this site',
          },
        },
      };
      mockClient.get.mockRejectedValue(error);

      await expect(
        SharepointOnline.actions.listSitePages.handler(mockContext, {
          siteId: 'restricted-site',
        })
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('getSite action', () => {
    it('should get site by siteId', async () => {
      const mockResponse = {
        data: {
          id: 'site-123',
          displayName: 'Marketing Site',
          webUrl: 'https://contoso.sharepoint.com/sites/marketing',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await SharepointOnline.actions.getSite.handler(mockContext, {
        siteId: 'site-123',
      })) as SharePointSite;

      expect(mockClient.get).toHaveBeenCalledWith('https://graph.microsoft.com/v1.0/sites/site-123');
      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'Getting site info via https://graph.microsoft.com/v1.0/sites/site-123'
      );
      expect(result).toEqual(mockResponse.data);
      expect(result.id).toBe('site-123');
      expect(result.displayName).toBe('Marketing Site');
    });

    it('should get site by relativeUrl', async () => {
      const mockResponse = {
        data: {
          id: 'contoso.sharepoint.com,abc-123,def-456',
          displayName: 'HR Site',
          webUrl: 'https://contoso.sharepoint.com/sites/hr',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await SharepointOnline.actions.getSite.handler(mockContext, {
        relativeUrl: 'contoso.sharepoint.com:/sites/hr:',
      })) as SharePointSite;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/hr:'
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'Getting site info via https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/hr:'
      );
      expect(result).toEqual(mockResponse.data);
      expect(result.displayName).toBe('HR Site');
    });

    it('should handle root site lookup', async () => {
      const mockResponse = {
        data: {
          id: 'root',
          displayName: 'Contoso',
          webUrl: 'https://contoso.sharepoint.com',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await SharepointOnline.actions.getSite.handler(mockContext, {
        siteId: 'root',
      })) as SharePointSite;

      expect(mockClient.get).toHaveBeenCalledWith('https://graph.microsoft.com/v1.0/sites/root');
      expect(result).toEqual(mockResponse.data);
      expect(result.id).toBe('root');
    });

    it('should handle site not found by siteId', async () => {
      const error: HttpError = new Error('Not Found');
      error.response = {
        status: 404,
        data: {
          error: {
            code: 'itemNotFound',
            message: 'Site not found',
          },
        },
      };
      mockClient.get.mockRejectedValue(error);

      await expect(
        SharepointOnline.actions.getSite.handler(mockContext, {
          siteId: 'nonexistent-site-id',
        })
      ).rejects.toThrow('Not Found');
    });

    it('should handle invalid relativeUrl', async () => {
      const error: HttpError = new Error('Bad Request');
      error.response = {
        status: 400,
        data: {
          error: {
            code: 'invalidRequest',
            message: 'The provided path is not valid',
          },
        },
      };
      mockClient.get.mockRejectedValue(error);

      await expect(
        SharepointOnline.actions.getSite.handler(mockContext, {
          relativeUrl: 'invalid-path',
        })
      ).rejects.toThrow('Bad Request');
    });

    it('should handle access denied to site', async () => {
      const error: HttpError = new Error('Forbidden');
      error.response = {
        status: 403,
        data: {
          error: {
            code: 'AccessDenied',
            message: 'User does not have permission to access this site',
          },
        },
      };
      mockClient.get.mockRejectedValue(error);

      await expect(
        SharepointOnline.actions.getSite.handler(mockContext, {
          siteId: 'private-site',
        })
      ).rejects.toThrow('Forbidden');
    });
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

      const result = (await SharepointOnline.actions.search.handler(mockContext, {
        query: 'test document',
      })) as SharePointSearchResponse;

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
      expect(result.value[0].hitsContainers[0].hits).toHaveLength(1);
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

      const result = (await SharepointOnline.actions.search.handler(mockContext, {
        query: 'project site',
        entityTypes: ['site', 'list'],
      })) as SharePointSearchResponse;

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
      expect(result.value[0].hitsContainers[0].total).toBe(1);
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

      const result = (await SharepointOnline.actions.search.handler(mockContext, {
        query: 'documents',
        from: 10,
        size: 25,
      })) as SharePointSearchResponse;

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
      expect(result.value[0].hitsContainers[0].moreResultsAvailable).toBe(true);
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

      const result = (await SharepointOnline.actions.search.handler(mockContext, {
        query: 'nonexistent',
      })) as SharePointSearchResponse;

      expect(result).toEqual(mockResponse.data);
      expect(result.value[0].hitsContainers[0].total).toBe(0);
    });

    it('should handle search API errors', async () => {
      const error: HttpError = new Error('Bad Request');
      error.response = {
        status: 400,
        data: {
          error: {
            code: 'BadRequest',
            message: 'Invalid search query syntax',
          },
        },
      };
      mockClient.post.mockRejectedValue(error);

      await expect(
        SharepointOnline.actions.search.handler(mockContext, {
          query: 'invalid:query:syntax',
        })
      ).rejects.toThrow('Bad Request');
    });

    it('should handle rate limiting errors', async () => {
      const error: HttpError = new Error('Too Many Requests');
      error.response = {
        status: 429,
        data: {
          error: {
            code: 'TooManyRequests',
            message: 'Rate limit exceeded. Please retry after some time.',
          },
        },
      };
      mockClient.post.mockRejectedValue(error);

      await expect(
        SharepointOnline.actions.search.handler(mockContext, {
          query: 'test',
        })
      ).rejects.toThrow('Too Many Requests');
    });

    it('should handle unauthorized search requests', async () => {
      const error: HttpError = new Error('Unauthorized');
      error.response = {
        status: 401,
        data: {
          error: {
            code: 'InvalidAuthenticationToken',
            message: 'Access token has expired or is not yet valid',
          },
        },
      };
      mockClient.post.mockRejectedValue(error);

      await expect(
        SharepointOnline.actions.search.handler(mockContext, {
          query: 'documents',
        })
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('test handler', () => {
    /**
     * Test result structure
     */
    interface TestResult {
      ok: boolean;
      message?: string;
    }

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
      const result = (await SharepointOnline.test.handler(mockContext)) as TestResult;

      expect(mockClient.get).toHaveBeenCalledWith('https://graph.microsoft.com/v1.0/sites/root');
      expect(result.ok).toBe(true);
      expect(result.message).toBe('Successfully connected to SharePoint Online: Contoso');
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
      const result = (await SharepointOnline.test.handler(mockContext)) as TestResult;

      expect(result.ok).toBe(true);
      expect(result.message).toBe('Successfully connected to SharePoint Online: Unknown');
    });

    it('should return failure when API is not accessible', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid credentials'));

      if (!SharepointOnline.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await SharepointOnline.test.handler(mockContext)) as TestResult;

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Invalid credentials');
    });

    it('should handle network errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Network timeout'));

      if (!SharepointOnline.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await SharepointOnline.test.handler(mockContext)) as TestResult;

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Network timeout');
    });

    it('should handle authentication errors', async () => {
      mockClient.get.mockRejectedValue(new Error('401 Unauthorized'));

      if (!SharepointOnline.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await SharepointOnline.test.handler(mockContext)) as TestResult;

      expect(result.ok).toBe(false);
      expect(result.message).toBe('401 Unauthorized');
    });
  });
});
