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

interface TestResult {
  ok: boolean;
  message?: string;
}

describe('Outlook', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    request: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: { debug: jest.fn(), error: jest.fn() },
    config: {},
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchMessages action', () => {
    it('should search messages with default parameters', async () => {
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
                        '@odata.type': '#microsoft.graph.message',
                        subject: 'Test Email',
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

      const result = await Outlook.actions.searchMessages.handler(mockContext, {
        query: 'test email',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/search/query',
        {
          requests: [
            {
              entityTypes: ['message'],
              query: {
                queryString: 'test email',
              },
            },
          ],
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should search messages with pagination parameters', async () => {
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

      await Outlook.actions.searchMessages.handler(mockContext, {
        query: 'project',
        from: 10,
        size: 25,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/search/query',
        {
          requests: [
            {
              entityTypes: ['message'],
              query: {
                queryString: 'project',
              },
              from: 10,
              size: 25,
            },
          ],
        }
      );
    });

    it('should propagate search API errors', async () => {
      mockClient.post.mockRejectedValue(new Error('Invalid search query'));

      await expect(
        Outlook.actions.searchMessages.handler(mockContext, {
          query: 'test',
        })
      ).rejects.toThrow('Invalid search query');
    });
  });

  describe('listMailFolders action', () => {
    it('should list mail folders for a user', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              id: 'folder-1',
              displayName: 'Inbox',
              totalItemCount: 42,
              unreadItemCount: 5,
            },
            {
              id: 'folder-2',
              displayName: 'Sent Items',
              totalItemCount: 100,
              unreadItemCount: 0,
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await Outlook.actions.listMailFolders.handler(mockContext, {
        userId: 'user@contoso.com',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/users/user@contoso.com/mailFolders',
        {
          params: {
            $select:
              'id,displayName,parentFolderId,childFolderCount,totalItemCount,unreadItemCount',
            $top: 50,
          },
        }
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'Outlook listing mail folders for user user@contoso.com'
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle empty folders list', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await Outlook.actions.listMailFolders.handler(mockContext, {
        userId: 'user@contoso.com',
      });

      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Access denied'));

      await expect(
        Outlook.actions.listMailFolders.handler(mockContext, {
          userId: 'user@contoso.com',
        })
      ).rejects.toThrow('Access denied');
    });
  });

  describe('listMessages action', () => {
    it('should list messages in default Inbox folder', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              id: 'msg-1',
              subject: 'Hello',
              from: { emailAddress: { address: 'sender@contoso.com' } },
              receivedDateTime: '2024-01-01T00:00:00Z',
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await Outlook.actions.listMessages.handler(mockContext, {
        userId: 'user@contoso.com',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/users/user@contoso.com/mailFolders/Inbox/messages',
        {
          params: {
            $select:
              'id,subject,from,toRecipients,receivedDateTime,isRead,hasAttachments,bodyPreview,importance',
            $orderby: 'receivedDateTime desc',
            $top: 25,
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should list messages in a specific folder with pagination and filter', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      await Outlook.actions.listMessages.handler(mockContext, {
        userId: 'user@contoso.com',
        folderId: 'folder-123',
        top: 10,
        skip: 20,
        filter: 'isRead eq false',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/users/user@contoso.com/mailFolders/folder-123/messages',
        {
          params: {
            $select:
              'id,subject,from,toRecipients,receivedDateTime,isRead,hasAttachments,bodyPreview,importance',
            $orderby: 'receivedDateTime desc',
            $top: 10,
            $skip: 20,
            $filter: 'isRead eq false',
          },
        }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Folder not found'));

      await expect(
        Outlook.actions.listMessages.handler(mockContext, {
          userId: 'user@contoso.com',
          folderId: 'nonexistent',
        })
      ).rejects.toThrow('Folder not found');
    });
  });

  describe('getMessage action', () => {
    it('should retrieve a specific message by ID', async () => {
      const mockResponse = {
        data: {
          id: 'msg-123',
          subject: 'Important Email',
          from: { emailAddress: { address: 'sender@contoso.com', name: 'Sender' } },
          body: { contentType: 'html', content: '<p>Hello</p>' },
          receivedDateTime: '2024-01-01T10:00:00Z',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await Outlook.actions.getMessage.handler(mockContext, {
        userId: 'user@contoso.com',
        messageId: 'msg-123',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/users/user@contoso.com/messages/msg-123',
        {
          params: {
            $select:
              'id,subject,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,body,importance,categories,conversationId',
          },
        }
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'Outlook getting message msg-123 for user user@contoso.com'
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate message not found errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Message not found'));

      await expect(
        Outlook.actions.getMessage.handler(mockContext, {
          userId: 'user@contoso.com',
          messageId: 'nonexistent',
        })
      ).rejects.toThrow('Message not found');
    });
  });

  describe('searchUserMessages action', () => {
    it('should search messages in a user mailbox', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              id: 'msg-1',
              subject: 'Q4 Report',
              bodyPreview: 'Please find the Q4 report attached.',
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await Outlook.actions.searchUserMessages.handler(mockContext, {
        userId: 'user@contoso.com',
        query: 'Q4 report',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/users/user@contoso.com/messages',
        {
          params: {
            $search: '"Q4 report"',
            $select:
              'id,subject,from,toRecipients,receivedDateTime,isRead,hasAttachments,bodyPreview,importance',
            $top: 25,
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should search with custom top value', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      await Outlook.actions.searchUserMessages.handler(mockContext, {
        userId: 'user@contoso.com',
        query: 'budget',
        top: 10,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/users/user@contoso.com/messages',
        {
          params: {
            $search: '"budget"',
            $select:
              'id,subject,from,toRecipients,receivedDateTime,isRead,hasAttachments,bodyPreview,importance',
            $top: 10,
          },
        }
      );
    });

    it('should handle empty results', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await Outlook.actions.searchUserMessages.handler(mockContext, {
        userId: 'user@contoso.com',
        query: 'nonexistent',
      });

      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Access denied'));

      await expect(
        Outlook.actions.searchUserMessages.handler(mockContext, {
          userId: 'user@contoso.com',
          query: 'test',
        })
      ).rejects.toThrow('Access denied');
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      const mockResponse = {
        data: {
          displayName: 'Contoso',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!Outlook.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await Outlook.test.handler(mockContext)) as TestResult;

      expect(mockClient.get).toHaveBeenCalledWith('https://graph.microsoft.com/v1.0/');
      expect(result.ok).toBe(true);
      expect(result.message).toBe('Successfully connected to Microsoft Graph API: Contoso');
    });

    it('should handle response without display name', async () => {
      const mockResponse = {
        data: {},
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!Outlook.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await Outlook.test.handler(mockContext)) as TestResult;

      expect(result.ok).toBe(true);
      expect(result.message).toBe('Successfully connected to Microsoft Graph API: Unknown');
    });

    it('should return failure when API is not accessible', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid credentials'));

      if (!Outlook.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await Outlook.test.handler(mockContext)) as TestResult;

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Invalid credentials');
    });

    it('should handle network errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Network timeout'));

      if (!Outlook.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await Outlook.test.handler(mockContext)) as TestResult;

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Network timeout');
    });
  });
});
