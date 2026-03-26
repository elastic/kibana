/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../../connector_spec';
import { JiraConnector } from './jira';

describe('JiraConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: { debug: jest.fn() },
    config: { subdomain: 'mycompany' },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchIssuesWithJql action', () => {
    it('should search issues with JQL and return response data', async () => {
      const mockResponse = {
        data: {
          issues: [
            {
              id: '10001',
              key: 'MYPROJ-1',
              fields: { summary: 'Fix login bug', status: { name: 'In Progress' } },
            },
          ],
          total: 1,
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await JiraConnector.actions.searchIssuesWithJql.handler(mockContext, {
        jql: 'project = MYPROJ',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/search/jql',
        { jql: 'project = MYPROJ' }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should build base URL from config subdomain', async () => {
      const mockResponse = { data: { issues: [], total: 0 } };
      mockClient.post.mockResolvedValue(mockResponse);

      const contextWithSubdomain = {
        ...mockContext,
        config: { subdomain: 'acme' },
      } as unknown as ActionContext;

      await JiraConnector.actions.searchIssuesWithJql.handler(contextWithSubdomain, {
        jql: 'assignee = currentUser()',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://acme.atlassian.net/rest/api/3/search/jql',
        { jql: 'assignee = currentUser()' }
      );
    });

    it('should include optional maxResults and nextPageToken in the request', async () => {
      const mockResponse = { data: { issues: [], total: 0 } };
      mockClient.post.mockResolvedValue(mockResponse);

      await JiraConnector.actions.searchIssuesWithJql.handler(mockContext, {
        jql: 'status = Done',
        maxResults: 50,
        nextPageToken: 'page-token-abc',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/search/jql',
        {
          jql: 'status = Done',
          maxResults: 50,
          nextPageToken: 'page-token-abc',
        }
      );
    });
  });

  describe('getIssue action', () => {
    it('should retrieve issue by ID and return response data', async () => {
      const mockResponse = {
        data: {
          id: '10002',
          key: 'MYPROJ-2',
          fields: {
            summary: 'Add login page',
            status: { name: 'To Do' },
            assignee: { displayName: 'Alice' },
          },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await JiraConnector.actions.getIssue.handler(mockContext, {
        issueId: '10002',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/issue/10002'
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getProjects action', () => {
    it('should fetch projects and return response data', async () => {
      const mockResponse = {
        data: {
          values: [
            { id: '10000', key: 'MYPROJ', name: 'My Project' },
            { id: '10001', key: 'OTHER', name: 'Other Project' },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await JiraConnector.actions.getProjects.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/project/search',
        { params: {} }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should include optional maxResults, startAt, and query as params', async () => {
      const mockResponse = { data: { values: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await JiraConnector.actions.getProjects.handler(mockContext, {
        maxResults: 20,
        startAt: 10,
        query: 'MYPROJ',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/project/search',
        {
          params: {
            maxResults: 20,
            startAt: 10,
            query: 'MYPROJ',
          },
        }
      );
    });
  });

  describe('searchUsers action', () => {
    it('should search users by query and return response data', async () => {
      const mockResponse = {
        data: [
          {
            accountId: '5b10a2844c20165700ede21g',
            displayName: 'Mia Krystof',
            emailAddress: 'mia@example.com',
          },
        ],
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await JiraConnector.actions.searchUsers.handler(mockContext, {
        query: 'mia',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/user/search',
        { params: { query: 'mia' } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should build base URL from config subdomain', async () => {
      const mockResponse = { data: [] };
      mockClient.get.mockResolvedValue(mockResponse);

      const contextWithSubdomain = {
        ...mockContext,
        config: { subdomain: 'acme' },
      } as unknown as ActionContext;

      await JiraConnector.actions.searchUsers.handler(contextWithSubdomain, {
        query: 'workplace-search',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://acme.atlassian.net/rest/api/3/user/search',
        { params: { query: 'workplace-search' } }
      );
    });

    it('should include optional startAt and maxResults in the request', async () => {
      const mockResponse = { data: [] };
      mockClient.get.mockResolvedValue(mockResponse);

      await JiraConnector.actions.searchUsers.handler(mockContext, {
        query: 'alice',
        startAt: 10,
        maxResults: 25,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/user/search',
        {
          params: {
            query: 'alice',
            startAt: 10,
            maxResults: 25,
          },
        }
      );
    });
  });
});
