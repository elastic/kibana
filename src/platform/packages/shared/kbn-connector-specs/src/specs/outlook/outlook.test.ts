/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { Outlook } from './outlook';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

interface TestResult {
  ok: boolean;
  message?: string;
}

describe('Outlook', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: { debug: jest.fn() },
  } as unknown as ActionContext;

  const appOnlyContext = {
    client: mockClient,
    log: { debug: jest.fn() },
    secrets: { authType: 'oauth_client_credentials' },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // Metadata
  // ===========================================================================

  describe('metadata', () => {
    it('has the correct connector id', () => {
      expect(Outlook.metadata.id).toBe('.outlook');
    });

    it('requires enterprise license', () => {
      expect(Outlook.metadata.minimumLicense).toBe('enterprise');
    });

    it('supports workflows and agentBuilder features', () => {
      expect(Outlook.metadata.supportedFeatureIds).toContain('workflows');
      expect(Outlook.metadata.supportedFeatureIds).toContain('agentBuilder');
    });

    it('is marked as technical preview', () => {
      expect(Outlook.metadata.isTechnicalPreview).toBe(true);
    });
  });

  // ===========================================================================
  // Auth
  // ===========================================================================

  describe('auth', () => {
    it('supports bearer and oauth_client_credentials', () => {
      const { auth } = Outlook;
      expect(auth).toBeDefined();
      expect(auth?.types).toHaveLength(2);
      expect(auth?.types[0]).toEqual(expect.objectContaining({ type: 'bearer' }));
      expect(auth?.types[1]).toEqual(
        expect.objectContaining({
          type: 'oauth_client_credentials',
          defaults: { scope: 'https://graph.microsoft.com/.default' },
        })
      );
    });

    it('hides the scope field for client credentials', () => {
      const oauthType = Outlook.auth?.types.find(
        (t) => typeof t === 'object' && t.type === 'oauth_client_credentials'
      );
      expect(oauthType).toBeDefined();
      if (typeof oauthType === 'object') {
        expect(oauthType.overrides?.meta?.scope?.hidden).toBe(true);
      }
    });
  });

  // ===========================================================================
  // Actions — presence
  // ===========================================================================

  describe('actions', () => {
    it('exposes all expected actions', () => {
      expect(Outlook.actions.searchMessages).toBeDefined();
      expect(Outlook.actions.listMessages).toBeDefined();
      expect(Outlook.actions.getMessage).toBeDefined();
      expect(Outlook.actions.listAttachments).toBeDefined();
      expect(Outlook.actions.getAttachment).toBeDefined();
      expect(Outlook.actions.listFolders).toBeDefined();
    });

    it('marks all actions as tools', () => {
      for (const [, action] of Object.entries(Outlook.actions)) {
        expect(action.isTool).toBe(true);
      }
    });
  });

  // ===========================================================================
  // searchMessages
  // ===========================================================================

  describe('searchMessages', () => {
    it('should post to the Graph search API with the query', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              searchTerms: ['budget Q4'],
              hitsContainers: [
                {
                  hits: [
                    {
                      hitId: 'msg-1',
                      rank: 1,
                      summary: 'Q4 budget review attached',
                      resource: { id: 'msg-1', subject: 'Q4 Budget Review' },
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

      const result = await Outlook.actions.searchMessages.handler(mockContext, {
        query: 'subject:budget Q4',
        from: 0,
        size: 10,
      });

      expect(mockClient.post).toHaveBeenCalledWith(`${GRAPH_BASE}/search/query`, {
        requests: [
          {
            entityTypes: ['message'],
            query: { queryString: 'subject:budget Q4' },
            from: 0,
            size: 10,
          },
        ],
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should work with app-only auth (searches across tenant)', async () => {
      mockClient.post.mockResolvedValue({ data: { value: [] } });

      await expect(
        Outlook.actions.searchMessages.handler(appOnlyContext, {
          query: 'subject:invoice',
          from: 0,
          size: 10,
        })
      ).resolves.not.toThrow();
    });

    it('should omit from/size when not provided', async () => {
      mockClient.post.mockResolvedValue({ data: { value: [] } });

      await Outlook.actions.searchMessages.handler(mockContext, {
        query: 'test',
        from: 0,
        size: 10,
      });

      const callArgs = mockClient.post.mock.calls[0];
      expect(callArgs[1].requests[0].from).toBe(0);
      expect(callArgs[1].requests[0].size).toBe(10);
    });

    it('should propagate API errors', async () => {
      mockClient.post.mockRejectedValue(new Error('Graph API error'));

      await expect(
        Outlook.actions.searchMessages.handler(mockContext, {
          query: 'test',
          from: 0,
          size: 10,
        })
      ).rejects.toThrow('Graph API error');
    });
  });

  // ===========================================================================
  // listMessages
  // ===========================================================================

  describe('listMessages', () => {
    it('should list messages from /me/messages with default params', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              id: 'msg-1',
              subject: 'Hello world',
              from: { emailAddress: { name: 'Alice', address: 'alice@contoso.com' } },
              receivedDateTime: '2025-01-15T10:00:00Z',
              isRead: false,
              hasAttachments: false,
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await Outlook.actions.listMessages.handler(mockContext, {
        top: 20,
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${GRAPH_BASE}/me/messages`, {
        params: expect.objectContaining({
          $top: 20,
          $orderby: 'receivedDateTime desc',
        }),
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should list messages from a specific folder', async () => {
      const mockResponse = { data: { value: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await Outlook.actions.listMessages.handler(mockContext, {
        folderId: 'inbox',
        top: 10,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${GRAPH_BASE}/me/mailFolders/inbox/messages`,
        expect.any(Object)
      );
    });

    it('should use /users/{userId} for app-only auth', async () => {
      const mockResponse = { data: { value: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await Outlook.actions.listMessages.handler(appOnlyContext, {
        userId: 'bob@contoso.com',
        top: 20,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${GRAPH_BASE}/users/bob@contoso.com/messages`,
        expect.any(Object)
      );
    });

    it('should throw when using app-only auth without userId', async () => {
      await expect(
        Outlook.actions.listMessages.handler(appOnlyContext, { top: 20 })
      ).rejects.toThrow('listMessages requires a userId when using app-only');
    });

    it('should apply $filter when provided', async () => {
      const mockResponse = { data: { value: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await Outlook.actions.listMessages.handler(mockContext, {
        filter: 'isRead eq false',
        top: 20,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${GRAPH_BASE}/me/messages`,
        expect.objectContaining({
          params: expect.objectContaining({ $filter: 'isRead eq false' }),
        })
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Unauthorized'));

      await expect(Outlook.actions.listMessages.handler(mockContext, { top: 20 })).rejects.toThrow(
        'Unauthorized'
      );
    });
  });

  // ===========================================================================
  // getMessage
  // ===========================================================================

  describe('getMessage', () => {
    it('should fetch a message by ID', async () => {
      const mockResponse = {
        data: {
          id: 'msg-abc',
          subject: 'Project update',
          body: { contentType: 'html', content: '<p>See attached</p>' },
          from: { emailAddress: { name: 'Alice', address: 'alice@contoso.com' } },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await Outlook.actions.getMessage.handler(mockContext, {
        messageId: 'msg-abc',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${GRAPH_BASE}/me/messages/msg-abc`,
        expect.objectContaining({
          params: expect.objectContaining({ $select: expect.any(String) }),
        })
      );
      expect(result).toEqual(mockResponse.data);
      expect(mockContext.log.debug).toHaveBeenCalledWith('Outlook getting message msg-abc');
    });

    it('should use /users/{userId} path when userId is provided', async () => {
      mockClient.get.mockResolvedValue({ data: { id: 'msg-1' } });

      await Outlook.actions.getMessage.handler(appOnlyContext, {
        messageId: 'msg-1',
        userId: 'alice@contoso.com',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${GRAPH_BASE}/users/alice@contoso.com/messages/msg-1`,
        expect.any(Object)
      );
    });

    it('should throw when using app-only auth without userId', async () => {
      await expect(
        Outlook.actions.getMessage.handler(appOnlyContext, { messageId: 'msg-1' })
      ).rejects.toThrow('getMessage requires a userId when using app-only');
    });

    it('should propagate not-found errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Message not found'));

      await expect(
        Outlook.actions.getMessage.handler(mockContext, { messageId: 'bad-id' })
      ).rejects.toThrow('Message not found');
    });
  });

  // ===========================================================================
  // listAttachments
  // ===========================================================================

  describe('listAttachments', () => {
    it('should list attachments for a message', async () => {
      const mockResponse = {
        data: {
          value: [
            { id: 'att-1', name: 'report.pdf', contentType: 'application/pdf', size: 102400 },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await Outlook.actions.listAttachments.handler(mockContext, {
        messageId: 'msg-abc',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${GRAPH_BASE}/me/messages/msg-abc/attachments`,
        expect.objectContaining({ params: { $select: expect.any(String) } })
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw when using app-only auth without userId', async () => {
      await expect(
        Outlook.actions.listAttachments.handler(appOnlyContext, { messageId: 'msg-1' })
      ).rejects.toThrow('listAttachments requires a userId when using app-only');
    });

    it('should use /users/{userId} for app-only auth', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [] } });

      await Outlook.actions.listAttachments.handler(appOnlyContext, {
        messageId: 'msg-1',
        userId: 'alice@contoso.com',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${GRAPH_BASE}/users/alice@contoso.com/messages/msg-1/attachments`,
        expect.any(Object)
      );
    });
  });

  // ===========================================================================
  // getAttachment
  // ===========================================================================

  describe('getAttachment', () => {
    it('should fetch an attachment by message ID and attachment ID', async () => {
      const mockResponse = {
        data: {
          id: 'att-1',
          name: 'report.pdf',
          contentType: 'application/pdf',
          size: 102400,
          contentBytes: 'JVBERi0xLjQ...',
          isInline: false,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await Outlook.actions.getAttachment.handler(mockContext, {
        messageId: 'msg-abc',
        attachmentId: 'att-1',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${GRAPH_BASE}/me/messages/msg-abc/attachments/att-1`
      );
      expect(result).toEqual(mockResponse.data);
      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'Outlook getting attachment att-1 from message msg-abc'
      );
    });

    it('should throw when using app-only auth without userId', async () => {
      await expect(
        Outlook.actions.getAttachment.handler(appOnlyContext, {
          messageId: 'msg-1',
          attachmentId: 'att-1',
        })
      ).rejects.toThrow('getAttachment requires a userId when using app-only');
    });

    it('should use /users/{userId} for app-only auth', async () => {
      mockClient.get.mockResolvedValue({ data: { id: 'att-1', contentBytes: '' } });

      await Outlook.actions.getAttachment.handler(appOnlyContext, {
        messageId: 'msg-1',
        attachmentId: 'att-1',
        userId: 'alice@contoso.com',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${GRAPH_BASE}/users/alice@contoso.com/messages/msg-1/attachments/att-1`
      );
    });
  });

  // ===========================================================================
  // listFolders
  // ===========================================================================

  describe('listFolders', () => {
    it('should list mail folders', async () => {
      const mockResponse = {
        data: {
          value: [
            { id: 'inbox', displayName: 'Inbox', totalItemCount: 150, unreadItemCount: 12 },
            { id: 'sentitems', displayName: 'Sent Items', totalItemCount: 520, unreadItemCount: 0 },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await Outlook.actions.listFolders.handler(mockContext, {
        includeHidden: false,
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${GRAPH_BASE}/me/mailFolders`, {
        params: {
          $select: 'id,displayName,totalItemCount,unreadItemCount,isHidden,parentFolderId',
          includeHiddenFolders: undefined,
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should pass includeHiddenFolders when includeHidden is true', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [] } });

      await Outlook.actions.listFolders.handler(mockContext, { includeHidden: true });

      expect(mockClient.get).toHaveBeenCalledWith(`${GRAPH_BASE}/me/mailFolders`, {
        params: expect.objectContaining({ includeHiddenFolders: 'true' }),
      });
    });

    it('should throw when using app-only auth without userId', async () => {
      await expect(
        Outlook.actions.listFolders.handler(appOnlyContext, { includeHidden: false })
      ).rejects.toThrow('listFolders requires a userId when using app-only');
    });

    it('should use /users/{userId} for app-only auth', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [] } });

      await Outlook.actions.listFolders.handler(appOnlyContext, {
        userId: 'alice@contoso.com',
        includeHidden: false,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${GRAPH_BASE}/users/alice@contoso.com/mailFolders`,
        expect.any(Object)
      );
    });
  });

  // ===========================================================================
  // test handler
  // ===========================================================================

  describe('test handler', () => {
    it('should return ok: true for delegated auth on success', async () => {
      mockClient.get.mockResolvedValue({
        data: { displayName: 'Alice Smith', mail: 'alice@contoso.com' },
      });

      if (!Outlook.test?.handler) {
        throw new Error('Test handler not defined');
      }
      const result = (await Outlook.test.handler(mockContext)) as TestResult;

      expect(mockClient.get).toHaveBeenCalledWith(`${GRAPH_BASE}/me`, {
        params: { $select: 'displayName,mail,userPrincipalName' },
      });
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Outlook as Alice Smith',
      });
    });

    it('should fall back to mail when displayName is missing', async () => {
      mockClient.get.mockResolvedValue({
        data: { mail: 'alice@contoso.com' },
      });

      if (!Outlook.test?.handler) {
        throw new Error('Test handler not defined');
      }
      const result = (await Outlook.test.handler(mockContext)) as TestResult;

      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Outlook as alice@contoso.com',
      });
    });

    it('should fall back to "user" when display info is missing', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      if (!Outlook.test?.handler) {
        throw new Error('Test handler not defined');
      }
      const result = (await Outlook.test.handler(mockContext)) as TestResult;

      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Outlook as user',
      });
    });

    it('should return ok: true for app-only auth when Graph API is accessible', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      if (!Outlook.test?.handler) {
        throw new Error('Test handler not defined');
      }
      const result = (await Outlook.test.handler(appOnlyContext)) as TestResult;

      expect(mockClient.get).toHaveBeenCalledWith(`${GRAPH_BASE}/`);
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Outlook (app-only auth)',
      });
    });

    it('should return ok: false when API throws', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid credentials'));

      if (!Outlook.test?.handler) {
        throw new Error('Test handler not defined');
      }
      const result = (await Outlook.test.handler(mockContext)) as TestResult;

      expect(result).toEqual({
        ok: false,
        message: 'Invalid credentials',
      });
    });

    it('should return ok: false on non-Error exception', async () => {
      mockClient.get.mockRejectedValue('string error');

      if (!Outlook.test?.handler) {
        throw new Error('Test handler not defined');
      }
      const result = (await Outlook.test.handler(mockContext)) as TestResult;

      expect(result).toEqual({
        ok: false,
        message: 'Unknown error',
      });
    });
  });
});
