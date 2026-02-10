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

const SLACK_API_BASE = 'https://slack.com/api';

/**
 * Slack connector using OAuth2 Authorization Code flow.
 *
 * Required Slack App scopes:
 * - channels:read,channels:history - to list channels and read message history
 * - groups:read,groups:history - to list private channels and read history
 * - im:read,im:history - to list DMs and read history
 * - mpim:read,mpim:history - to list group DMs and read history
 * - chat:write - for sending messages
 */
export const Slack: ConnectorSpec = {
  metadata: {
    id: '.slack2',
    displayName: 'Slack (v2)',
    description: i18n.translate('core.kibanaConnectorSpecs.slack.metadata.description', {
      defaultMessage: 'List channels, fetch message history, and send messages to Slack channels',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: [
      {
        type: 'oauth_authorization_code',
        defaults: {
          authorizationUrl: 'https://slack.com/oauth/v2/authorize',
          tokenUrl: 'https://slack.com/api/oauth.v2.access',
          scope:
            'channels:read,channels:history,groups:read,groups:history,im:read,im:history,mpim:read,mpim:history,chat:write',
          useBasicAuth: false, // Slack uses POST body for client credentials
        },
        overrides: {
          meta: {
            scope: { hidden: true },
            authorizationUrl: { hidden: true },
            tokenUrl: { hidden: true },
          },
        },
      },
    ],
  },

  // No additional configuration needed beyond OAuth credentials
  schema: z.object({}),

  actions: {
    // https://api.slack.com/methods/conversations.list
    listConversations: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.listConversations.description',
        {
          defaultMessage: 'List conversations (channels, DMs, group DMs) in Slack',
        }
      ),
      input: z.object({
        types: z
          .string()
          .optional()
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.slack.actions.listConversations.input.types.description',
              {
                defaultMessage:
                  'Comma-separated conversation types (e.g. public_channel,private_channel,im,mpim)',
              }
            )
          ),
        excludeArchived: z
          .boolean()
          .optional()
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.slack.actions.listConversations.input.excludeArchived.description',
              {
                defaultMessage: 'Exclude archived conversations',
              }
            )
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .optional()
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.slack.actions.listConversations.input.limit.description',
              {
                defaultMessage: 'Maximum number of results to return (1-1000)',
              }
            )
          ),
        cursor: z
          .string()
          .optional()
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.slack.actions.listConversations.input.cursor.description',
              {
                defaultMessage: 'Pagination cursor from a previous response',
              }
            )
          ),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          types?: string;
          excludeArchived?: boolean;
          limit?: number;
          cursor?: string;
        };

        const params = new URLSearchParams();

        if (typedInput.types) {
          params.append('types', typedInput.types);
        }
        if (typedInput.excludeArchived !== undefined) {
          params.append('exclude_archived', typedInput.excludeArchived ? 'true' : 'false');
        }
        if (typedInput.limit) {
          params.append('limit', typedInput.limit.toString());
        }
        if (typedInput.cursor) {
          params.append('cursor', typedInput.cursor);
        }

        try {
          ctx.log.debug(`Slack listConversations request`);
          const response = await ctx.client.get(
            `${SLACK_API_BASE}/conversations.list?${params.toString()}`
          );

          if (!response.data.ok) {
            throw new Error(`Slack API error: ${response.data.error}`);
          }

          return response.data;
        } catch (error) {
          const err = error as {
            message?: string;
            response?: { status?: number; data?: unknown };
          };
          ctx.log.error(
            `Slack listConversations failed: ${err.message}, Status: ${err.response?.status}, Data: ${JSON.stringify(
              err.response?.data
            )}`
          );
          throw error;
        }
      },
    },

    // https://api.slack.com/methods/conversations.history
    getConversationHistory: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.getConversationHistory.description',
        {
          defaultMessage: 'Get message history for a Slack conversation',
        }
      ),
      input: z.object({
        channel: z
          .string()
          .min(1)
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.slack.actions.getConversationHistory.input.channel.description',
              {
                defaultMessage: 'Conversation (channel/DM) ID',
              }
            )
          ),
        oldest: z
          .string()
          .optional()
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.slack.actions.getConversationHistory.input.oldest.description',
              {
                defaultMessage: 'Start of time range (Unix timestamp, string)',
              }
            )
          ),
        latest: z
          .string()
          .optional()
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.slack.actions.getConversationHistory.input.latest.description',
              {
                defaultMessage: 'End of time range (Unix timestamp, string)',
              }
            )
          ),
        inclusive: z
          .boolean()
          .optional()
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.slack.actions.getConversationHistory.input.inclusive.description',
              {
                defaultMessage: 'Include messages with oldest/latest timestamps',
              }
            )
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .optional()
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.slack.actions.getConversationHistory.input.limit.description',
              {
                defaultMessage: 'Maximum number of messages to return (1-1000)',
              }
            )
          ),
        cursor: z
          .string()
          .optional()
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.slack.actions.getConversationHistory.input.cursor.description',
              {
                defaultMessage: 'Pagination cursor from a previous response',
              }
            )
          ),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          channel: string;
          oldest?: string;
          latest?: string;
          inclusive?: boolean;
          limit?: number;
          cursor?: string;
        };

        const params = new URLSearchParams({
          channel: typedInput.channel,
        });

        if (typedInput.oldest) params.append('oldest', typedInput.oldest);
        if (typedInput.latest) params.append('latest', typedInput.latest);
        if (typedInput.inclusive !== undefined) {
          params.append('inclusive', typedInput.inclusive ? 'true' : 'false');
        }
        if (typedInput.limit) params.append('limit', typedInput.limit.toString());
        if (typedInput.cursor) params.append('cursor', typedInput.cursor);

        try {
          ctx.log.debug(`Slack getConversationHistory request: channel=${typedInput.channel}`);
          const response = await ctx.client.get(
            `${SLACK_API_BASE}/conversations.history?${params.toString()}`
          );

          if (!response.data.ok) {
            throw new Error(`Slack API error: ${response.data.error}`);
          }

          return response.data;
        } catch (error) {
          const err = error as {
            message?: string;
            response?: { status?: number; data?: unknown };
          };
          ctx.log.error(
            `Slack getConversationHistory failed: ${err.message}, Status: ${
              err.response?.status
            }, Data: ${JSON.stringify(err.response?.data)}`
          );
          throw error;
        }
      },
    },

    // https://api.slack.com/methods/chat.postMessage
    sendMessage: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.sendMessage.description',
        {
          defaultMessage: 'Send a message to a Slack channel',
        }
      ),
      input: z.object({
        channel: z
          .string()
          .min(1)
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.slack.actions.sendMessage.input.channel.description',
              {
                defaultMessage: 'Channel ID, user ID, or conversation ID to send the message to',
              }
            )
          ),
        text: z
          .string()
          .min(1)
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.slack.actions.sendMessage.input.text.description',
              {
                defaultMessage: 'The message text to send',
              }
            )
          ),
        threadTs: z
          .string()
          .optional()
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.slack.actions.sendMessage.input.threadTs.description',
              {
                defaultMessage:
                  'Timestamp of another message to reply to (creates a threaded reply)',
              }
            )
          ),
        unfurlLinks: z
          .boolean()
          .optional()
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.slack.actions.sendMessage.input.unfurlLinks.description',
              {
                defaultMessage: 'Whether to enable unfurling of primarily text-based content',
              }
            )
          ),
        unfurlMedia: z
          .boolean()
          .optional()
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.slack.actions.sendMessage.input.unfurlMedia.description',
              {
                defaultMessage: 'Whether to enable unfurling of media content',
              }
            )
          ),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          channel: string;
          text: string;
          threadTs?: string;
          unfurlLinks?: boolean;
          unfurlMedia?: boolean;
        };

        const payload: Record<string, unknown> = {
          channel: typedInput.channel,
          text: typedInput.text,
        };

        if (typedInput.threadTs) {
          payload.thread_ts = typedInput.threadTs;
        }
        if (typedInput.unfurlLinks !== undefined) {
          payload.unfurl_links = typedInput.unfurlLinks;
        }
        if (typedInput.unfurlMedia !== undefined) {
          payload.unfurl_media = typedInput.unfurlMedia;
        }

        try {
          ctx.log.debug(`Slack sendMessage request: channel=${typedInput.channel}`);
          const response = await ctx.client.post(`${SLACK_API_BASE}/chat.postMessage`, payload, {
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
            },
          });

          if (!response.data.ok) {
            throw new Error(`Slack API error: ${response.data.error}`);
          }

          return response.data;
        } catch (error) {
          const err = error as {
            message?: string;
            response?: { status?: number; data?: unknown };
          };
          ctx.log.error(
            `Slack sendMessage failed: ${err.message}, Status: ${err.response?.status}, Data: ${JSON.stringify(
              err.response?.data
            )}`
          );
          throw error;
        }
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.slack.test.description', {
      defaultMessage: 'Verifies Slack connection by checking API access',
    }),
    handler: async (ctx) => {
      ctx.log.debug('Slack test handler');

      try {
        // Test connection by calling auth.test which validates the token
        const response = await ctx.client.post(`${SLACK_API_BASE}/auth.test`);

        if (!response.data.ok) {
          return {
            ok: false,
            message: `Slack API error: ${response.data.error}`,
          };
        }

        const teamName = response.data.team || 'Unknown';
        return {
          ok: true,
          message: i18n.translate('core.kibanaConnectorSpecs.slack.test.successMessage', {
            defaultMessage: 'Successfully connected to Slack workspace: {teamName}',
            values: { teamName },
          }),
        };
      } catch (error) {
        const err = error as { message?: string };
        return { ok: false, message: err.message ?? 'Unknown error' };
      }
    },
  },
};
