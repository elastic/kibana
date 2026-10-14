/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import {
  ListJoinedTeamsInputSchema,
  ListChannelsInputSchema,
  ListChannelMessagesInputSchema,
  ListChatsInputSchema,
  ListChatMessagesInputSchema,
  SearchMessagesInputSchema,
  SendChannelMessageInputSchema,
  SendChatMessageInputSchema,
  UpdateMessageInputSchema,
  GetUserInputSchema,
  CreateChatInputSchema,
} from './types';
import type {
  ListJoinedTeamsInput,
  ListChannelsInput,
  ListChannelMessagesInput,
  ListChatsInput,
  ListChatMessagesInput,
  SearchMessagesInput,
  SendChannelMessageInput,
  SendChatMessageInput,
  UpdateMessageInput,
  GetUserInput,
  CreateChatInput,
} from './types';
const userPath = (userId?: string): string =>
  userId ? `/users/${encodeURIComponent(userId)}` : '/me';

type AppOnlyAuthType = 'oauth_client_credentials' | 'oauth_client_credentials_private_key_jwt';
const isAppOnlyAuth = (authType?: unknown): authType is AppOnlyAuthType =>
  authType === 'oauth_client_credentials' ||
  authType === 'oauth_client_credentials_private_key_jwt';

const GraphCollectionOutputSchema = lazySchema(() =>
  z.object({
    value: z.array(z.any()).describe('Array of items returned from the API'),
    '@odata.nextLink': z.string().optional().describe('URL to fetch next page of results'),
  })
);

