/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { MicrosoftTeams } from './microsoft_teams';

interface GraphCollectionResponse<T = unknown> {
  value: T[];
  '@odata.nextLink'?: string;
}

interface SearchResponse {
  value: Array<{
    searchTerms?: string[];
    hitsContainers: Array<{
      hits: Array<{
        hitId: string;
        rank?: number;
        summary?: string;
        resource: Record<string, unknown>;
      }>;
      total: number;
      moreResultsAvailable?: boolean;
    }>;
  }>;
}

interface TestResult {
  ok: boolean;
  message?: string;
}

describe('MicrosoftTeams', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: { debug: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct connector id', () => {
      expect(MicrosoftTeams.metadata.id).toBe('.microsoft-teams');
    });

    it('should require enterprise license', () => {
      expect(MicrosoftTeams.metadata.minimumLicense).toBe('enterprise');
    });

    it('should support workflows feature', () => {
      expect(MicrosoftTeams.metadata.supportedFeatureIds).toContain('workflows');
    });
  });

  describe('auth', () => {
    it('should use oauth_client_credentials', () => {
      const { auth } = MicrosoftTeams;
      expect(auth).toBeDefined();
      expect(auth?.types).toHaveLength(1);
      expect(auth?.types[0]).toEqual(
        expect.objectContaining({
          type: 'oauth_client_credentials',
        })
      );
    });
  });

  describe('listJoinedTeams action', () => {
    it('should list joined teams', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              id: 'team-1',
              displayName: 'Engineering',
              description: 'Engineering team',
              isArchived: false,
              tenantId: 'tenant-abc',
            },
            {
              id: 'team-2',
              displayName: 'Marketing',
              description: 'Marketing team',
              isArchived: false,
              tenantId: 'tenant-abc',
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await MicrosoftTeams.actions.listJoinedTeams.handler(
        mockContext,
        {}
      )) as GraphCollectionResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/me/joinedTeams',
        {
          params: {
            $select: 'id,displayName,description,isArchived,tenantId',
          },
        }
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith('Microsoft Teams listing joined teams');
      expect(result).toEqual(mockResponse.data);
      expect(result.value).toHaveLength(2);
    });

    it('should handle empty teams list', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await MicrosoftTeams.actions.listJoinedTeams.handler(
        mockContext,
        {}
      )) as GraphCollectionResponse;

      expect(result).toEqual(mockResponse.data);
      expect(result.value).toHaveLength(0);
    });

    it('should work with undefined input', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await MicrosoftTeams.actions.listJoinedTeams.handler(mockContext, undefined);

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/me/joinedTeams',
        {
          params: {
            $select: 'id,displayName,description,isArchived,tenantId',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Access denied'));

      await expect(MicrosoftTeams.actions.listJoinedTeams.handler(mockContext, {})).rejects.toThrow(
        'Access denied'
      );
    });
  });

  describe('listChannels action', () => {
    it('should list channels for a team', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              id: 'channel-1',
              displayName: 'General',
              description: 'General channel',
              membershipType: 'standard',
            },
            {
              id: 'channel-2',
              displayName: 'Announcements',
              description: 'Announcements channel',
              membershipType: 'standard',
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await MicrosoftTeams.actions.listChannels.handler(mockContext, {
        teamId: 'team-123',
      })) as GraphCollectionResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/teams/team-123/channels',
        {
          params: {
            $select: 'id,displayName,description,createdDateTime,membershipType,webUrl',
          },
        }
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'Microsoft Teams listing channels for team team-123'
      );
      expect(result).toEqual(mockResponse.data);
      expect(result.value).toHaveLength(2);
    });

    it('should handle empty channels list', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await MicrosoftTeams.actions.listChannels.handler(mockContext, {
        teamId: 'empty-team',
      })) as GraphCollectionResponse;

      expect(result).toEqual(mockResponse.data);
      expect(result.value).toHaveLength(0);
    });

    it('should propagate team not found errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Team not found'));

      await expect(
        MicrosoftTeams.actions.listChannels.handler(mockContext, {
          teamId: 'nonexistent-team',
        })
      ).rejects.toThrow('Team not found');
    });
  });

  describe('listChannelMessages action', () => {
    it('should list messages for a channel', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              id: 'msg-1',
              messageType: 'message',
              createdDateTime: '2025-01-01T10:00:00Z',
              from: {
                user: { id: 'user-1', displayName: 'Alice' },
              },
              body: { contentType: 'html', content: 'Hello team!' },
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await MicrosoftTeams.actions.listChannelMessages.handler(mockContext, {
        teamId: 'team-123',
        channelId: 'channel-456',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/teams/team-123/channels/channel-456/messages',
        { params: {} }
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'Microsoft Teams listing messages for channel channel-456 in team team-123'
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should include $top parameter when provided', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      await MicrosoftTeams.actions.listChannelMessages.handler(mockContext, {
        teamId: 'team-123',
        channelId: 'channel-456',
        top: 10,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/teams/team-123/channels/channel-456/messages',
        { params: { $top: 10 } }
      );
    });

    it('should not include $top when not provided', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      await MicrosoftTeams.actions.listChannelMessages.handler(mockContext, {
        teamId: 'team-123',
        channelId: 'channel-456',
      });

      const callArgs = mockClient.get.mock.calls[0];
      expect(callArgs[1].params).not.toHaveProperty('$top');
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Channel not found'));

      await expect(
        MicrosoftTeams.actions.listChannelMessages.handler(mockContext, {
          teamId: 'team-123',
          channelId: 'nonexistent-channel',
        })
      ).rejects.toThrow('Channel not found');
    });
  });

  describe('listChats action', () => {
    it('should list user chats', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              id: 'chat-1',
              topic: null,
              chatType: 'oneOnOne',
              createdDateTime: '2025-01-01T00:00:00Z',
            },
            {
              id: 'chat-2',
              topic: 'Project Discussion',
              chatType: 'group',
              createdDateTime: '2025-01-02T00:00:00Z',
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await MicrosoftTeams.actions.listChats.handler(
        mockContext,
        {}
      )) as GraphCollectionResponse;

      expect(mockClient.get).toHaveBeenCalledWith('https://graph.microsoft.com/v1.0/me/chats', {
        params: {
          $select: 'id,topic,createdDateTime,lastUpdatedDateTime,chatType,webUrl',
        },
      });
      expect(mockContext.log.debug).toHaveBeenCalledWith('Microsoft Teams listing chats');
      expect(result).toEqual(mockResponse.data);
      expect(result.value).toHaveLength(2);
    });

    it('should include $top parameter when provided', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      await MicrosoftTeams.actions.listChats.handler(mockContext, { top: 5 });

      expect(mockClient.get).toHaveBeenCalledWith('https://graph.microsoft.com/v1.0/me/chats', {
        params: {
          $select: 'id,topic,createdDateTime,lastUpdatedDateTime,chatType,webUrl',
          $top: 5,
        },
      });
    });

    it('should not include $top when not provided', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      await MicrosoftTeams.actions.listChats.handler(mockContext, {});

      const callArgs = mockClient.get.mock.calls[0];
      expect(callArgs[1].params).not.toHaveProperty('$top');
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Unauthorized'));

      await expect(MicrosoftTeams.actions.listChats.handler(mockContext, {})).rejects.toThrow(
        'Unauthorized'
      );
    });
  });

  describe('listChatMessages action', () => {
    it('should list messages for a chat', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              id: 'msg-1',
              messageType: 'message',
              createdDateTime: '2025-01-01T10:00:00Z',
              from: {
                user: { id: 'user-1', displayName: 'Bob' },
              },
              body: { contentType: 'text', content: 'Hey there!' },
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await MicrosoftTeams.actions.listChatMessages.handler(mockContext, {
        chatId: 'chat-789',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/chats/chat-789/messages',
        { params: {} }
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'Microsoft Teams listing messages for chat chat-789'
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should include $top parameter when provided', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      await MicrosoftTeams.actions.listChatMessages.handler(mockContext, {
        chatId: 'chat-789',
        top: 20,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/chats/chat-789/messages',
        { params: { $top: 20 } }
      );
    });

    it('should not include $top when not provided', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      await MicrosoftTeams.actions.listChatMessages.handler(mockContext, {
        chatId: 'chat-789',
      });

      const callArgs = mockClient.get.mock.calls[0];
      expect(callArgs[1].params).not.toHaveProperty('$top');
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Chat not found'));

      await expect(
        MicrosoftTeams.actions.listChatMessages.handler(mockContext, {
          chatId: 'nonexistent-chat',
        })
      ).rejects.toThrow('Chat not found');
    });
  });

  describe('searchMessages action', () => {
    it('should search messages with required query', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              searchTerms: ['project update'],
              hitsContainers: [
                {
                  hits: [
                    {
                      hitId: 'hit-1',
                      rank: 1,
                      summary: 'Here is the project update...',
                      resource: {
                        '@odata.type': 'microsoft.graph.chatMessage',
                        id: 'msg-1',
                        createdDateTime: '2025-01-01T10:00:00Z',
                        from: {
                          emailAddress: {
                            name: 'Alice',
                            address: 'alice@contoso.com',
                          },
                        },
                        body: { content: 'Here is the project update for this week' },
                      },
                    },
                  ],
                  total: 1,
                  moreResultsAvailable: false,
                },
              ],
            },
          ],
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = (await MicrosoftTeams.actions.searchMessages.handler(mockContext, {
        query: 'project update',
      })) as SearchResponse;

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/search/query',
        {
          requests: [
            {
              entityTypes: ['chatMessage'],
              query: {
                queryString: 'project update',
              },
            },
          ],
        }
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'Microsoft Teams searching messages: "project update"'
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should include pagination parameters', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              hitsContainers: [
                {
                  hits: [],
                  total: 50,
                  moreResultsAvailable: true,
                },
              ],
            },
          ],
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      await MicrosoftTeams.actions.searchMessages.handler(mockContext, {
        query: 'documents',
        from: 10,
        size: 25,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/search/query',
        {
          requests: [
            {
              entityTypes: ['chatMessage'],
              query: {
                queryString: 'documents',
              },
              from: 10,
              size: 25,
            },
          ],
        }
      );
    });

    it('should include enableTopResults when provided', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      await MicrosoftTeams.actions.searchMessages.handler(mockContext, {
        query: 'important',
        enableTopResults: true,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/search/query',
        {
          requests: [
            {
              entityTypes: ['chatMessage'],
              query: {
                queryString: 'important',
              },
              enableTopResults: true,
            },
          ],
        }
      );
    });

    it('should not include optional params when not provided', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      await MicrosoftTeams.actions.searchMessages.handler(mockContext, {
        query: 'test',
      });

      const callArgs = mockClient.post.mock.calls[0];
      const requestBody = callArgs[1];
      expect(requestBody.requests[0]).not.toHaveProperty('from');
      expect(requestBody.requests[0]).not.toHaveProperty('size');
      expect(requestBody.requests[0]).not.toHaveProperty('enableTopResults');
    });

    it('should handle KQL syntax queries', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      await MicrosoftTeams.actions.searchMessages.handler(mockContext, {
        query: 'from:bob sent>2024-01-01',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/search/query',
        {
          requests: [
            {
              entityTypes: ['chatMessage'],
              query: {
                queryString: 'from:bob sent>2024-01-01',
              },
            },
          ],
        }
      );
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
                  moreResultsAvailable: false,
                },
              ],
            },
          ],
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = (await MicrosoftTeams.actions.searchMessages.handler(mockContext, {
        query: 'nonexistent content xyz',
      })) as SearchResponse;

      expect(result).toEqual(mockResponse.data);
      expect(result.value[0].hitsContainers[0].total).toBe(0);
    });

    it('should propagate search API errors', async () => {
      mockClient.post.mockRejectedValue(new Error('Invalid search query'));

      await expect(
        MicrosoftTeams.actions.searchMessages.handler(mockContext, {
          query: 'test',
        })
      ).rejects.toThrow('Invalid search query');
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      const mockResponse = {
        data: {
          value: [
            { id: 'team-1', displayName: 'Engineering' },
            { id: 'team-2', displayName: 'Marketing' },
            { id: 'team-3', displayName: 'Sales' },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!MicrosoftTeams.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await MicrosoftTeams.test.handler(mockContext)) as TestResult;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/me/joinedTeams',
        { params: { $select: 'id,displayName' } }
      );
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Microsoft Teams: found 3 teams',
      });
    });

    it('should handle zero teams', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!MicrosoftTeams.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await MicrosoftTeams.test.handler(mockContext)) as TestResult;

      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Microsoft Teams: found 0 teams',
      });
    });

    it('should return failure when API is not accessible', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid credentials'));

      if (!MicrosoftTeams.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await MicrosoftTeams.test.handler(mockContext)) as TestResult;

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Invalid credentials');
    });

    it('should handle network errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Network timeout'));

      if (!MicrosoftTeams.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await MicrosoftTeams.test.handler(mockContext)) as TestResult;

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Network timeout');
    });

    it('should handle non-Error exceptions', async () => {
      mockClient.get.mockRejectedValue('string error');

      if (!MicrosoftTeams.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await MicrosoftTeams.test.handler(mockContext)) as TestResult;

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Unknown error');
    });
  });
});
