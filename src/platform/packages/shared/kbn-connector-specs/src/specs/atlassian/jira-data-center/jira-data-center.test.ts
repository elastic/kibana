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
    post: jest.fn(),
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
    it('should call the correct URL without query when not provided', async () => {
      const mockResponse = { data: [{ id: '10000', key: 'PROJ', name: 'My Project' }] };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await JiraDataCenter.actions.getProjects.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://jira.example.com/rest/api/2/project',
        { params: {} }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should include query in params when provided', async () => {
      const mockResponse = { data: [{ id: '10000', key: 'PROJ', name: 'My Project' }] };
      mockClient.get.mockResolvedValue(mockResponse);

      await JiraDataCenter.actions.getProjects.handler(mockContext, { query: 'PROJ' });

      expect(mockClient.get).toHaveBeenCalledWith('https://jira.example.com/rest/api/2/project', {
        params: { query: 'PROJ' },
      });
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

    it('should include optional maxResults in params when provided', async () => {
      const mockResponse = { data: [] };
      mockClient.get.mockResolvedValue(mockResponse);

      await JiraDataCenter.actions.getProjects.handler(mockContext, { maxResults: 50 });

      expect(mockClient.get).toHaveBeenCalledWith('https://jira.example.com/rest/api/2/project', {
        params: { maxResults: 50 },
      });
    });

    it('should include both query and maxResults when provided', async () => {
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

  describe('getProject action', () => {
    it('should GET project by key and return response data', async () => {
      const mockResponse = {
        data: { id: '10000', key: 'PROJ', name: 'My Project', projectTypeKey: 'software' },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await JiraDataCenter.actions.getProject.handler(mockContext, {
        projectId: 'PROJ',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://jira.example.com/rest/api/2/project/PROJ'
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should GET project by numeric id', async () => {
      const mockResponse = { data: { id: '10000', key: 'PROJ', name: 'My Project' } };
      mockClient.get.mockResolvedValue(mockResponse);

      await JiraDataCenter.actions.getProject.handler(mockContext, { projectId: '10000' });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://jira.example.com/rest/api/2/project/10000'
      );
    });
  });

  describe('getIssue action', () => {
    it('should GET issue by key and return response data', async () => {
      const mockResponse = {
        data: {
          id: '10001',
          key: 'HSP-123',
          fields: { summary: 'Fix login bug', status: { name: 'In Progress' } },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await JiraDataCenter.actions.getIssue.handler(mockContext, {
        issueId: 'HSP-123',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://jira.example.com/rest/api/2/issue/HSP-123'
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should GET issue by numeric id', async () => {
      const mockResponse = { data: { id: '10001', key: 'HSP-1', fields: {} } };
      mockClient.get.mockResolvedValue(mockResponse);

      await JiraDataCenter.actions.getIssue.handler(mockContext, { issueId: '10001' });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://jira.example.com/rest/api/2/issue/10001'
      );
    });
  });

  describe('searchIssuesWithJql action', () => {
    it('should POST to search endpoint with jql and return response data', async () => {
      const mockResponse = {
        data: { issues: [{ id: '10001', key: 'HSP-1', fields: { summary: 'Bug' } }], total: 1 },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await JiraDataCenter.actions.searchIssuesWithJql.handler(mockContext, {
        jql: 'project = HSP',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://jira.example.com/rest/api/2/search',
        { jql: 'project = HSP' }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should include maxResults and startAt in request body when provided', async () => {
      const mockResponse = { data: { issues: [], total: 0 } };
      mockClient.post.mockResolvedValue(mockResponse);

      await JiraDataCenter.actions.searchIssuesWithJql.handler(mockContext, {
        jql: 'status = Done',
        maxResults: 15,
        startAt: 0,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://jira.example.com/rest/api/2/search',
        { jql: 'status = Done', maxResults: 15, startAt: 0 }
      );
    });
  });
});
