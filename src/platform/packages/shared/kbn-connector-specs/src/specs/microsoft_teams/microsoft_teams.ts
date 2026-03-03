/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';

/**
 * Returns the base path for user-scoped Microsoft Graph API endpoints.
 * When a userId is provided, returns `/users/{userId}` (for app-only auth).
 * Otherwise, returns `/me` (for delegated auth with a signed-in user).
 */
const userPath = (userId?: string): string => (userId ? `/users/${userId}` : '/me');

/**
 * Common output schema for Microsoft Graph API responses that return a collection.
 */
const GraphCollectionOutputSchema = z.object({
  value: z.array(z.any()).describe('Array of items returned from the API'),
  '@odata.nextLink': z.string().optional().describe('URL to fetch next page of results'),
});

export const MicrosoftTeams: ConnectorSpec = {
  metadata: {
    id: '.microsoft-teams',
    displayName: 'Microsoft Teams (NEW)',
    description: i18n.translate('core.kibanaConnectorSpecs.microsoftTeams.metadata.description', {
      defaultMessage: 'Search Microsoft Teams channels, chats, and teams',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: [
      {
        type: 'bearer',
        defaults: {},
        overrides: {
          meta: {
            token: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.microsoftTeams.auth.bearer.token.label',
                { defaultMessage: 'Microsoft API token' }
              ),
              placeholder: 'abcde...',
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.microsoftTeams.auth.bearer.token.helpText',
                {
                  defaultMessage:
                    'A Microsoft Bearer token obtained via delegated OAuth flow (for example, a user access token).',
                }
              ),
            },
          },
        },
      },
      {
        type: 'oauth_client_credentials',
        defaults: {
          scope: 'https://graph.microsoft.com/.default',
          tokenUrl: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token',
        },
        overrides: {
          meta: {
            scope: { hidden: true },
          },
        },
      },
    ],
  },

  actions: {
    // https://learn.microsoft.com/en-us/graph/api/user-list-joinedteams
    listJoinedTeams: {
      isTool: true,
      input: z
        .object({
          userId: z
            .string()
            .optional()
            .describe('User ID (required for app-only auth via client credentials)'),
        })
        .optional(),
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input) => {
        const typedInput = input as { userId?: string } | undefined;
        const base = userPath(typedInput?.userId);
        ctx.log.debug('Microsoft Teams listing joined teams');
        const response = await ctx.client.get(
          `https://graph.microsoft.com/v1.0${base}/joinedTeams`,
          {
            params: {
              $select: 'id,displayName,description,isArchived,tenantId',
            },
          }
        );
        return response.data;
      },
    },

    // https://learn.microsoft.com/en-us/graph/api/channel-list
    listChannels: {
      isTool: true,
      input: z.object({
        teamId: z.string().describe('The ID of the team'),
      }),
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input) => {
        const typedInput = input as { teamId: string };
        ctx.log.debug(`Microsoft Teams listing channels for team ${typedInput.teamId}`);
        const response = await ctx.client.get(
          `https://graph.microsoft.com/v1.0/teams/${typedInput.teamId}/channels`,
          {
            params: {
              $select: 'id,displayName,description,createdDateTime,membershipType,webUrl',
            },
          }
        );
        return response.data;
      },
    },

    // https://learn.microsoft.com/en-us/graph/api/channel-list-messages
    listChannelMessages: {
      isTool: true,
      input: z.object({
        teamId: z.string().describe('The ID of the team'),
        channelId: z.string().describe('The ID of the channel'),
        top: z.number().optional().describe('Number of messages to return (max 50)'),
      }),
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input) => {
        const typedInput = input as {
          teamId: string;
          channelId: string;
          top?: number;
        };
        ctx.log.debug(
          `Microsoft Teams listing messages for channel ${typedInput.channelId} in team ${typedInput.teamId}`
        );
        const response = await ctx.client.get(
          `https://graph.microsoft.com/v1.0/teams/${typedInput.teamId}/channels/${typedInput.channelId}/messages`,
          {
            params: {
              ...(typedInput.top !== undefined && { $top: typedInput.top }),
            },
          }
        );
        return response.data;
      },
    },

    // https://learn.microsoft.com/en-us/graph/api/chat-list
    listChats: {
      isTool: true,
      input: z.object({
        userId: z
          .string()
          .optional()
          .describe('User ID (required for app-only auth via client credentials)'),
        top: z.number().optional().describe('Number of chats to return (max 50)'),
      }),
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input) => {
        const typedInput = input as { userId?: string; top?: number };
        const base = userPath(typedInput.userId);
        ctx.log.debug('Microsoft Teams listing chats');
        const response = await ctx.client.get(`https://graph.microsoft.com/v1.0${base}/chats`, {
          params: {
            $select: 'id,topic,createdDateTime,lastUpdatedDateTime,chatType,webUrl',
            ...(typedInput.top !== undefined && { $top: typedInput.top }),
          },
        });
        return response.data;
      },
    },

    // https://learn.microsoft.com/en-us/graph/api/chat-list-messages
    listChatMessages: {
      isTool: true,
      input: z.object({
        chatId: z.string().describe('The ID of the chat'),
        top: z.number().optional().describe('Number of messages to return (max 50)'),
      }),
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input) => {
        const typedInput = input as { chatId: string; top?: number };
        ctx.log.debug(`Microsoft Teams listing messages for chat ${typedInput.chatId}`);
        const response = await ctx.client.get(
          `https://graph.microsoft.com/v1.0/chats/${typedInput.chatId}/messages`,
          {
            params: {
              ...(typedInput.top !== undefined && { $top: typedInput.top }),
            },
          }
        );
        return response.data;
      },
    },

    // https://learn.microsoft.com/en-us/graph/search-concept-chat-messages
    searchMessages: {
      isTool: true,
      input: z.object({
        query: z
          .string()
          .describe('Search query (supports KQL syntax, e.g. "from:bob sent>2024-01-01")'),
        from: z.number().optional().describe('Offset for pagination'),
        size: z.number().optional().describe('Number of results to return (max 25)'),
        enableTopResults: z.boolean().optional().describe('Sort results by relevance'),
      }),
      output: z
        .object({
          value: z
            .array(
              z.object({
                hitsContainers: z
                  .array(z.any())
                  .describe('Containers with search hits and associated metadata'),
              })
            )
            .describe('Search response containers'),
        })
        .describe('Microsoft Graph Search API response'),
      handler: async (ctx, input) => {
        const typedInput = input as {
          query: string;
          from?: number;
          size?: number;
          enableTopResults?: boolean;
        };

        const searchRequest = {
          requests: [
            {
              entityTypes: ['chatMessage'],
              query: {
                queryString: typedInput.query,
              },
              ...(typedInput.from !== undefined && { from: typedInput.from }),
              ...(typedInput.size !== undefined && { size: typedInput.size }),
              ...(typedInput.enableTopResults !== undefined && {
                enableTopResults: typedInput.enableTopResults,
              }),
            },
          ],
        };

        ctx.log.debug(`Microsoft Teams searching messages: ${JSON.stringify(typedInput.query)}`);
        const response = await ctx.client.post(
          'https://graph.microsoft.com/v1.0/search/query',
          searchRequest
        );
        return response.data;
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.microsoftTeams.test.description', {
      defaultMessage: 'Verifies Microsoft Teams connection by listing joined teams',
    }),
    handler: async (ctx) => {
      ctx.log.debug('Microsoft Teams test handler');

      try {
        const isAppOnly = ctx.secrets?.authType === 'oauth_client_credentials';
        const url = isAppOnly
          ? 'https://graph.microsoft.com/v1.0/teams'
          : 'https://graph.microsoft.com/v1.0/me/joinedTeams';

        const response = await ctx.client.get(url, {
          params: { $select: 'id,displayName' },
        });
        const numOfTeams = response.data.value.length;
        return {
          ok: true,
          message: `Successfully connected to Microsoft Teams: found ${numOfTeams} teams`,
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { ok: false, message };
      }
    },
  },
};
