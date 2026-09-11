/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../../connector_spec';
import { toAdf } from './adf';
import { JiraConnector } from './jira';
import { CreateIssueInputSchema } from './types';

describe('JiraConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: { debug: jest.fn() },
    config: { subdomain: 'mycompany' },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('auth', () => {
    it('supports basic auth', () => {
      const types = (JiraConnector.auth?.types as Array<string | { type: string }>).map((t) =>
        typeof t === 'string' ? t : t.type
      );
      expect(types).toContain('basic');
    });

    it('supports oauth_authorization_code with correct Atlassian defaults', () => {
      const oauthType = (
        JiraConnector.auth?.types as Array<
          string | { type: string; defaults?: Record<string, unknown> }
        >
      ).find((t) => typeof t === 'object' && t.type === 'oauth_authorization_code');
      expect(oauthType).toBeDefined();
      expect(oauthType).toMatchObject({
        type: 'oauth_authorization_code',
        defaults: {
          authorizationUrl: 'https://auth.atlassian.com/authorize',
          tokenUrl: 'https://auth.atlassian.com/oauth/token',
          scope: 'read:jira-work read:jira-user write:jira-work offline_access',
        },
      });
    });
  });

  describe('buildBaseUrl', () => {
    it.each([
      ['config is undefined', undefined],
      ['subdomain is missing', {}],
    ])('should throw a clear error when %s', async (_, config) => {
      const ctx = { ...mockContext, config } as unknown as ActionContext;
      await expect(
        JiraConnector.actions.searchIssuesWithJql.handler(ctx, { jql: 'project = X' })
      ).rejects.toThrow('Jira Cloud subdomain is required');
    });
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

    it('should use api.atlassian.com base URL when using OAuth with cloud ID', async () => {
      const oauthContext = {
        ...mockContext,
        config: {
          subdomain: 'mycompany',
          cloudId: '11223344-a1b2-3c33-d444-ef1234567890',
        },
        secrets: { authType: 'oauth_authorization_code' },
      } as unknown as ActionContext;

      const mockResponse = { data: { issues: [], total: 0 } };
      mockClient.post.mockResolvedValue(mockResponse);

      await JiraConnector.actions.searchIssuesWithJql.handler(oauthContext, { jql: 'project = X' });

      expect(mockClient.get).not.toHaveBeenCalled();
      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.atlassian.com/ex/jira/11223344-a1b2-3c33-d444-ef1234567890/rest/api/3/search/jql',
        { jql: 'project = X' }
      );
    });

    it('should throw when OAuth is used without cloud ID', async () => {
      const oauthContext = {
        ...mockContext,
        secrets: { authType: 'oauth_authorization_code' },
      } as unknown as ActionContext;

      await expect(
        JiraConnector.actions.searchIssuesWithJql.handler(oauthContext, { jql: 'project = X' })
      ).rejects.toThrow(
        'Jira Cloud ID is required in connector configuration when using OAuth authentication.'
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

  describe('getProject action', () => {
    it('should fetch a single project by key and return response data', async () => {
      const mockResponse = {
        data: { id: '10000', key: 'MYPROJ', name: 'My Project', projectTypeKey: 'software' },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await JiraConnector.actions.getProject.handler(mockContext, {
        projectId: 'MYPROJ',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/project/MYPROJ'
      );
      expect(result).toEqual(mockResponse.data);
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

  // ===========================================================================
  // toAdf helper
  // ===========================================================================

  describe('toAdf helper', () => {
    it('wraps a single line in a paragraph node', () => {
      expect(toAdf('hello world')).toEqual({
        version: 1,
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello world' }] }],
      });
    });

    it('splits on newlines into separate paragraphs', () => {
      const result = toAdf('line one\nline two');
      expect(result.content).toHaveLength(2);
      expect(result.content[0]).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: 'line one' }],
      });
      expect(result.content[1]).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: 'line two' }],
      });
    });

    it('emits empty content array for blank lines — not an empty text node (Jira rejects those)', () => {
      const result = toAdf('first\n\nsecond');
      expect(result.content[1]).toEqual({ type: 'paragraph', content: [] });
    });
  });

  // ===========================================================================
  // Must-have write actions
  // ===========================================================================

  describe('createIssue action', () => {
    it('posts required fields and returns response data', async () => {
      const mockResponse = { data: { id: '10042', key: 'PROJ-42', self: 'https://...' } };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await JiraConnector.actions.createIssue.handler(mockContext, {
        projectKey: 'PROJ',
        summary: 'Fix login bug',
        issueType: 'Bug',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/issue',
        {
          fields: {
            project: { key: 'PROJ' },
            summary: 'Fix login bug',
            issuetype: { name: 'Bug' },
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('wraps description in ADF', async () => {
      mockClient.post.mockResolvedValue({ data: { id: '10042', key: 'PROJ-42' } });

      await JiraConnector.actions.createIssue.handler(mockContext, {
        projectKey: 'PROJ',
        summary: 'Bug',
        issueType: 'Bug',
        description: 'Steps to reproduce:\nOpen the app',
      });

      const body = mockClient.post.mock.calls[0][1] as { fields: Record<string, unknown> };
      expect(body.fields.description).toEqual(toAdf('Steps to reproduce:\nOpen the app'));
    });

    it('uses { id } for a numeric issueType and { name } for a string issueType', async () => {
      mockClient.post.mockResolvedValue({ data: { id: '10042', key: 'PROJ-42' } });

      await JiraConnector.actions.createIssue.handler(mockContext, {
        projectKey: 'PROJ',
        summary: 'Bug',
        issueType: '10001',
      });
      expect(
        (mockClient.post.mock.calls[0][1] as { fields: Record<string, unknown> }).fields.issuetype
      ).toEqual({ id: '10001' });

      mockClient.post.mockClear();
      mockClient.post.mockResolvedValue({ data: { id: '10043', key: 'PROJ-43' } });

      await JiraConnector.actions.createIssue.handler(mockContext, {
        projectKey: 'PROJ',
        summary: 'Task',
        issueType: 'Bug',
      });
      expect(
        (mockClient.post.mock.calls[0][1] as { fields: Record<string, unknown> }).fields.issuetype
      ).toEqual({ name: 'Bug' });
    });

    it('always includes issuetype and omits other optional fields when not provided', async () => {
      mockClient.post.mockResolvedValue({ data: { id: '10042', key: 'PROJ-42' } });

      await JiraConnector.actions.createIssue.handler(mockContext, {
        projectKey: 'PROJ',
        summary: 'Minimal issue',
        issueType: 'Task',
      });

      const { fields } = mockClient.post.mock.calls[0][1] as { fields: Record<string, unknown> };
      expect(fields).toHaveProperty('issuetype', { name: 'Task' });
      expect(fields).not.toHaveProperty('description');
      expect(fields).not.toHaveProperty('priority');
      expect(fields).not.toHaveProperty('labels');
      expect(fields).not.toHaveProperty('assignee');
      expect(fields).not.toHaveProperty('parent');
    });

    it('rejects input when issueType is omitted', () => {
      const result = CreateIssueInputSchema.safeParse({
        projectKey: 'PROJ',
        summary: 'Missing issue type',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateIssue action', () => {
    it('puts updated fields and returns { updated: true, issueId }', async () => {
      mockClient.put.mockResolvedValue({ status: 204, data: '' });

      const result = await JiraConnector.actions.updateIssue.handler(mockContext, {
        issueId: 'PROJ-42',
        summary: 'Updated summary',
        priority: 'High',
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/issue/PROJ-42',
        { fields: { summary: 'Updated summary', priority: { name: 'High' } } }
      );
      expect(result).toEqual({ updated: true, issueId: 'PROJ-42' });
    });

    it('wraps description in ADF', async () => {
      mockClient.put.mockResolvedValue({ status: 204, data: '' });

      await JiraConnector.actions.updateIssue.handler(mockContext, {
        issueId: 'PROJ-42',
        description: 'New description',
      });

      const { fields } = mockClient.put.mock.calls[0][1] as { fields: Record<string, unknown> };
      expect(fields.description).toEqual(toAdf('New description'));
    });

    it('sends null assignee to unassign', async () => {
      mockClient.put.mockResolvedValue({ status: 204, data: '' });

      await JiraConnector.actions.updateIssue.handler(mockContext, {
        issueId: 'PROJ-42',
        assigneeAccountId: null,
      });

      const { fields } = mockClient.put.mock.calls[0][1] as { fields: Record<string, unknown> };
      expect(fields.assignee).toBeNull();
    });
  });

  describe('addComment action', () => {
    it('posts ADF comment body and returns response data', async () => {
      const mockResponse = { data: { id: '10001', created: '2024-01-01T00:00:00.000Z' } };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await JiraConnector.actions.addComment.handler(mockContext, {
        issueId: 'PROJ-42',
        body: 'This is a comment',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/issue/PROJ-42/comment',
        { body: toAdf('This is a comment') }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('transitionIssue action', () => {
    it('posts transition id and returns synthesized result', async () => {
      mockClient.post.mockResolvedValue({ status: 204, data: '' });

      const result = await JiraConnector.actions.transitionIssue.handler(mockContext, {
        issueId: 'PROJ-42',
        transitionId: '31',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/issue/PROJ-42/transitions',
        { transition: { id: '31' } }
      );
      expect(result).toEqual({ transitioned: true, issueId: 'PROJ-42', transitionId: '31' });
    });
  });

  // ===========================================================================
  // Should-have actions
  // ===========================================================================

  describe('getTransitions action', () => {
    it('fetches available transitions for an issue', async () => {
      const mockResponse = {
        data: {
          transitions: [
            { id: '11', name: 'To Do', to: { name: 'To Do' } },
            { id: '21', name: 'In Progress', to: { name: 'In Progress' } },
            { id: '31', name: 'Done', to: { name: 'Done' } },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await JiraConnector.actions.getTransitions.handler(mockContext, {
        issueId: 'PROJ-42',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/issue/PROJ-42/transitions'
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getIssueTypes action', () => {
    it('fetches issue types for a project', async () => {
      const mockResponse = {
        data: {
          issueTypes: [
            { id: '10001', name: 'Bug' },
            { id: '10002', name: 'Task' },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await JiraConnector.actions.getIssueTypes.handler(mockContext, {
        projectKey: 'PROJ',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/issue/createmeta/PROJ/issuetypes'
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getCreateMetadata action', () => {
    it('fetches field metadata for a project + issue type', async () => {
      const mockResponse = { data: { fields: [{ fieldId: 'summary', required: true }] } };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await JiraConnector.actions.getCreateMetadata.handler(mockContext, {
        projectKey: 'PROJ',
        issueTypeId: '10001',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/issue/createmeta/PROJ/issuetypes/10001'
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('assignIssue action', () => {
    it('puts accountId and returns { assigned: true }', async () => {
      mockClient.put.mockResolvedValue({ status: 204, data: '' });

      const result = await JiraConnector.actions.assignIssue.handler(mockContext, {
        issueId: 'PROJ-42',
        accountId: '5b10ac8d82e05b22cc7d4ef5',
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/issue/PROJ-42/assignee',
        { accountId: '5b10ac8d82e05b22cc7d4ef5' }
      );
      expect(result).toEqual({
        assigned: true,
        issueId: 'PROJ-42',
        accountId: '5b10ac8d82e05b22cc7d4ef5',
      });
    });

    it('sends null accountId to unassign', async () => {
      mockClient.put.mockResolvedValue({ status: 204, data: '' });

      await JiraConnector.actions.assignIssue.handler(mockContext, {
        issueId: 'PROJ-42',
        accountId: null,
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/issue/PROJ-42/assignee',
        { accountId: null }
      );
    });
  });

  describe('addAttachment action', () => {
    it('posts a FormData body with X-Atlassian-Token header', async () => {
      const mockResponse = { data: [{ id: '10001', filename: 'screenshot.png' }] };
      mockClient.post.mockResolvedValue(mockResponse);

      const fileContent = Buffer.from('fake image data').toString('base64');
      const result = await JiraConnector.actions.addAttachment.handler(mockContext, {
        issueId: 'PROJ-42',
        file: fileContent,
        filename: 'screenshot.png',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/issue/PROJ-42/attachments',
        expect.any(FormData),
        { headers: { 'X-Atlassian-Token': 'no-check' } }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ===========================================================================
  // Nice-to-have actions
  // ===========================================================================

  describe('getAttachment action', () => {
    it('fetches arraybuffer content and returns base64 with content type', async () => {
      // Pass a Buffer directly — Buffer.buffer is a shared pool and gives wrong base64
      const fileBuffer = Buffer.from('PDF content');
      mockClient.get.mockResolvedValue({
        data: fileBuffer,
        headers: { 'content-type': 'application/pdf' },
      });

      const result = await JiraConnector.actions.getAttachment.handler(mockContext, {
        attachmentId: '10001',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/attachment/content/10001',
        { responseType: 'arraybuffer' }
      );
      expect(result).toEqual({
        content: fileBuffer.toString('base64'),
        contentType: 'application/pdf',
        attachmentId: '10001',
      });
    });

    it('falls back to application/octet-stream when content-type header is missing', async () => {
      mockClient.get.mockResolvedValue({
        data: Buffer.from('data'),
        headers: {},
      });

      const result = (await JiraConnector.actions.getAttachment.handler(mockContext, {
        attachmentId: '10002',
      })) as { contentType: string };

      expect(result.contentType).toBe('application/octet-stream');
    });
  });

  describe('linkIssues action', () => {
    it('posts issue link and returns synthesized result', async () => {
      mockClient.post.mockResolvedValue({ status: 201, data: '' });

      const result = await JiraConnector.actions.linkIssues.handler(mockContext, {
        inwardIssueKey: 'PROJ-10',
        outwardIssueKey: 'PROJ-20',
        linkType: 'relates to',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/issueLink',
        {
          type: { name: 'relates to' },
          inwardIssue: { key: 'PROJ-10' },
          outwardIssue: { key: 'PROJ-20' },
        }
      );
      expect(result).toEqual({
        linked: true,
        inwardIssueKey: 'PROJ-10',
        outwardIssueKey: 'PROJ-20',
        linkType: 'relates to',
      });
    });

    it('includes ADF comment when provided', async () => {
      mockClient.post.mockResolvedValue({ status: 201, data: '' });

      await JiraConnector.actions.linkIssues.handler(mockContext, {
        inwardIssueKey: 'PROJ-10',
        outwardIssueKey: 'PROJ-20',
        linkType: 'blocks',
        comment: 'Blocked by this issue',
      });

      const body = mockClient.post.mock.calls[0][1] as Record<string, unknown>;
      expect(body.comment).toEqual({ body: toAdf('Blocked by this issue') });
    });
  });

  describe('deleteIssue action', () => {
    it('has isTool: true (agent-accessible with HITL recommended)', () => {
      expect(JiraConnector.actions.deleteIssue.isTool).toBe(true);
    });

    it('deletes the issue and returns { deleted: true, issueId }', async () => {
      mockClient.delete.mockResolvedValue({ status: 204, data: '' });

      const result = await JiraConnector.actions.deleteIssue.handler(mockContext, {
        issueId: 'PROJ-42',
      });

      expect(mockClient.delete).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/issue/PROJ-42',
        { params: {} }
      );
      expect(result).toEqual({ deleted: true, issueId: 'PROJ-42' });
    });

    it('passes deleteSubtasks as a query param when provided', async () => {
      mockClient.delete.mockResolvedValue({ status: 204, data: '' });

      await JiraConnector.actions.deleteIssue.handler(mockContext, {
        issueId: 'PROJ-42',
        deleteSubtasks: true,
      });

      expect(mockClient.delete).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/issue/PROJ-42',
        { params: { deleteSubtasks: true } }
      );
    });
  });

  describe('addWatcher action', () => {
    it('posts a bare JSON string (accountId) as the body', async () => {
      mockClient.post.mockResolvedValue({ status: 204, data: '' });

      const result = await JiraConnector.actions.addWatcher.handler(mockContext, {
        issueId: 'PROJ-42',
        accountId: '5b10ac8d82e05b22cc7d4ef5',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/issue/PROJ-42/watchers',
        '"5b10ac8d82e05b22cc7d4ef5"',
        { headers: { 'Content-Type': 'application/json' } }
      );
      expect(result).toEqual({
        watching: true,
        issueId: 'PROJ-42',
        accountId: '5b10ac8d82e05b22cc7d4ef5',
      });
    });
  });

  describe('removeWatcher action', () => {
    it('deletes with accountId in query string and returns { unwatched: true }', async () => {
      mockClient.delete.mockResolvedValue({ status: 204, data: '' });

      const result = await JiraConnector.actions.removeWatcher.handler(mockContext, {
        issueId: 'PROJ-42',
        accountId: '5b10ac8d82e05b22cc7d4ef5',
      });

      expect(mockClient.delete).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/issue/PROJ-42/watchers',
        { params: { accountId: '5b10ac8d82e05b22cc7d4ef5' } }
      );
      expect(result).toEqual({
        unwatched: true,
        issueId: 'PROJ-42',
        accountId: '5b10ac8d82e05b22cc7d4ef5',
      });
    });
  });

  // ===========================================================================
  // test handler
  // ===========================================================================

  describe('test handler', () => {
    const testSpec = JiraConnector.test;

    it('should call /rest/api/3/myself and return {}', async () => {
      mockClient.get.mockResolvedValue({ data: { accountId: 'abc123', displayName: 'Alice' } });

      const result = await testSpec.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/rest/api/3/myself'
      );
      expect(result).toEqual({});
    });

    it('should use OAuth base URL when authType is oauth_authorization_code', async () => {
      const oauthContext = {
        ...mockContext,
        config: { subdomain: 'mycompany', cloudId: '11223344-a1b2-3c33-d444-ef1234567890' },
        secrets: { authType: 'oauth_authorization_code' },
      } as unknown as ActionContext;
      mockClient.get.mockResolvedValue({ data: { accountId: 'abc123', displayName: 'Alice' } });

      const result = await testSpec.handler(oauthContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.atlassian.com/ex/jira/11223344-a1b2-3c33-d444-ef1234567890/rest/api/3/myself'
      );
      expect(result).toEqual({});
    });

    it('should throw when the API call fails', async () => {
      mockClient.get.mockRejectedValue(new Error('Unauthorized'));

      await expect(testSpec.handler(mockContext)).rejects.toThrow('Unauthorized');
    });
  });
});
