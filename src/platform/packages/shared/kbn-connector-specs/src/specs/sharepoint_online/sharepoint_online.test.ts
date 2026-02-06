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
  title?: string;
  webUrl: string;
}

/**
 * SharePoint drive information
 */
interface SharePointDrive {
  id: string;
  name: string;
  driveType: string;
  webUrl: string;
}

/**
 * SharePoint list information
 */
interface SharePointList {
  id: string;
  name: string;
  displayName: string;
  webUrl: string;
}

/**
 * SharePoint list item information
 */
interface SharePointListItem {
  id: string;
  webUrl: string;
}

/**
 * SharePoint search response structure
 */
interface SharePointSearchResponse {
  value: Array<{
    hitsContainers: Array<{
      hits: Array<{
        hitId: string;
        resource: {
          '@odata.type': string;
          name?: string;
          displayName?: string;
        };
      }>;
      total: number;
      moreResultsAvailable?: boolean;
    }>;
  }>;
}

/**
 * Test result structure
 */
interface TestResult {
  ok: boolean;
  message?: string;
}

describe('SharepointOnline', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    request: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: { debug: jest.fn(), error: jest.fn() },
    config: { region: 'NAM' },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllSites action', () => {
    it('should list all sites', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              id: 'site-1',
              displayName: 'Site 1',
              webUrl: 'https://contoso.sharepoint.com/sites/site1',
            },
            {
              id: 'site-2',
              displayName: 'Site 2',
              webUrl: 'https://contoso.sharepoint.com/sites/site2',
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await SharepointOnline.actions.getAllSites.handler(
        mockContext,
        {}
      )) as SharePointListResponse<SharePointSite>;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/sites/getAllSites/',
        {
          params: {
            $select: 'id,displayName,webUrl,siteCollection',
          },
        }
      );
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

      const result = (await SharepointOnline.actions.getAllSites.handler(
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

      const result = (await SharepointOnline.actions.getAllSites.handler(
        mockContext,
        undefined
      )) as SharePointListResponse<SharePointSite>;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/sites/getAllSites/',
        {
          params: {
            $select: 'id,displayName,webUrl,siteCollection',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Access denied'));

      await expect(SharepointOnline.actions.getAllSites.handler(mockContext, {})).rejects.toThrow(
        'Access denied'
      );
    });
  });

  describe('getSitePages action', () => {
    it('should list pages for a given site', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              id: 'page-1',
              title: 'Home',
              webUrl: 'https://contoso.sharepoint.com/sites/site1/SitePages/Home.aspx',
            },
            {
              id: 'page-2',
              title: 'About',
              webUrl: 'https://contoso.sharepoint.com/sites/site1/SitePages/About.aspx',
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await SharepointOnline.actions.getSitePages.handler(mockContext, {
        siteId: 'site-123',
      })) as SharePointListResponse<SharePointPage>;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/sites/site-123/pages/',
        {
          params: {
            $select: 'id,title,description,webUrl,createdDateTime,lastModifiedDateTime',
          },
        }
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'SharePoint listing all pages from siteId site-123'
      );
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

      const result = (await SharepointOnline.actions.getSitePages.handler(mockContext, {
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

      const result = (await SharepointOnline.actions.getSitePages.handler(mockContext, {
        siteId: 'contoso.sharepoint.com,abc-123,def-456',
      })) as SharePointListResponse<SharePointPage>;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com,abc-123,def-456/pages/',
        {
          params: {
            $select: 'id,title,description,webUrl,createdDateTime,lastModifiedDateTime',
          },
        }
      );
      expect(result.value).toEqual([]);
    });

    it('should propagate site not found errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Site not found'));

      await expect(
        SharepointOnline.actions.getSitePages.handler(mockContext, {
          siteId: 'nonexistent-site',
        })
      ).rejects.toThrow('Site not found');
    });
  });

  describe('getSitePageContents action', () => {
    it('should get page contents with canvas layout', async () => {
      const mockResponse = {
        data: {
          id: 'page-123',
          title: 'Home',
          canvasLayout: {
            horizontalSections: [],
          },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await SharepointOnline.actions.getSitePageContents.handler(mockContext, {
        siteId: 'site-123',
        pageId: 'page-123',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/sites/site-123/pages/page-123/microsoft.graph.sitePage',
        {
          params: {
            $expand: 'canvasLayout',
            $select:
              'id,title,description,webUrl,createdDateTime,lastModifiedDateTime,canvasLayout',
          },
        }
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'SharePoint getting page contents from https://graph.microsoft.com/v1.0/sites/site-123/pages/page-123/microsoft.graph.sitePage'
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Page not found'));

      await expect(
        SharepointOnline.actions.getSitePageContents.handler(mockContext, {
          siteId: 'site-123',
          pageId: 'missing-page',
        })
      ).rejects.toThrow('Page not found');
    });
  });

  describe('getSiteDrives action', () => {
    it('should list all drives for a given site', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              id: 'drive-1',
              name: 'Documents',
              driveType: 'documentLibrary',
              webUrl: 'https://contoso.sharepoint.com/sites/site1/Documents',
            },
            {
              id: 'drive-2',
              name: 'Shared Documents',
              driveType: 'documentLibrary',
              webUrl: 'https://contoso.sharepoint.com/sites/site1/Shared%20Documents',
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await SharepointOnline.actions.getSiteDrives.handler(mockContext, {
        siteId: 'site-123',
      })) as SharePointListResponse<SharePointDrive>;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/sites/site-123/drives/',
        {
          params: {
            $select:
              'id,name,driveType,webUrl,createdDateTime,lastModifiedDateTime,description,owner',
          },
        }
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'SharePoint getting all drives of site site-123'
      );
      expect(result).toEqual(mockResponse.data);
      expect(result.value).toHaveLength(2);
    });

    it('should handle empty drives list', async () => {
      const mockResponse = {
        data: {
          value: [],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await SharepointOnline.actions.getSiteDrives.handler(mockContext, {
        siteId: 'empty-site',
      })) as SharePointListResponse<SharePointDrive>;

      expect(result).toEqual(mockResponse.data);
      expect(result.value).toHaveLength(0);
    });

    it('should handle special characters in siteId', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await SharepointOnline.actions.getSiteDrives.handler(mockContext, {
        siteId: 'contoso.sharepoint.com,abc-123,def-456',
      })) as SharePointListResponse<SharePointDrive>;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com,abc-123,def-456/drives/',
        {
          params: {
            $select:
              'id,name,driveType,webUrl,createdDateTime,lastModifiedDateTime,description,owner',
          },
        }
      );
      expect(result.value).toEqual([]);
    });

    it('should propagate site not found errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Site not found'));

      await expect(
        SharepointOnline.actions.getSiteDrives.handler(mockContext, {
          siteId: 'nonexistent-site',
        })
      ).rejects.toThrow('Site not found');
    });
  });

  describe('getSiteLists action', () => {
    it('should list all lists for a given site', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              id: 'list-1',
              name: 'Tasks',
              displayName: 'Tasks',
              webUrl: 'https://contoso.sharepoint.com/sites/site1/Lists/Tasks',
            },
            {
              id: 'list-2',
              name: 'Announcements',
              displayName: 'Announcements',
              webUrl: 'https://contoso.sharepoint.com/sites/site1/Lists/Announcements',
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await SharepointOnline.actions.getSiteLists.handler(mockContext, {
        siteId: 'site-123',
      })) as SharePointListResponse<SharePointList>;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/sites/site-123/lists/',
        {
          params: {
            $select: 'id,displayName,name,webUrl,description,createdDateTime,lastModifiedDateTime',
          },
        }
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'SharePoint getting all lists of site site-123'
      );
      expect(result).toEqual(mockResponse.data);
      expect(result.value).toHaveLength(2);
    });

    it('should handle empty lists', async () => {
      const mockResponse = {
        data: {
          value: [],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await SharepointOnline.actions.getSiteLists.handler(mockContext, {
        siteId: 'empty-site',
      })) as SharePointListResponse<SharePointList>;

      expect(result).toEqual(mockResponse.data);
      expect(result.value).toHaveLength(0);
    });

    it('should handle special characters in siteId', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await SharepointOnline.actions.getSiteLists.handler(mockContext, {
        siteId: 'contoso.sharepoint.com,abc-123,def-456',
      })) as SharePointListResponse<SharePointList>;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com,abc-123,def-456/lists/',
        {
          params: {
            $select: 'id,displayName,name,webUrl,description,createdDateTime,lastModifiedDateTime',
          },
        }
      );
      expect(result.value).toEqual([]);
    });

    it('should propagate site not found errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Site not found'));

      await expect(
        SharepointOnline.actions.getSiteLists.handler(mockContext, {
          siteId: 'nonexistent-site',
        })
      ).rejects.toThrow('Site not found');
    });

    it('should reject pagination params for getSiteLists', () => {
      expect(() =>
        SharepointOnline.actions.getSiteLists.input.parse({
          siteId: 'site-123',
          top: 100,
        })
      ).toThrow();
    });
  });

  describe('getSiteListItems action', () => {
    it('should list all items for a given list', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              id: 'item-1',
              webUrl: 'https://contoso.sharepoint.com/sites/site1/Lists/Tasks/1_.000',
            },
            {
              id: 'item-2',
              webUrl: 'https://contoso.sharepoint.com/sites/site1/Lists/Tasks/2_.000',
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await SharepointOnline.actions.getSiteListItems.handler(mockContext, {
        siteId: 'site-123',
        listId: 'list-456',
      })) as SharePointListResponse<SharePointListItem>;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/sites/site-123/lists/list-456/items/',
        {
          params: {
            $select: 'id,webUrl,createdDateTime,lastModifiedDateTime,createdBy,lastModifiedBy',
          },
        }
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'SharePoint getting all items of list list-456 of site site-123'
      );
      expect(result).toEqual(mockResponse.data);
      expect(result.value).toHaveLength(2);
    });

    it('should handle empty items list', async () => {
      const mockResponse = {
        data: {
          value: [],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await SharepointOnline.actions.getSiteListItems.handler(mockContext, {
        siteId: 'site-123',
        listId: 'empty-list',
      })) as SharePointListResponse<SharePointListItem>;

      expect(result).toEqual(mockResponse.data);
      expect(result.value).toHaveLength(0);
    });

    it('should handle special characters in siteId and listId', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await SharepointOnline.actions.getSiteListItems.handler(mockContext, {
        siteId: 'contoso.sharepoint.com,abc-123,def-456',
        listId: 'b!xyz-789',
      })) as SharePointListResponse<SharePointListItem>;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com,abc-123,def-456/lists/b!xyz-789/items/',
        {
          params: {
            $select: 'id,webUrl,createdDateTime,lastModifiedDateTime,createdBy,lastModifiedBy',
          },
        }
      );
      expect(result.value).toEqual([]);
    });

    it('should propagate list not found errors', async () => {
      mockClient.get.mockRejectedValue(new Error('List not found'));

      await expect(
        SharepointOnline.actions.getSiteListItems.handler(mockContext, {
          siteId: 'site-123',
          listId: 'nonexistent-list',
        })
      ).rejects.toThrow('List not found');
    });

    it('should propagate site not found errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Site not found'));

      await expect(
        SharepointOnline.actions.getSiteListItems.handler(mockContext, {
          siteId: 'nonexistent-site',
          listId: 'list-123',
        })
      ).rejects.toThrow('Site not found');
    });
  });

  describe('getDriveItems action', () => {
    it('should list drive root children by driveId', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              id: 'item-1',
              name: 'Document.docx',
              webUrl: 'https://contoso.sharepoint.com/sites/site1/Document.docx',
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await SharepointOnline.actions.getDriveItems.handler(mockContext, {
        driveId: 'drive-123',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/drives/drive-123/root/children',
        {
          params: {
            select:
              'id,name,webUrl,createdDateTime,lastModifiedDateTime,size,@microsoft.graph.downloadUrl',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should list drive children by path', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await SharepointOnline.actions.getDriveItems.handler(mockContext, {
        driveId: 'drive-123',
        path: 'Folder/Subfolder',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/drives/drive-123/root:/Folder/Subfolder:/children',
        {
          params: {
            select:
              'id,name,webUrl,createdDateTime,lastModifiedDateTime,size,@microsoft.graph.downloadUrl',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('downloadDriveItem action', () => {
    it('should download drive item content as text', async () => {
      const mockResponse = {
        data: Uint8Array.from([72, 101, 108, 108, 111]),
        headers: {
          'content-type': 'text/plain',
          'content-length': '5',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await SharepointOnline.actions.downloadDriveItem.handler(mockContext, {
        driveId: 'drive-123',
        itemId: 'item-456',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/drives/drive-123/items/item-456/content',
        { responseType: 'arraybuffer' }
      );
      expect(result).toEqual({
        contentType: 'text/plain',
        contentLength: '5',
        text: 'Hello',
      });
    });
  });

  describe('downloadItemFromURL action', () => {
    it('should download content as base64', async () => {
      const mockResponse = {
        data: Uint8Array.from([72, 101, 108, 108, 111]),
        headers: {
          'content-type': 'text/plain',
          'content-length': '5',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await SharepointOnline.actions.downloadItemFromURL.handler(mockContext, {
        downloadUrl: 'https://download.example.com/file',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://download.example.com/file', {
        responseType: 'arraybuffer',
      });
      expect(result).toEqual({
        contentType: 'text/plain',
        contentLength: '5',
        base64: 'SGVsbG8=',
      });
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

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/sites/site-123',
        {
          params: {
            $select: 'id,displayName,webUrl,siteCollection,createdDateTime,lastModifiedDateTime',
          },
        }
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'SharePoint getting site info via https://graph.microsoft.com/v1.0/sites/site-123'
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
        'https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/hr:',
        {
          params: {
            $select: 'id,displayName,webUrl,siteCollection,createdDateTime,lastModifiedDateTime',
          },
        }
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'SharePoint getting site info via https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/hr:'
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

      expect(mockClient.get).toHaveBeenCalledWith('https://graph.microsoft.com/v1.0/sites/root', {
        params: {
          $select: 'id,displayName,webUrl,siteCollection,createdDateTime,lastModifiedDateTime',
        },
      });
      expect(result).toEqual(mockResponse.data);
      expect(result.id).toBe('root');
    });

    it('should propagate site not found errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Site not found'));

      await expect(
        SharepointOnline.actions.getSite.handler(mockContext, {
          siteId: 'nonexistent-site-id',
        })
      ).rejects.toThrow('Site not found');
    });

    it('should propagate invalid URL errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid request'));

      await expect(
        SharepointOnline.actions.getSite.handler(mockContext, {
          relativeUrl: 'invalid-path',
        })
      ).rejects.toThrow('Invalid request');
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
              entityTypes: ['site'],
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
              entityTypes: ['site'],
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

    it('should propagate search API errors', async () => {
      mockClient.post.mockRejectedValue(new Error('Invalid search query'));

      await expect(
        SharepointOnline.actions.search.handler(mockContext, {
          query: 'test',
        })
      ).rejects.toThrow('Invalid search query');
    });
  });

  describe('callGraphAPI action', () => {
    it('should call a GET endpoint with query params', async () => {
      const mockResponse = {
        data: { id: 'user-1', displayName: 'User 1' },
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
      };
      mockClient.request.mockResolvedValue(mockResponse);

      const result = (await SharepointOnline.actions.callGraphAPI.handler(mockContext, {
        method: 'GET',
        path: '/v1.0/users',
        query: { $top: 5, $select: 'id,displayName' },
      })) as {
        status: number;
        statusText: string;
        headers: Record<string, string>;
        data: Record<string, unknown>;
      };

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'https://graph.microsoft.com/v1.0/users',
          params: { $top: 5, $select: 'id,displayName' },
          data: undefined,
        })
      );
      expect(result).toEqual({
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: mockResponse.data,
      });
    });

    it('should call a POST endpoint with a body', async () => {
      const mockResponse = {
        data: { id: 'created-item' },
        status: 201,
        statusText: 'Created',
        headers: { 'content-type': 'application/json' },
      };
      mockClient.request.mockResolvedValue(mockResponse);

      const body = { name: 'New Item' };
      const result = (await SharepointOnline.actions.callGraphAPI.handler(mockContext, {
        method: 'POST',
        path: '/v1.0/sites',
        body,
      })) as {
        status: number;
        statusText: string;
        headers: Record<string, string>;
        data: Record<string, unknown>;
      };

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'https://graph.microsoft.com/v1.0/sites',
          params: undefined,
          data: body,
        })
      );
      expect(result).toEqual({
        status: 201,
        statusText: 'Created',
        headers: { 'content-type': 'application/json' },
        data: mockResponse.data,
      });
    });

    it('should propagate API errors', async () => {
      mockClient.request.mockRejectedValue(new Error('Graph error'));

      await expect(
        SharepointOnline.actions.callGraphAPI.handler(mockContext, {
          method: 'GET',
          path: '/v1.0/me',
        })
      ).rejects.toThrow('Graph error');
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
      const result = (await SharepointOnline.test.handler(mockContext)) as TestResult;

      expect(mockClient.get).toHaveBeenCalledWith('https://graph.microsoft.com/v1.0/');
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
  });
});
