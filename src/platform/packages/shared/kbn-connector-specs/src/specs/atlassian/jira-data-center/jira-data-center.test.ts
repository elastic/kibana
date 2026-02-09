/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../../connector_spec';
import { JiraDataCenter } from './jira-data-center';

describe('JiraDataCenter', () => {
  const mockClient = {
    get: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: { debug: jest.fn() },
    config: { url: 'https://jira.example.com' },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(JiraDataCenter).toBeDefined();
  });

  describe('getProjects action', () => {
    it('should call the correct URL with query and return response data', async () => {
      const mockResponse = { data: [{ id: '10000', key: 'PROJ', name: 'My Project' }] };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await JiraDataCenter.actions.getProjects.handler(mockContext, {
        query: 'PROJ',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://jira.example.com/rest/api/2/project', {
        params: { query: 'PROJ' },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should build base URL from config url', async () => {
      const mockResponse = { data: [] };
      mockClient.get.mockResolvedValue(mockResponse);

      const contextWithUrl = {
        ...mockContext,
        config: { url: 'https://jira.mycompany.com/' },
      } as unknown as ActionContext;

      await JiraDataCenter.actions.getProjects.handler(contextWithUrl, {
        query: 'search',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://jira.mycompany.com/rest/api/2/project',
        { params: { query: 'search' } }
      );
    });

    it('should include optional maxResults in params', async () => {
      const mockResponse = { data: [] };
      mockClient.get.mockResolvedValue(mockResponse);

      await JiraDataCenter.actions.getProjects.handler(mockContext, {
        query: 'MYPROJ',
        maxResults: 50,
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://jira.example.com/rest/api/2/project', {
        params: { maxResults: 50, query: 'MYPROJ' },
      });
    });
  });
});
