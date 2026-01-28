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
});
