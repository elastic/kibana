/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../../connector_spec';
import { ConfluenceCloudConnector } from './confluence';

describe('ConfluenceCloudConnector', () => {
  const mockClient = {
    get: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: { debug: jest.fn() },
    config: { subdomain: 'mycompany' },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listPages action', () => {
    it('should list pages and return response data', async () => {
      const mockResponse = {
        data: {
          results: [{ id: '123', title: 'Welcome', spaceId: '456' }],
          _links: { base: '/wiki/api/v2' },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await ConfluenceCloudConnector.actions.listPages.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/wiki/api/v2/pages',
        undefined
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should include optional limit, cursor, spaceId, title as params', async () => {
      const mockResponse = { data: { results: [], _links: {} } };
      mockClient.get.mockResolvedValue(mockResponse);

      await ConfluenceCloudConnector.actions.listPages.handler(mockContext, {
        limit: 10,
        cursor: 'abc',
        spaceId: '789',
        title: 'test',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/wiki/api/v2/pages',
        {
          params: {
            limit: 10,
            cursor: 'abc',
            'space-id': ['789'],
            title: 'test',
          },
        }
      );
    });

    it('should build base URL from config subdomain', async () => {
      const mockResponse = { data: { results: [], _links: {} } };
      mockClient.get.mockResolvedValue(mockResponse);

      const contextWithSubdomain = {
        ...mockContext,
        config: { subdomain: 'acme' },
      } as unknown as ActionContext;

      await ConfluenceCloudConnector.actions.listPages.handler(contextWithSubdomain, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://acme.atlassian.net/wiki/api/v2/pages',
        undefined
      );
    });
  });

  describe('getPage action', () => {
    it('should get page by id and return response data', async () => {
      const mockResponse = {
        data: {
          id: '123',
          title: 'My Page',
          spaceId: '456',
          status: 'current',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await ConfluenceCloudConnector.actions.getPage.handler(mockContext, {
        id: '123',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/wiki/api/v2/pages/123',
        undefined
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should include optional bodyFormat as param', async () => {
      const mockResponse = { data: { id: '123', body: {} } };
      mockClient.get.mockResolvedValue(mockResponse);

      await ConfluenceCloudConnector.actions.getPage.handler(mockContext, {
        id: '123',
        bodyFormat: 'storage',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/wiki/api/v2/pages/123',
        { params: { 'body-format': 'storage' } }
      );
    });
  });

  describe('listSpaces action', () => {
    it('should list spaces and return response data', async () => {
      const mockResponse = {
        data: {
          results: [{ id: '456', key: 'DEMO', name: 'Demo Space' }],
          _links: { base: '/wiki/api/v2' },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await ConfluenceCloudConnector.actions.listSpaces.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/wiki/api/v2/spaces',
        undefined
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should include optional limit, cursor, keys as params', async () => {
      const mockResponse = { data: { results: [], _links: {} } };
      mockClient.get.mockResolvedValue(mockResponse);

      await ConfluenceCloudConnector.actions.listSpaces.handler(mockContext, {
        limit: 20,
        cursor: 'xyz',
        keys: 'DEMO',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/wiki/api/v2/spaces',
        {
          params: {
            limit: 20,
            cursor: 'xyz',
            keys: ['DEMO'],
          },
        }
      );
    });
  });

  describe('getSpace action', () => {
    it('should get space by id and return response data', async () => {
      const mockResponse = {
        data: {
          id: '456',
          key: 'DEMO',
          name: 'Demo Space',
          type: 'global',
          status: 'current',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await ConfluenceCloudConnector.actions.getSpace.handler(mockContext, {
        id: '456',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/wiki/api/v2/spaces/456'
      );
      expect(result).toEqual(mockResponse.data);
    });
  });
});
