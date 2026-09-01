/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, AuthTypeDef } from '../../connector_spec';
import { generateSecretsSchemaFromSpec } from '../../lib/generate_secrets_schema_from_spec';
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

describe('MicrosoftTeams', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
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

    it('should support workflows and contextEngine features', () => {
      expect(MicrosoftTeams.metadata.supportedFeatureIds).toContain('workflows');
      expect(MicrosoftTeams.metadata.supportedFeatureIds).toContain('contextEngine');
    });
  });

  describe('auth', () => {
    it('should support ears, oauth_authorization_code, oauth_client_credentials, and oauth_client_credentials_private_key_jwt as visible options', () => {
      const { auth } = MicrosoftTeams;
      expect(auth).toBeDefined();
      const visibleTypes = auth?.types.filter(
        (t) => typeof t === 'string' || !(t as AuthTypeDef).isLegacy
      );
      expect(visibleTypes).toHaveLength(4);
      expect(visibleTypes?.[0]).toEqual(
        expect.objectContaining({ type: 'ears', isRecommended: true })
      );
      expect(visibleTypes?.[1]).toEqual(
        expect.objectContaining({ type: 'oauth_authorization_code' })
      );
      expect(visibleTypes?.[2]).toEqual(
        expect.objectContaining({ type: 'oauth_client_credentials' })
      );
      expect(visibleTypes?.[3]).toEqual(
        expect.objectContaining({ type: 'oauth_client_credentials_private_key_jwt' })
      );
    });

    it('marks only ears (Quick Connect) as recommended', () => {
      const recommended = (MicrosoftTeams.auth?.types as Array<string | AuthTypeDef>)
        .filter((t): t is AuthTypeDef => typeof t === 'object' && Boolean(t.isRecommended))
        .map((t) => t.type);
      expect(recommended).toEqual(['ears']);
    });

    it('bearer auth is hidden (not shown in picker) but retained for existing connectors', () => {
      const bearerDef = MicrosoftTeams.auth?.types.find(
        (t): t is AuthTypeDef => typeof t === 'object' && t.type === 'bearer'
      );
      expect(bearerDef).toBeDefined();
      expect(bearerDef?.isLegacy).toBe(true);
    });

    it('existing connectors with bearer auth still pass schema validation', () => {
      const schema = generateSecretsSchemaFromSpec(MicrosoftTeams.auth, {
        isEarsEnabled: true,
        isEarsExperimentalEnabled: true,
      });
      const result = schema.safeParse({ authType: 'bearer', token: 'some-legacy-token' });
      expect(result.success).toBe(true);
    });

    it('should have correct oauth_authorization_code defaults', () => {
      const oauthType = MicrosoftTeams.auth?.types.find(
        (t) => typeof t === 'object' && t.type === 'oauth_authorization_code'
      );
      expect(oauthType).toBeDefined();
      expect(oauthType).toMatchObject({
        type: 'oauth_authorization_code',
        defaults: {
          scope: expect.stringContaining('offline_access'),
        },
      });
    });

    it('should have correct ears defaults with microsoft provider and Teams scopes', () => {
      const earsType = MicrosoftTeams.auth?.types.find(
        (t) => typeof t === 'object' && t.type === 'ears'
      ) as
        | {
            type: string;
            defaults?: { provider?: string; scope?: string };
            overrides?: { meta?: { scope?: { disabled?: boolean } } };
          }
        | undefined;
      expect(earsType).toBeDefined();
      expect(earsType?.defaults?.provider).toBe('microsoft');
      expect(earsType?.defaults?.scope).toContain('Team.ReadBasic.All');
      expect(earsType?.defaults?.scope).toContain('Channel.ReadBasic.All');
      expect(earsType?.defaults?.scope).toContain('Chat.Read');
      expect(earsType?.defaults?.scope).toContain('ChannelMessage.Read.All');
      expect(earsType?.defaults?.scope).toContain('offline_access');
      expect(earsType?.overrides?.meta?.scope?.disabled).toBe(true);
    });

    it('oauth_authorization_code scope should include Teams-required permissions', () => {
      const oauthType = MicrosoftTeams.auth?.types.find(
        (t) => typeof t === 'object' && t.type === 'oauth_authorization_code'
      ) as { defaults?: { scope?: string } } | undefined;
      const scope = oauthType?.defaults?.scope ?? '';
      expect(scope).toContain('Team.ReadBasic.All');
      expect(scope).toContain('Channel.ReadBasic.All');
      expect(scope).toContain('Chat.Read');
      expect(scope).toContain('ChannelMessage.Read.All');
      expect(scope).toContain('offline_access');
    });

    it('app-only (client credentials) auth types default the Graph .default scope', () => {
      // The scope field is hidden for these app-only types, so it must be defaulted —
      // Microsoft's client-credentials grant rejects an empty scope (AADSTS900144).
      const appOnlyTypes = (MicrosoftTeams.auth?.types as Array<string | AuthTypeDef>).filter(
        (t): t is AuthTypeDef =>
          typeof t === 'object' &&
          (t.type === 'oauth_client_credentials' ||
            t.type === 'oauth_client_credentials_private_key_jwt')
      );
      expect(appOnlyTypes).toHaveLength(2);
      appOnlyTypes.forEach((t) => {
        expect((t.defaults as { scope?: string }).scope).toBe(
          'https://graph.microsoft.com/.default'
        );
      });
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

    it('should use /users/{userId} path when userId is provided', async () => {
      const mockResponse = {
        data: { value: [{ id: 'team-1', displayName: 'Engineering' }] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await MicrosoftTeams.actions.listJoinedTeams.handler(mockContext, {
        userId: 'user-abc-123',
      })) as GraphCollectionResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/users/user-abc-123/joinedTeams',
        {
          params: {
            $select: 'id,displayName,description,isArchived,tenantId',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw when using app-only auth without userId', async () => {
      const appOnlyContext = {
        ...mockContext,
        secrets: { authType: 'oauth_client_credentials' },
      } as unknown as ActionContext;

      await expect(
        MicrosoftTeams.actions.listJoinedTeams.handler(appOnlyContext, {})
      ).rejects.toThrow(
        'listJoinedTeams requires a userId when using app-only (client credentials) auth.'
      );
      expect(mockClient.get).not.toHaveBeenCalled();
    });

    it('should throw when using private_key_jwt auth without userId', async () => {
      const pkjwtContext = {
        ...mockContext,
        secrets: { authType: 'oauth_client_credentials_private_key_jwt' },
      } as unknown as ActionContext;

      await expect(
        MicrosoftTeams.actions.listJoinedTeams.handler(pkjwtContext, {})
      ).rejects.toThrow(
        'listJoinedTeams requires a userId when using app-only (client credentials) auth.'
      );
      expect(mockClient.get).not.toHaveBeenCalled();
    });

    it('should not throw when using app-only auth with userId', async () => {
      const appOnlyContext = {
        ...mockContext,
        secrets: { authType: 'oauth_client_credentials' },
      } as unknown as ActionContext;

      mockClient.get.mockResolvedValue({
        data: { value: [{ id: 'team-1', displayName: 'Engineering' }] },
      });

      await expect(
        MicrosoftTeams.actions.listJoinedTeams.handler(appOnlyContext, { userId: 'user-abc' })
      ).resolves.not.toThrow();
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/users/user-abc/joinedTeams',
        expect.any(Object)
      );
    });

    it('should encode userId (UPN) in the /users path', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [] } });

      await MicrosoftTeams.actions.listJoinedTeams.handler(mockContext, {
        userId: 'alice@contoso.com',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/users/alice%40contoso.com/joinedTeams',
        expect.any(Object)
      );
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

    it('should use /users/{userId} path when userId is provided', async () => {
      const mockResponse = {
        data: {
          value: [{ id: 'chat-1', topic: 'Test', chatType: 'group' }],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await MicrosoftTeams.actions.listChats.handler(mockContext, {
        userId: 'user-abc-123',
      })) as GraphCollectionResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/users/user-abc-123/chats',
        {
          params: {
            $select: 'id,topic,createdDateTime,lastUpdatedDateTime,chatType,webUrl',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
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

    it('should throw when using app-only auth without userId', async () => {
      const appOnlyContext = {
        ...mockContext,
        secrets: { authType: 'oauth_client_credentials' },
      } as unknown as ActionContext;

      await expect(MicrosoftTeams.actions.listChats.handler(appOnlyContext, {})).rejects.toThrow(
        'listChats requires a userId when using app-only (client credentials) auth.'
      );
      expect(mockClient.get).not.toHaveBeenCalled();
    });

    it('should throw when using private_key_jwt auth without userId', async () => {
      const pkjwtContext = {
        ...mockContext,
        secrets: { authType: 'oauth_client_credentials_private_key_jwt' },
      } as unknown as ActionContext;

      await expect(MicrosoftTeams.actions.listChats.handler(pkjwtContext, {})).rejects.toThrow(
        'listChats requires a userId when using app-only (client credentials) auth.'
      );
      expect(mockClient.get).not.toHaveBeenCalled();
    });

    it('should not throw when using app-only auth with userId', async () => {
      const appOnlyContext = {
        ...mockContext,
        secrets: { authType: 'oauth_client_credentials' },
      } as unknown as ActionContext;

      mockClient.get.mockResolvedValue({
        data: { value: [{ id: 'chat-1', topic: 'Test', chatType: 'group' }] },
      });

      await expect(
        MicrosoftTeams.actions.listChats.handler(appOnlyContext, { userId: 'user-abc' })
      ).resolves.not.toThrow();
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/users/user-abc/chats',
        expect.any(Object)
      );
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
      expect(mockContext.log.debug).toHaveBeenCalledWith('Microsoft Teams searching messages');
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

    it('should throw when called with app-only (oauth_client_credentials) auth', async () => {
      const appOnlyContext = {
        ...mockContext,
        secrets: { authType: 'oauth_client_credentials' },
      } as unknown as ActionContext;

      await expect(
        MicrosoftTeams.actions.searchMessages.handler(appOnlyContext, {
          query: 'test',
        })
      ).rejects.toThrow(
        'searchMessages requires delegated authentication (bearer token or OAuth authorization code). ' +
          'Microsoft Graph does not support app-only (client credentials) access ' +
          'to the /search/query API for chatMessage entities.'
      );
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('should throw when called with private_key_jwt (app-only) auth', async () => {
      const pkjwtContext = {
        ...mockContext,
        secrets: { authType: 'oauth_client_credentials_private_key_jwt' },
      } as unknown as ActionContext;

      await expect(
        MicrosoftTeams.actions.searchMessages.handler(pkjwtContext, { query: 'test' })
      ).rejects.toThrow('searchMessages requires delegated authentication');
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('should not throw for delegated auth (bearer token)', async () => {
      const bearerContext = {
        ...mockContext,
        secrets: { authType: 'bearer' },
      } as unknown as ActionContext;

      mockClient.post.mockResolvedValue({ data: { value: [] } });

      await expect(
        MicrosoftTeams.actions.searchMessages.handler(bearerContext, { query: 'test' })
      ).resolves.not.toThrow();
      expect(mockClient.post).toHaveBeenCalled();
    });

    it('should not throw for delegated auth (oauth_authorization_code)', async () => {
      const oauthCodeContext = {
        ...mockContext,
        secrets: { authType: 'oauth_authorization_code' },
      } as unknown as ActionContext;

      mockClient.post.mockResolvedValue({ data: { value: [] } });

      await expect(
        MicrosoftTeams.actions.searchMessages.handler(oauthCodeContext, { query: 'test' })
      ).resolves.not.toThrow();
      expect(mockClient.post).toHaveBeenCalled();
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

  describe('sendChannelMessage action', () => {
    it('should post a message to a channel', async () => {
      const mockResponse = {
        data: {
          id: 'msg-new-1',
          createdDateTime: '2025-06-01T10:00:00Z',
          webUrl: 'https://teams.microsoft.com/l/message/msg-new-1',
          from: { user: { id: 'user-1', displayName: 'Alice' } },
          body: { contentType: 'text', content: 'Hello channel!' },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await MicrosoftTeams.actions.sendChannelMessage.handler(mockContext, {
        teamId: 'team-123',
        channelId: 'channel-456',
        content: 'Hello channel!',
        contentType: 'text',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/teams/team-123/channels/channel-456/messages',
        { body: { contentType: 'text', content: 'Hello channel!' } }
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'Microsoft Teams sending message to channel channel-456 in team team-123'
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should include subject when provided', async () => {
      mockClient.post.mockResolvedValue({ data: { id: 'msg-2' } });

      await MicrosoftTeams.actions.sendChannelMessage.handler(mockContext, {
        teamId: 'team-123',
        channelId: 'channel-456',
        content: 'Incident update',
        contentType: 'text',
        subject: 'SEV1 Alert',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/teams/team-123/channels/channel-456/messages',
        { body: { contentType: 'text', content: 'Incident update' }, subject: 'SEV1 Alert' }
      );
    });

    it('should send HTML content', async () => {
      mockClient.post.mockResolvedValue({ data: { id: 'msg-3' } });

      await MicrosoftTeams.actions.sendChannelMessage.handler(mockContext, {
        teamId: 'team-123',
        channelId: 'channel-456',
        content: '<b>Alert fired!</b>',
        contentType: 'html',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/teams/team-123/channels/channel-456/messages',
        { body: { contentType: 'html', content: '<b>Alert fired!</b>' } }
      );
    });

    it('should include contentType in body (schema default: text)', async () => {
      mockClient.post.mockResolvedValue({ data: { id: 'msg-4' } });

      await MicrosoftTeams.actions.sendChannelMessage.handler(mockContext, {
        teamId: 'team-123',
        channelId: 'channel-456',
        content: 'No contentType field',
        contentType: 'text',
      });

      const callArgs = mockClient.post.mock.calls[0];
      expect(callArgs[1].body.contentType).toBe('text');
    });

    it('should encode special characters in teamId and channelId', async () => {
      mockClient.post.mockResolvedValue({ data: { id: 'msg-5' } });

      await MicrosoftTeams.actions.sendChannelMessage.handler(mockContext, {
        teamId: 'team abc',
        channelId: 'channel/xyz',
        content: 'test',
        contentType: 'text',
      });

      const callArgs = mockClient.post.mock.calls[0];
      expect(callArgs[0]).toBe(
        'https://graph.microsoft.com/v1.0/teams/team%20abc/channels/channel%2Fxyz/messages'
      );
    });

    it('should propagate API errors', async () => {
      mockClient.post.mockRejectedValue(new Error('Forbidden'));

      await expect(
        MicrosoftTeams.actions.sendChannelMessage.handler(mockContext, {
          teamId: 'team-123',
          channelId: 'channel-456',
          content: 'test',
          contentType: 'text',
        })
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('sendChatMessage action', () => {
    it('should send a message to a chat', async () => {
      const mockResponse = {
        data: {
          id: 'chat-msg-1',
          createdDateTime: '2025-06-01T10:00:00Z',
          webUrl: 'https://teams.microsoft.com/l/message/chat-msg-1',
          from: { user: { id: 'user-1', displayName: 'Alice' } },
          body: { contentType: 'text', content: 'Hey there!' },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await MicrosoftTeams.actions.sendChatMessage.handler(mockContext, {
        chatId: 'chat-789',
        content: 'Hey there!',
        contentType: 'text',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/chats/chat-789/messages',
        { body: { contentType: 'text', content: 'Hey there!' } }
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'Microsoft Teams sending message to chat chat-789'
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should send HTML content', async () => {
      mockClient.post.mockResolvedValue({ data: { id: 'chat-msg-2' } });

      await MicrosoftTeams.actions.sendChatMessage.handler(mockContext, {
        chatId: 'chat-789',
        content: '<b>Alert!</b>',
        contentType: 'html',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/chats/chat-789/messages',
        { body: { contentType: 'html', content: '<b>Alert!</b>' } }
      );
    });

    it('should include contentType in body (schema default: text)', async () => {
      mockClient.post.mockResolvedValue({ data: { id: 'chat-msg-3' } });

      await MicrosoftTeams.actions.sendChatMessage.handler(mockContext, {
        chatId: 'chat-789',
        content: 'Hello',
        contentType: 'text',
      });

      const callArgs = mockClient.post.mock.calls[0];
      expect(callArgs[1].body.contentType).toBe('text');
    });

    it('should encode special characters in chatId', async () => {
      mockClient.post.mockResolvedValue({ data: { id: 'chat-msg-4' } });

      await MicrosoftTeams.actions.sendChatMessage.handler(mockContext, {
        chatId: '19:abc@thread.v2',
        content: 'test',
        contentType: 'text',
      });

      const callArgs = mockClient.post.mock.calls[0];
      expect(callArgs[0]).toBe(
        'https://graph.microsoft.com/v1.0/chats/19%3Aabc%40thread.v2/messages'
      );
    });

    it('should propagate API errors', async () => {
      mockClient.post.mockRejectedValue(new Error('Chat not found'));

      await expect(
        MicrosoftTeams.actions.sendChatMessage.handler(mockContext, {
          chatId: 'nonexistent',
          content: 'test',
          contentType: 'text',
        })
      ).rejects.toThrow('Chat not found');
    });
  });

  describe('updateMessage action', () => {
    const mockPatch = jest.fn();
    const mockContextWithPatch = {
      ...mockContext,
      client: { ...mockClient, patch: mockPatch },
    } as unknown as ActionContext;

    beforeEach(() => {
      mockPatch.mockReset();
    });

    it('should update a channel message', async () => {
      mockPatch.mockResolvedValue({ data: '' });

      const result = await MicrosoftTeams.actions.updateMessage.handler(mockContextWithPatch, {
        messageId: 'msg-1',
        teamId: 'team-123',
        channelId: 'channel-456',
        content: 'Updated content',
        contentType: 'text',
      });

      expect(mockPatch).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/teams/team-123/channels/channel-456/messages/msg-1',
        { body: { contentType: 'text', content: 'Updated content' } }
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith('Microsoft Teams updating message msg-1');
      expect(result).toEqual({ success: true });
    });

    it('should update a chat message', async () => {
      mockPatch.mockResolvedValue({ data: '' });

      const result = await MicrosoftTeams.actions.updateMessage.handler(mockContextWithPatch, {
        messageId: 'msg-2',
        chatId: 'chat-789',
        content: 'Edited reply',
        contentType: 'text',
      });

      expect(mockPatch).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/chats/chat-789/messages/msg-2',
        { body: { contentType: 'text', content: 'Edited reply' } }
      );
      expect(result).toEqual({ success: true });
    });

    it('should send HTML update', async () => {
      mockPatch.mockResolvedValue({ data: '' });

      await MicrosoftTeams.actions.updateMessage.handler(mockContextWithPatch, {
        messageId: 'msg-3',
        chatId: 'chat-789',
        content: '<b>Updated!</b>',
        contentType: 'html',
      });

      const callArgs = mockPatch.mock.calls[0];
      expect(callArgs[1].body.contentType).toBe('html');
    });

    it('should throw when neither channel nor chat context is provided', async () => {
      await expect(
        MicrosoftTeams.actions.updateMessage.handler(mockContextWithPatch, {
          messageId: 'msg-1',
          content: 'test',
          contentType: 'text',
        } as Parameters<typeof MicrosoftTeams.actions.updateMessage.handler>[1])
      ).rejects.toThrow(
        'updateMessage requires either teamId + channelId (channel message) or chatId (chat message).'
      );
      expect(mockPatch).not.toHaveBeenCalled();
    });

    it('should propagate patch errors', async () => {
      mockPatch.mockRejectedValue(new Error('Not found'));

      await expect(
        MicrosoftTeams.actions.updateMessage.handler(mockContextWithPatch, {
          messageId: 'msg-1',
          chatId: 'chat-789',
          content: 'test',
          contentType: 'text',
        })
      ).rejects.toThrow('Not found');
    });
  });

  describe('getUser action', () => {
    it('should retrieve a user by ID', async () => {
      const mockResponse = {
        data: {
          id: 'user-guid-123',
          displayName: 'Alice Smith',
          mail: 'alice@contoso.com',
          userPrincipalName: 'alice@contoso.com',
          jobTitle: 'Engineer',
          department: 'Platform',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await MicrosoftTeams.actions.getUser.handler(mockContext, {
        userId: 'alice@contoso.com',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/users/alice%40contoso.com',
        { params: { $select: 'id,displayName,mail,userPrincipalName,jobTitle,department' } }
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'Microsoft Teams getting user alice@contoso.com'
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should retrieve a user by GUID', async () => {
      const mockResponse = {
        data: {
          id: '00000000-0000-0000-0000-000000000001',
          displayName: 'Bob Jones',
          mail: 'bob@contoso.com',
          userPrincipalName: 'bob@contoso.com',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await MicrosoftTeams.actions.getUser.handler(mockContext, {
        userId: '00000000-0000-0000-0000-000000000001',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/users/00000000-0000-0000-0000-000000000001',
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate user not found errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Resource not found'));

      await expect(
        MicrosoftTeams.actions.getUser.handler(mockContext, { userId: 'unknown@contoso.com' })
      ).rejects.toThrow('Resource not found');
    });
  });

  describe('createChat action', () => {
    it('should create a oneOnOne chat', async () => {
      const mockResponse = {
        data: {
          id: 'new-chat-id-19:abc@thread.v2',
          chatType: 'oneOnOne',
          webUrl: 'https://teams.microsoft.com/l/chat/new-chat-id',
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await MicrosoftTeams.actions.createChat.handler(mockContext, {
        chatType: 'oneOnOne',
        memberIds: ['my-user-guid-123', 'user-guid-456'],
      });

      expect(mockClient.post).toHaveBeenCalledWith('https://graph.microsoft.com/v1.0/chats', {
        chatType: 'oneOnOne',
        members: [
          {
            '@odata.type': '#microsoft.graph.aadUserConversationMember',
            roles: ['owner'],
            'user@odata.bind': "https://graph.microsoft.com/v1.0/users('my-user-guid-123')",
          },
          {
            '@odata.type': '#microsoft.graph.aadUserConversationMember',
            roles: ['owner'],
            'user@odata.bind': "https://graph.microsoft.com/v1.0/users('user-guid-456')",
          },
        ],
      });
      expect(mockContext.log.debug).toHaveBeenCalledWith('Microsoft Teams creating oneOnOne chat');
      expect(result).toEqual(mockResponse.data);
    });

    it('should create a group chat with topic', async () => {
      const mockResponse = {
        data: {
          id: 'group-chat-id',
          chatType: 'group',
          topic: 'Incident Response',
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await MicrosoftTeams.actions.createChat.handler(mockContext, {
        chatType: 'group',
        memberIds: ['my-user-id', 'user-a', 'user-b'],
        topic: 'Incident Response',
      });

      expect(mockClient.post).toHaveBeenCalledWith('https://graph.microsoft.com/v1.0/chats', {
        chatType: 'group',
        members: [
          {
            '@odata.type': '#microsoft.graph.aadUserConversationMember',
            roles: ['owner'],
            'user@odata.bind': "https://graph.microsoft.com/v1.0/users('my-user-id')",
          },
          {
            '@odata.type': '#microsoft.graph.aadUserConversationMember',
            roles: ['owner'],
            'user@odata.bind': "https://graph.microsoft.com/v1.0/users('user-a')",
          },
          {
            '@odata.type': '#microsoft.graph.aadUserConversationMember',
            roles: ['owner'],
            'user@odata.bind': "https://graph.microsoft.com/v1.0/users('user-b')",
          },
        ],
        topic: 'Incident Response',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should not include topic when not provided', async () => {
      mockClient.post.mockResolvedValue({ data: { id: 'chat-no-topic' } });

      await MicrosoftTeams.actions.createChat.handler(mockContext, {
        chatType: 'group',
        memberIds: ['my-user-id', 'user-a', 'user-b'],
      });

      const callArgs = mockClient.post.mock.calls[0];
      expect(callArgs[1]).not.toHaveProperty('topic');
    });

    it('should encode special characters in member user IDs', async () => {
      mockClient.post.mockResolvedValue({ data: { id: 'chat-encoded' } });

      await MicrosoftTeams.actions.createChat.handler(mockContext, {
        chatType: 'oneOnOne',
        memberIds: ['me@contoso.com', 'alice@contoso.com'],
      });

      const callArgs = mockClient.post.mock.calls[0];
      const member = callArgs[1].members[1];
      expect(member['user@odata.bind']).toBe(
        "https://graph.microsoft.com/v1.0/users('alice%40contoso.com')"
      );
    });

    it('should propagate API errors', async () => {
      mockClient.post.mockRejectedValue(new Error('BadRequest'));

      await expect(
        MicrosoftTeams.actions.createChat.handler(mockContext, {
          chatType: 'oneOnOne',
          memberIds: ['my-user-id', 'user-x'],
        })
      ).rejects.toThrow('BadRequest');
    });
  });

  describe('auth scope includes write permissions', () => {
    it('ears scope includes ChannelMessage.Send and Chat.ReadWrite', () => {
      const earsType = MicrosoftTeams.auth?.types.find(
        (t) => typeof t === 'object' && t.type === 'ears'
      ) as { defaults?: { scope?: string } } | undefined;
      const scope = earsType?.defaults?.scope ?? '';
      expect(scope).toContain('ChannelMessage.Send');
      expect(scope).toContain('Chat.ReadWrite');
    });

    it('oauth_authorization_code scope includes ChannelMessage.Send and Chat.ReadWrite', () => {
      const oauthType = MicrosoftTeams.auth?.types.find(
        (t) => typeof t === 'object' && t.type === 'oauth_authorization_code'
      ) as { defaults?: { scope?: string } } | undefined;
      const scope = oauthType?.defaults?.scope ?? '';
      expect(scope).toContain('ChannelMessage.Send');
      expect(scope).toContain('Chat.ReadWrite');
    });
  });

  describe('test handler', () => {
    const testSpec = MicrosoftTeams.test;

    it('should use /me/joinedTeams for delegated auth (bearer)', async () => {
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

      const result = await testSpec.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/me/joinedTeams',
        { params: { $select: 'id,displayName' } }
      );
      expect(result).toEqual({});
    });

    it('should use /me/joinedTeams for oauth_authorization_code (delegated) auth', async () => {
      const oauthCodeContext = {
        ...mockContext,
        secrets: { authType: 'oauth_authorization_code' },
      } as unknown as ActionContext;

      const mockResponse = {
        data: {
          value: [{ id: 'team-1', displayName: 'Engineering' }],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await testSpec.handler(oauthCodeContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/me/joinedTeams',
        { params: { $select: 'id,displayName' } }
      );
      expect(result).toEqual({});
    });

    it('should use /teams for app-only auth (oauth_client_credentials)', async () => {
      const appOnlyContext = {
        ...mockContext,
        secrets: { authType: 'oauth_client_credentials' },
      } as unknown as ActionContext;

      const mockResponse = {
        data: {
          value: [
            { id: 'team-1', displayName: 'Engineering' },
            { id: 'team-2', displayName: 'Marketing' },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await testSpec.handler(appOnlyContext);

      expect(mockClient.get).toHaveBeenCalledWith('https://graph.microsoft.com/v1.0/teams', {
        params: { $select: 'id,displayName' },
      });
      expect(result).toEqual({});
    });

    it('should use /teams for app-only auth (oauth_client_credentials_private_key_jwt)', async () => {
      const pkjwtContext = {
        ...mockContext,
        secrets: { authType: 'oauth_client_credentials_private_key_jwt' },
      } as unknown as ActionContext;

      mockClient.get.mockResolvedValue({ data: { value: [{ id: 'team-1' }] } });

      const result = await testSpec.handler(pkjwtContext);

      expect(mockClient.get).toHaveBeenCalledWith('https://graph.microsoft.com/v1.0/teams', {
        params: { $select: 'id,displayName' },
      });
      expect(result).toEqual({});
    });

    it('should handle zero teams', async () => {
      const mockResponse = {
        data: { value: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await testSpec.handler(mockContext);

      expect(result).toEqual({});
    });

    it('should throw when Graph API response is missing value array', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await expect(testSpec.handler(mockContext)).rejects.toThrow(
        'Unexpected Graph API response: missing value array'
      );
    });

    it('should throw on invalid credentials', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid credentials'));

      await expect(testSpec.handler(mockContext)).rejects.toThrow();
    });

    it('should throw on network timeout', async () => {
      mockClient.get.mockRejectedValue(new Error('Network timeout'));

      await expect(testSpec.handler(mockContext)).rejects.toThrow();
    });

    it('should throw on non-Error rejection (plain string)', async () => {
      mockClient.get.mockRejectedValue('string error');

      await expect(testSpec.handler(mockContext)).rejects.toBeDefined();
    });
  });
});
