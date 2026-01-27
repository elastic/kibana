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
 * - search:read - for searching messages
 * - chat:write - for sending messages
 */
export const Slack: ConnectorSpec = {
  metadata: {
    id: '.slack2',
    displayName: 'Slack (v2)',
    description: i18n.translate('core.kibanaConnectorSpecs.slack.metadata.description', {
      defaultMessage: 'Search messages and send messages to Slack channels',
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
          scope: 'search:read',
          scopeQueryParam: 'user_scope', // Slack OAuth v2 uses 'user_scope' for user token scopes
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
    // https://api.slack.com/methods/search.messages
    searchMessages: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.searchMessages.description',
        {
          defaultMessage: 'Search for messages in Slack',
        }
      ),
      input: z.object({
        query: z
          .string()
          .min(1)
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.slack.actions.searchMessages.input.query.description',
              {
                defaultMessage: 'Search query to find messages',
              }
            )
          ),
        sort: z
          .enum(['score', 'timestamp'])
          .optional()
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.slack.actions.searchMessages.input.sort.description',
              {
                defaultMessage: 'Sort order: score (relevance) or timestamp',
              }
            )
          ),
        sortDir: z
          .enum(['asc', 'desc'])
          .optional()
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.slack.actions.searchMessages.input.sortDir.description',
              {
                defaultMessage: 'Sort direction',
              }
            )
          ),
        count: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.slack.actions.searchMessages.input.count.description',
              {
                defaultMessage: 'Number of results to return (1-100)',
              }
            )
          ),
        page: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.slack.actions.searchMessages.input.page.description',
              {
                defaultMessage: 'Page number for pagination',
              }
            )
          ),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          query: string;
          sort?: 'score' | 'timestamp';
          sortDir?: 'asc' | 'desc';
          count?: number;
          page?: number;
        };

        const params = new URLSearchParams({
          query: typedInput.query,
        });

        if (typedInput.sort) {
          params.append('sort', typedInput.sort);
        }
        if (typedInput.sortDir) {
          params.append('sort_dir', typedInput.sortDir);
        }
        if (typedInput.count) {
          params.append('count', typedInput.count.toString());
        }
        if (typedInput.page) {
          params.append('page', typedInput.page.toString());
        }

        try {
          ctx.log.debug(`Slack searchMessages request: query=${typedInput.query}`);
          const response = await ctx.client.get(
            `${SLACK_API_BASE}/search.messages?${params.toString()}`
          );

          if (!response.data.ok) {
            throw new Error(`Slack API error: ${response.data.error}`);
          }

          return response.data;
        } catch (error) {
          ctx.log.error(
            `Slack searchMessages failed: ${error.message}, Status: ${
              error.response?.status
            }, Data: ${JSON.stringify(error.response?.data)}`
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
          ctx.log.error(
            `Slack sendMessage failed: ${error.message}, Status: ${
              error.response?.status
            }, Data: ${JSON.stringify(error.response?.data)}`
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
        return { ok: false, message: error.message };
      }
    },
  },
};
