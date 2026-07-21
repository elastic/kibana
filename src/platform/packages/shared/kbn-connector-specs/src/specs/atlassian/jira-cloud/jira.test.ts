/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../../connector_spec';
import { getConnectorSpec } from '../../../..';
import { JiraConnector } from './jira';

const mockCallTool = jest.fn();
const mockListTools = jest.fn();

jest.mock('../../../lib/mcp/with_mcp_client', () => ({
  withMcpClient: jest.fn(async (_ctx: unknown, fn: (mcp: unknown) => Promise<unknown>) => {
    return fn({ callTool: mockCallTool, listTools: mockListTools });
  }),
}));

describe('JiraConnector', () => {
  const mockContext = {
    client: {},
    log: { debug: jest.fn() },
    config: { serverUrl: 'https://mcp.atlassian.com/v1/sse' },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallTool.mockResolvedValue({
      content: [{ type: 'text', text: '{}' }],
    });
    mockListTools.mockResolvedValue({
      tools: [{ name: 'get_issue' }, { name: 'search_issues_using_jql' }],
    });
  });

  describe('auth', () => {
    it('supports only oauth_authorization_code', () => {
      expect(JiraConnector.auth?.types).toHaveLength(1);
      expect(JiraConnector.auth?.types[0]).toMatchObject({ type: 'oauth_authorization_code' });
    });

    it('uses Atlassian OAuth endpoints', () => {
      expect(JiraConnector.auth?.types[0]).toMatchObject({
        defaults: {
          authorizationUrl: 'https://auth.atlassian.com/authorize',
          tokenUrl: 'https://auth.atlassian.com/oauth/token',
        },
      });
    });
  });

  describe('schema', () => {
    it('has a serverUrl field defaulting to the Atlassian MCP server', () => {
      if (!JiraConnector.schema) throw new Error('schema not defined');
      const parsed = JiraConnector.schema.parse({});
      expect((parsed as { serverUrl?: string }).serverUrl).toBe('https://mcp.atlassian.com/v1/sse');
    });
  });

  it('is discoverable via getConnectorSpec', () => {
    const spec = getConnectorSpec('.jira-cloud');
    expect(spec).toBe(JiraConnector);
  });

  describe('searchIssuesWithJql action', () => {
    it('is exposed as a tool', () => {
      expect(JiraConnector.actions.searchIssuesWithJql.isTool).toBe(true);
    });

    it('calls search_issues_using_jql with jql, max_results, and next_page_token', async () => {
      await JiraConnector.actions.searchIssuesWithJql.handler(mockContext, {
        jql: 'project = PROJ AND status = "In Progress"',
        maxResults: 10,
        nextPageToken: 'tok123',
      });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'search_issues_using_jql',
        arguments: {
          jql: 'project = PROJ AND status = "In Progress"',
          max_results: 10,
          next_page_token: 'tok123',
        },
      });
    });
  });

  describe('getIssue action', () => {
    it('is exposed as a tool', () => {
      expect(JiraConnector.actions.getIssue.isTool).toBe(true);
    });

    it('calls get_issue with issue_key mapped from issueId', async () => {
      await JiraConnector.actions.getIssue.handler(mockContext, { issueId: 'PROJ-123' });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'get_issue',
        arguments: { issue_key: 'PROJ-123' },
      });
    });
  });

  describe('getProjects action', () => {
    it('is exposed as a tool', () => {
      expect(JiraConnector.actions.getProjects.isTool).toBe(true);
    });

    it('calls list_projects with query, max_results, and start_at', async () => {
      await JiraConnector.actions.getProjects.handler(mockContext, {
        query: 'platform',
        maxResults: 20,
        startAt: 0,
      });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_projects',
        arguments: { query: 'platform', max_results: 20, start_at: 0 },
      });
    });
  });

  describe('getProject action', () => {
    it('is exposed as a tool', () => {
      expect(JiraConnector.actions.getProject.isTool).toBe(true);
    });

    it('calls get_project with project_key mapped from projectId', async () => {
      await JiraConnector.actions.getProject.handler(mockContext, { projectId: 'PROJ' });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'get_project',
        arguments: { project_key: 'PROJ' },
      });
    });
  });

  describe('searchUsers action', () => {
    it('is exposed as a tool', () => {
      expect(JiraConnector.actions.searchUsers.isTool).toBe(true);
    });

    it('calls search_users with mapped parameters', async () => {
      await JiraConnector.actions.searchUsers.handler(mockContext, {
        query: 'alice',
        accountId: 'acc123',
        username: 'alice',
        maxResults: 10,
        startAt: 0,
      });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'search_users',
        arguments: {
          query: 'alice',
          account_id: 'acc123',
          username: 'alice',
          max_results: 10,
          start_at: 0,
        },
      });
    });
  });

  describe('test handler', () => {
    it('returns ok with tool count on successful connection', async () => {
      if (!JiraConnector.test) throw new Error('test handler not defined');
      const result = await JiraConnector.test.handler(mockContext);

      expect(mockListTools).toHaveBeenCalled();
      expect(result).toEqual({
        ok: true,
        message: 'Connected to Jira Cloud MCP server. 2 tools available.',
      });
    });
  });
});