export const MicrosoftTeams: ConnectorSpec = {
  metadata: {
    id: '.microsoft-teams',
    displayName: 'Microsoft Teams (v2)',
    description: i18n.translate('core.kibanaConnectorSpecs.microsoftTeams.metadata.description', {
      defaultMessage:
        'Send messages to channels and chats, search conversations, and list teams, channels, and chats in Microsoft Teams',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder', 'contextEngine'],
  },

  auth: {
    types: [
      {
        type: 'ears',
        isRecommended: true,
        overrides: {
          meta: { scope: { disabled: true } },
        },
        defaults: {
          provider: 'microsoft',
          scope:
            'Team.ReadBasic.All Channel.ReadBasic.All Chat.Read ChannelMessage.Read.All offline_access ChannelMessage.Send Chat.ReadWrite',
        },
      },
      {
        type: 'oauth_authorization_code',
        defaults: {
          scope:
            'Team.ReadBasic.All Channel.ReadBasic.All Chat.Read ChannelMessage.Read.All offline_access ChannelMessage.Send Chat.ReadWrite',
        },
        overrides: {
          meta: {
            scope: { hidden: true },
            authorizationUrl: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.microsoftTeams.auth.oauthAuthCode.authorizationUrl.label',
                { defaultMessage: 'Authorization URL' }
              ),
              placeholder: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize',
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.microsoftTeams.auth.oauthAuthCode.authorizationUrl.helpText',
                {
                  defaultMessage:
                    "Replace '{tenantId}' with your Azure AD tenant ID. For example: https://login.microsoftonline.com/your-tenant-id/oauth2/v2.0/authorize",
                  values: { tenantId: '{tenant-id}' },
                }
              ),
            },
            tokenUrl: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.microsoftTeams.auth.oauthAuthCode.tokenUrl.label',
                { defaultMessage: 'Token URL' }
              ),
              placeholder: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token',
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.microsoftTeams.auth.oauthAuthCode.tokenUrl.helpText',
                {
                  defaultMessage:
                    "Replace '{tenantId}' with your Azure AD tenant ID. For example: https://login.microsoftonline.com/your-tenant-id/oauth2/v2.0/token",
                  values: { tenantId: '{tenant-id}' },
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
                    "Replace '{tenantId}' with your Azure AD tenant ID. For example: https://login.microsoftonline.com/your-tenant-id/oauth2/v2.0/token",
                  values: { tenantId: '{tenant-id}' },
                }
              ),
            },
          },
        },
      },
      {
        type: 'oauth_client_credentials_private_key_jwt',
        defaults: {
          scope: 'https://graph.microsoft.com/.default',
          algorithm: 'PS256',
          certificateBinding: 'x5t#S256',
        },
        overrides: {
          meta: {
            scope: { hidden: true },
            tokenUrl: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.microsoftTeams.auth.privateKeyJwt.tokenUrl.label',
                { defaultMessage: 'Token URL' }
              ),
              placeholder: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token',
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.microsoftTeams.auth.privateKeyJwt.tokenUrl.helpText',
                {
                  defaultMessage:
                    "Replace '{tenantId}' with your Azure AD tenant ID. For example: https://login.microsoftonline.com/your-tenant-id/oauth2/v2.0/token",
                  values: { tenantId: '{tenant-id}' },
                }
              ),
            },
          },
        },
      },
      // Hidden, but retained so existing connectors created with bearer (delegated)
      // auth continue to pass schema validation. The runtime handler still supports
      // bearer as a delegated auth mode; it is no longer offered in the picker.
      { type: 'bearer', isLegacy: true, defaults: {} },
    ],
  },

  actions: {
    // https://learn.microsoft.com/en-us/graph/api/user-list-joinedteams
    listJoinedTeams: {
      isTool: true,
      scope: 'read',
      description:
        "List the Microsoft Teams that the authenticated user (or a specified user) has joined. Use this to discover available teams before drilling into channels or messages. With delegated auth (bearer token or OAuth authorization code), omit userId to list the signed-in user's teams. With app-only auth (client credentials), userId is required.",
      input: ListJoinedTeamsInputSchema,
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input: ListJoinedTeamsInput) => {
        if (isAppOnlyAuth(ctx.secrets?.authType) && !input?.userId) {
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
      scope: 'read',
      description:
        'List all channels in a Microsoft Teams team. Use this to discover channel IDs before fetching messages with listChannelMessages. Requires the team ID (obtainable via listJoinedTeams).',
      input: ListChannelsInputSchema,
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input: ListChannelsInput) => {
        ctx.log.debug(`Microsoft Teams listing channels for team ${input.teamId}`);
        const response = await ctx.client.get(
          `https://graph.microsoft.com/v1.0/teams/${encodeURIComponent(input.teamId)}/channels`,
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
      scope: 'read',
      description:
        'Retrieve recent messages from a Microsoft Teams channel. Returns message content, sender, timestamp, and web URL for each message. Use listJoinedTeams and listChannels first to obtain teamId and channelId. Use the top parameter to control how many messages are returned (max 50).',
      input: ListChannelMessagesInputSchema,
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input: ListChannelMessagesInput) => {
        ctx.log.debug(
          `Microsoft Teams listing messages for channel ${input.channelId} in team ${input.teamId}`
        );
        const response = await ctx.client.get(
          `https://graph.microsoft.com/v1.0/teams/${encodeURIComponent(
            input.teamId
          )}/channels/${encodeURIComponent(input.channelId)}/messages`,
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
      scope: 'read',
      description:
        'List Microsoft Teams chats (direct messages and group chats) for the authenticated user or a specified user. Use this to discover chat IDs before fetching messages with listChatMessages. With delegated auth (bearer token or OAuth authorization code), omit userId. With app-only auth (client credentials), userId is required.',
      input: ListChatsInputSchema,
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input: ListChatsInput) => {
        if (isAppOnlyAuth(ctx.secrets?.authType) && !input.userId) {
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
      scope: 'read',
      description:
        'Retrieve recent messages from a Microsoft Teams direct message or group chat. Returns message content, sender, timestamp, and web URL. Use listChats first to obtain the chatId. Use the top parameter to control how many messages are returned (max 50).',
      input: ListChatMessagesInputSchema,
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input: ListChatMessagesInput) => {
        ctx.log.debug(`Microsoft Teams listing messages for chat ${input.chatId}`);
        const response = await ctx.client.get(
          `https://graph.microsoft.com/v1.0/chats/${encodeURIComponent(input.chatId)}/messages`,
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
      scope: 'read',
      description:
        'Search Teams messages using the Microsoft Graph Search API. Requires delegated authentication (bearer token or OAuth authorization code). Not supported with app-only (client credentials) auth — Microsoft does not allow application permissions for chatMessage search.',
      input: SearchMessagesInputSchema,
      output: lazySchema(() =>
        z
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
          .describe('Microsoft Graph Search API response')
      ),
      handler: async (ctx, input: SearchMessagesInput) => {
        if (isAppOnlyAuth(ctx.secrets?.authType)) {
          throw new Error(
            'searchMessages requires delegated authentication (bearer token or OAuth authorization code). ' +
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

    // https://learn.microsoft.com/en-us/graph/api/channel-post-messages
    sendChannelMessage: {
      isTool: true,
      scope: 'write',
      description:
        'Post a new message to a Microsoft Teams channel. Returns the created message object including its id and webUrl. Use listJoinedTeams → listChannels to obtain teamId and channelId. Requires ChannelMessage.Send delegated permission or ChannelMessage.ReadWrite.All application permission (for app-only auth, grant via Azure AD app registration).',
      input: SendChannelMessageInputSchema,
      output: lazySchema(() =>
        z
          .object({
            id: z.string().describe('ID of the created message'),
            createdDateTime: z
              .string()
              .optional()
              .describe('ISO 8601 timestamp when the message was created'),
            webUrl: z.string().optional().describe('URL to open the message in Microsoft Teams'),
            from: z.any().optional().describe('Sender information'),
            body: z.any().optional().describe('Message body'),
          })
          .describe('Created Teams channel message')
      ),
      handler: async (ctx, input: SendChannelMessageInput) => {
        ctx.log.debug(
          `Microsoft Teams sending message to channel ${input.channelId} in team ${input.teamId}`
        );
        const requestBody: Record<string, unknown> = {
          body: {
            contentType: input.contentType,
            content: input.content,
          },
        };
        if (input.subject !== undefined) {
          requestBody.subject = input.subject;
        }
        const response = await ctx.client.post(
          `https://graph.microsoft.com/v1.0/teams/${encodeURIComponent(
            input.teamId
          )}/channels/${encodeURIComponent(input.channelId)}/messages`,
          requestBody
        );
        return response.data;
      },
    },

    // https://learn.microsoft.com/en-us/graph/api/chat-post-messages
    sendChatMessage: {
      isTool: true,
      scope: 'write',
      description:
        'Send a message to a Microsoft Teams 1:1 or group chat. Returns the created message object. Use listChats to obtain an existing chatId, or createChat to open a new chat first. With delegated auth (bearer/OAuth authorization code/ears) the sender is the signed-in user. With app-only (client credentials) the tenant admin must grant Chat.ReadWrite.All application permission to the Azure AD app registration.',
      input: SendChatMessageInputSchema,
      output: lazySchema(() =>
        z
          .object({
            id: z.string().describe('ID of the created message'),
            createdDateTime: z
              .string()
              .optional()
              .describe('ISO 8601 timestamp when the message was created'),
            webUrl: z.string().optional().describe('URL to open the message in Microsoft Teams'),
            from: z.any().optional().describe('Sender information'),
            body: z.any().optional().describe('Message body'),
          })
          .describe('Created Teams chat message')
      ),
      handler: async (ctx, input: SendChatMessageInput) => {
        ctx.log.debug(`Microsoft Teams sending message to chat ${input.chatId}`);
        const requestBody = {
          body: {
            contentType: input.contentType,
            content: input.content,
          },
        };
        const response = await ctx.client.post(
          `https://graph.microsoft.com/v1.0/chats/${encodeURIComponent(input.chatId)}/messages`,
          requestBody
        );
        return response.data;
      },
    },

    // https://learn.microsoft.com/en-us/graph/api/chatmessage-update
    updateMessage: {
      isTool: true,
      scope: 'destroy',
      description:
        'Update the body of an existing Teams message. Works for both channel messages (provide teamId + channelId + messageId) and chat messages (provide chatId + messageId). Only the message body content can be changed — sender, timestamp, and other fields are immutable. The API returns no content on success.',
      input: UpdateMessageInputSchema,
      output: lazySchema(() =>
        z
          .object({
            success: z.boolean().describe('true when the message was updated successfully'),
          })
          .describe('Update result')
      ),
      handler: async (ctx, input: UpdateMessageInput) => {
        const requestBody = {
          body: {
            contentType: input.contentType,
            content: input.content,
          },
        };
        let url: string;
        if (input.teamId !== undefined && input.channelId !== undefined) {
          url = `https://graph.microsoft.com/v1.0/teams/${encodeURIComponent(
            input.teamId
          )}/channels/${encodeURIComponent(input.channelId)}/messages/${encodeURIComponent(
            input.messageId
          )}`;
        } else if (input.chatId !== undefined) {
          url = `https://graph.microsoft.com/v1.0/chats/${encodeURIComponent(
            input.chatId
          )}/messages/${encodeURIComponent(input.messageId)}`;
        } else {
          throw new Error(
            'updateMessage requires either teamId + channelId (channel message) or chatId (chat message).'
          );
        }
        ctx.log.debug(`Microsoft Teams updating message ${input.messageId}`);
        await ctx.client.patch(url, requestBody);
        return { success: true };
      },
    },

    // https://learn.microsoft.com/en-us/graph/api/user-get
    getUser: {
      isTool: true,
      scope: 'read',
      description:
        "Retrieve a Microsoft Teams / Azure AD user by their user ID (GUID) or user principal name (UPN, e.g. alice@contoso.com). Returns the user's id, displayName, mail, and userPrincipalName. Use the returned id with createChat or listChats (userId parameter). Works with all auth types.",
      input: GetUserInputSchema,
      output: lazySchema(() =>
        z
          .object({
            id: z.string().describe('Azure AD object ID (GUID) of the user'),
            displayName: z.string().optional().describe('Full display name of the user'),
            mail: z.string().optional().describe('Primary email address'),
            userPrincipalName: z.string().optional().describe('User principal name (UPN)'),
            jobTitle: z.string().optional().describe('Job title'),
            department: z.string().optional().describe('Department'),
          })
          .describe('Azure AD user object')
      ),
      handler: async (ctx, input: GetUserInput) => {
        ctx.log.debug(`Microsoft Teams getting user ${input.userId}`);
        const response = await ctx.client.get(
          `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(input.userId)}`,
          {
            params: {
              $select: 'id,displayName,mail,userPrincipalName,jobTitle,department',
            },
          }
        );
        return response.data;
      },
    },

    // https://learn.microsoft.com/en-us/graph/api/chat-post
    createChat: {
      isTool: true,
      scope: 'write',
      description:
        "Create a new Microsoft Teams chat (1:1 or group). Returns the created chat object with its id, which can be passed to sendChatMessage. For a 1:1 chat, provide both your own user ID and the other person's user ID in memberIds (two total). For a group chat, include your own ID plus two or more other user IDs. Use getUser to resolve an email or UPN to a user ID before calling this action. Note: guest accounts cannot create chats; all members must belong to the tenant.",
      input: CreateChatInputSchema,
      output: lazySchema(() =>
        z
          .object({
            id: z
              .string()
              .describe(
                'ID of the created chat, for use with sendChatMessage and listChatMessages'
              ),
            chatType: z.string().optional().describe('Type of the chat: "oneOnOne" or "group"'),
            webUrl: z.string().optional().describe('URL to open the chat in Microsoft Teams'),
            topic: z.string().optional().describe('Display topic of the chat'),
          })
          .describe('Created Teams chat object')
      ),
      handler: async (ctx, input: CreateChatInput) => {
        ctx.log.debug(`Microsoft Teams creating ${input.chatType} chat`);
        const members = input.memberIds.map((userId) => ({
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: ['owner'],
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${encodeURIComponent(
            userId
          )}')`,
        }));
        const requestBody: Record<string, unknown> = {
          chatType: input.chatType,
          members,
        };
        if (input.topic !== undefined && input.chatType === 'group') {
          requestBody.topic = input.topic;
        }
        const response = await ctx.client.post(
          'https://graph.microsoft.com/v1.0/chats',
          requestBody
        );
        return response.data;
      },
    },
  },

  skill: [
    'Microsoft Teams connector — usage guidance:',
    '',
    'NAVIGATION PATTERNS (read):',
    '- Team channels: listJoinedTeams → listChannels (with teamId) → listChannelMessages (with teamId + channelId)',
    '- Direct/group chats: listChats → listChatMessages (with chatId)',
    '',
    'SEND PATTERNS (write):',
    '- Post to a channel: listJoinedTeams → listChannels → sendChannelMessage (with teamId + channelId + content)',
    '- Send to an existing chat: listChats → sendChatMessage (with chatId + content)',
    "- DM a user by email: getUser (your own UPN/email) + getUser (other person's UPN/email) → createChat (both IDs in memberIds) → sendChatMessage (with returned chatId)",
    '- Update a posted message: updateMessage (with messageId + teamId+channelId for channel, or chatId for chat)',
    '',
    'AUTH DIFFERENCES (delegated vs app-only):',
    '- Delegated auth (bearer token or oauth_authorization_code or ears): userId is optional — omit it to operate as the signed-in user.',
    '- App-only auth (oauth_client_credentials or private_key_jwt): userId is REQUIRED for listJoinedTeams and listChats.',
    '- searchMessages only works with delegated auth; app-only (client credentials) is not supported.',
    '- sendChannelMessage with app-only auth requires the ChannelMessage.ReadWrite.All application permission granted in Azure AD.',
    '- sendChatMessage and createChat with app-only auth require the Chat.ReadWrite.All application permission granted in Azure AD.',
    '- The oauth_client_credentials scope "https://graph.microsoft.com/.default" passes through all permissions granted to the app registration — no scope change needed, but the permissions must be granted by the tenant admin.',
  ].join('\n'),

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.microsoftTeams.test.description', {
      defaultMessage: 'Verifies Microsoft Teams connection by listing joined teams',
    }),
    handler: async (ctx) => {
      ctx.log.debug('Microsoft Teams test handler');
      const url = isAppOnlyAuth(ctx.secrets?.authType)
        ? 'https://graph.microsoft.com/v1.0/teams'
        : 'https://graph.microsoft.com/v1.0/me/joinedTeams';
      const response = await ctx.client.get(url, {
        params: { $select: 'id,displayName' },
      });
      if (!response?.data || !Array.isArray(response.data.value)) {
        throw new Error('Unexpected Graph API response: missing value array');
      }
      return {};
    },
  },
};
