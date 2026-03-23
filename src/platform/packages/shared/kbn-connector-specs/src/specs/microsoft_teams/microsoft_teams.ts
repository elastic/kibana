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
import {
  ListJoinedTeamsInputSchema,
  ListChannelsInputSchema,
  ListChannelMessagesInputSchema,
  ListChatsInputSchema,
  ListChatMessagesInputSchema,
  SearchMessagesInputSchema,
} from './types';
import type {
  ListJoinedTeamsInput,
  ListChannelsInput,
  ListChannelMessagesInput,
  ListChatsInput,
  ListChatMessagesInput,
  SearchMessagesInput,
} from './types';

/**
 * Returns the base path for user-scoped Microsoft Graph API endpoints.
 * When a userId is provided, returns `/users/{userId}` (for app-only auth).
 * Otherwise, returns `/me` (for delegated auth with a signed-in user).
 */
const userPath = (userId?: string): string => (userId ? `/users/${userId}` : '/me');

const GraphCollectionOutputSchema = z.object({
  value: z.array(z.any()).describe('Array of items returned from the API'),
  '@odata.nextLink': z.string().optional().describe('URL to fetch next page of results'),
});

export const MicrosoftTeams: ConnectorSpec = {
  metadata: {
    id: '.microsoft-teams',
    displayName: 'Microsoft Teams (v2)',
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
        },
        overrides: {
          meta: {
            scope: { hidden: true },
            tokenUrl: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.microsoftTeams.auth.oauth.tokenUrl.label',
                { defaultMessage: 'Token URL' }
              ),
              placeholder: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token',
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.microsoftTeams.auth.oauth.tokenUrl.helpText',
                {
                  defaultMessage:
                    'Replace {tenant-id} with your Azure AD tenant ID. For example: https://login.microsoftonline.com/your-tenant-id/oauth2/v2.0/token',
                }
              ),
            },
          },
        },
      },
    ],
  },

  actions: {
    // https://learn.microsoft.com/en-us/graph/api/user-list-joinedteams
    listJoinedTeams: {
      isTool: true,
      input: ListJoinedTeamsInputSchema,
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input: ListJoinedTeamsInput) => {
        if (ctx.secrets?.authType === 'oauth_client_credentials' && !input?.userId) {
          throw new Error(
            'listJoinedTeams requires a userId when using app-only (client credentials) auth. ' +
              'Provide the userId of the user whose teams you want to list.'
          );
        }
        const base = userPath(input?.userId);
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
      input: ListChannelsInputSchema,
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input: ListChannelsInput) => {
        ctx.log.debug(`Microsoft Teams listing channels for team ${input.teamId}`);
        const response = await ctx.client.get(
          `https://graph.microsoft.com/v1.0/teams/${input.teamId}/channels`,
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
      input: ListChannelMessagesInputSchema,
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input: ListChannelMessagesInput) => {
        ctx.log.debug(
          `Microsoft Teams listing messages for channel ${input.channelId} in team ${input.teamId}`
        );
        const response = await ctx.client.get(
          `https://graph.microsoft.com/v1.0/teams/${input.teamId}/channels/${input.channelId}/messages`,
          {
            params: {
              ...(input.top !== undefined && { $top: input.top }),
            },
          }
        );
        return response.data;
      },
    },

    // https://learn.microsoft.com/en-us/graph/api/chat-list
    listChats: {
      isTool: true,
      input: ListChatsInputSchema,
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input: ListChatsInput) => {
        if (ctx.secrets?.authType === 'oauth_client_credentials' && !input.userId) {
          throw new Error(
            'listChats requires a userId when using app-only (client credentials) auth. ' +
              'Provide the userId of the user whose chats you want to list.'
          );
        }
        const base = userPath(input.userId);
        ctx.log.debug('Microsoft Teams listing chats');
        const response = await ctx.client.get(`https://graph.microsoft.com/v1.0${base}/chats`, {
          params: {
            $select: 'id,topic,createdDateTime,lastUpdatedDateTime,chatType,webUrl',
            ...(input.top !== undefined && { $top: input.top }),
          },
        });
        return response.data;
      },
    },

    // https://learn.microsoft.com/en-us/graph/api/chat-list-messages
    listChatMessages: {
      isTool: true,
      input: ListChatMessagesInputSchema,
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input: ListChatMessagesInput) => {
        ctx.log.debug(`Microsoft Teams listing messages for chat ${input.chatId}`);
        const response = await ctx.client.get(
          `https://graph.microsoft.com/v1.0/chats/${input.chatId}/messages`,
          {
            params: {
              ...(input.top !== undefined && { $top: input.top }),
            },
          }
        );
        return response.data;
      },
    },

    // https://learn.microsoft.com/en-us/graph/search-concept-chat-messages
    searchMessages: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.microsoftTeams.actions.searchMessages.description',
        {
          defaultMessage:
            'Search Teams messages using the Microsoft Graph Search API. Requires delegated authentication (bearer token). Not supported with app-only (client credentials) auth — Microsoft does not allow application permissions for chatMessage search.',
        }
      ),
      input: SearchMessagesInputSchema,
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
      handler: async (ctx, input: SearchMessagesInput) => {
        if (ctx.secrets?.authType === 'oauth_client_credentials') {
          throw new Error(
            'searchMessages requires delegated authentication (bearer token). ' +
              'Microsoft Graph does not support app-only (client credentials) access ' +
              'to the /search/query API for chatMessage entities.'
          );
        }

        const searchRequest = {
          requests: [
            {
              entityTypes: ['chatMessage'],
              query: {
                queryString: input.query,
              },
              ...(input.from !== undefined && { from: input.from }),
              ...(input.size !== undefined && { size: input.size }),
              ...(input.enableTopResults !== undefined && {
                enableTopResults: input.enableTopResults,
              }),
            },
          ],
        };

        ctx.log.debug('Microsoft Teams searching messages');
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
        if (!response?.data || !Array.isArray(response.data.value)) {
          return {
            ok: false,
            message: 'Unexpected Graph API response: missing value array',
          };
        }
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
