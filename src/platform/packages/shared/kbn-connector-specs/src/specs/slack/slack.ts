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
import type { AxiosError, AxiosResponse } from 'axios';
import type { ConnectorSpec, ActionContext } from '../../connector_spec';
import {
  SlackCreateConversationInputSchema,
  SlackInviteToConversationInputSchema,
  SlackListChannelsInputSchema,
  SlackResolveChannelIdInputSchema,
  SlackSearchMessagesInputSchema,
  SlackSendMessageInputSchema,
  SLACK_SEARCH_DEFAULT_COUNT,
  type SlackAssistantSearchContextResponse,
  type SlackConversationsListParams,
  type SlackConversationsListResponse,
  type SlackCreateConversationInput,
  type SlackErrorFields,
  type SlackInviteToConversationInput,
  type SlackListChannelsInput,
  type SlackResolveChannelIdInput,
  type SlackSearchMessagesInput,
  type SlackSendMessageInput,
} from './types';

const SLACK_API_BASE = 'https://slack.com/api';

const SLACK_RETRY_DEFAULT_BASE_DELAY_MS = 1000;
const SLACK_RETRY_JITTER_MAX_MS = 250;
const SLACK_RETRY_MAX_DELAY_MS = 60_000;
const SLACK_RETRY_EXPONENT_CAP = 6;
const SLACK_MAX_RETRIES = 5;

// Tiny async sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const asString = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

function getHeader(headers: unknown, headerName: string): string | undefined {
  if (!isRecord(headers)) return undefined;
  const needle = headerName.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() !== needle) continue;
    if (typeof v === 'string') return v;
    if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  }
  return undefined;
}

function getSlackErrorFields(responseData: unknown): SlackErrorFields {
  if (!isRecord(responseData)) return {};
  return {
    error: asString(responseData.error),
    needed: asString(responseData.needed),
    provided: asString(responseData.provided),
  };
}

function formatSlackApiErrorMessage(params: {
  action: string;
  responseData?: unknown;
  responseHeaders?: unknown;
}) {
  const { action, responseData } = params;
  const { error: slackError, needed, provided } = getSlackErrorFields(responseData);
  const error = slackError ?? 'unknown_error';

  const extras: string[] = [];
  // Be careful about echoing back scope details in user-facing errors. We include only the minimum
  // Slack-provided hints that help diagnose the failure without exposing token scope inventories.
  if (needed) extras.push(`needed=${needed}`);
  if (provided) extras.push(`provided=${provided}`);

  return extras.length > 0
    ? `Slack ${action} error: ${error} (${extras.join(', ')})`
    : `Slack ${action} error: ${error}`;
}

function getSlackRetryDelayMs(params: {
  responseHeaders?: unknown;
  attempt: number;
  defaultBaseDelayMs?: number;
}) {
  const {
    responseHeaders,
    attempt,
    defaultBaseDelayMs = SLACK_RETRY_DEFAULT_BASE_DELAY_MS,
  } = params;
  const retryAfter = getHeader(responseHeaders, 'retry-after');
  const retryAfterSeconds = typeof retryAfter === 'string' ? Number(retryAfter) : NaN;

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    // Add a small jitter so multiple callers don't retry in lockstep.
    const jitterMs = Math.floor(Math.random() * SLACK_RETRY_JITTER_MAX_MS);
    return Math.min(SLACK_RETRY_MAX_DELAY_MS, Math.floor(retryAfterSeconds * 1000) + jitterMs);
  }

  // Fallback exponential backoff with jitter.
  const exp = Math.min(SLACK_RETRY_EXPONENT_CAP, Math.max(0, attempt)); // cap at 2^cap
  const base = defaultBaseDelayMs * Math.pow(2, exp);
  const jitterMs = Math.floor(Math.random() * SLACK_RETRY_JITTER_MAX_MS);
  return Math.min(SLACK_RETRY_MAX_DELAY_MS, base + jitterMs);
}

async function slackRequestWithRateLimitRetry<TData>(params: {
  ctx: ActionContext;
  action: string;
  request: () => Promise<AxiosResponse<TData>>;
  maxRetries?: number;
}): Promise<AxiosResponse<TData>> {
  const { ctx, action, request, maxRetries = 3 } = params;

  // Total attempts = maxRetries + 1 (initial attempt + retries)
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await request();
    } catch (error) {
      const err = error as AxiosError<unknown>;

      const status = err.response?.status;
      const slackError = getSlackErrorFields(err.response?.data).error;
      const isRateLimited =
        status === 429 ||
        slackError === 'ratelimited' ||
        (typeof err.message === 'string' && err.message.includes('ratelimited'));

      if (!isRateLimited || attempt === maxRetries) {
        throw error;
      }

      const delayMs = getSlackRetryDelayMs({
        responseHeaders: err.response?.headers,
        attempt,
      });
      ctx.log.debug(
        `Slack ${action} rate limited (attempt ${
          attempt + 1
        }/${maxRetries}). Sleeping ${delayMs}ms before retry.`
      );
      await sleep(delayMs);
    }
  }

  throw new Error(`Slack ${action} failed after ${maxRetries + 1} attempts`);
}

/**
 * Slack connector using OAuth2 Authorization Code flow (Slack OAuth v2),
 * with an additional temporary bearer token option for local testing.
 *
 * Required Slack App scopes:
 * MVP:
 * - channels:read - to list channels/conversations (public/private/DMs depending on workspace + membership)
 * - chat:write - for sending messages to public channels
 * - search:read.public (and related granular scopes) - for searching messages (requires a user token)
 * - groups:write - to create private channels and invite users
 *
 * Optional (possible future usage):
 * - groups:read - to list private channels (future)
 * - im:read - to list DMs (future)
 * - mpim:read - to list group DMs (future)
 * - groups:history - to read private channel history (future)
 * - im:history - to read DM history (future)
 * - mpim:history - to read group DM history (future)
 * - users:read,users:read.email - to support user-targeted lookups (not used in MVP)
 */
export const Slack: ConnectorSpec = {
  metadata: {
    id: '.slack2',
    displayName: 'Slack (v2)',
    description: i18n.translate('core.kibanaConnectorSpecs.slack.metadata.description', {
      defaultMessage:
        'Search messages, list channels (with pagination), resolve channel names to IDs, and send messages in Slack',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'oauth_authorization_code',
        defaults: {
          authorizationUrl: 'https://slack.com/oauth/v2/authorize',
          tokenUrl: 'https://slack.com/api/oauth.v2.access',
          scope:
            'channels:read chat:write files:read groups:read im:read mpim:read search:read.files search:read.im search:read.mpim search:read.private search:read.public users:read',
          scopeParamName: 'user_scope',
          accessTokenPath: 'authed_user.access_token',
          tokenType: 'Bearer',
        },
      },
    ],
  },

  // No additional configuration needed beyond OAuth credentials
  schema: z.object({}),

  actions: {
    // https://api.slack.com/methods/assistant.search.context
    searchMessages: {
      isTool: true,
      description:
        'Search Slack messages by keyword. Returns matching messages with channel, sender, timestamp, and permalink. Use the dedicated fromUser, inChannel, after, and before parameters for filtering — do not embed Slack search operators in the query string.',
      input: SlackSearchMessagesInputSchema,
      handler: async (ctx, input) => {
        const typedInput: SlackSearchMessagesInput = SlackSearchMessagesInputSchema.parse(input);

        const queryParts: string[] = [typedInput.query];
        if (typedInput.inChannel) queryParts.push(`in:${typedInput.inChannel}`);
        if (typedInput.fromUser) queryParts.push(`from:${typedInput.fromUser}`);
        if (typedInput.after) queryParts.push(`after:${typedInput.after}`);
        if (typedInput.before) queryParts.push(`before:${typedInput.before}`);
        const finalQuery = queryParts.filter(Boolean).join(' ');

        const count = typedInput.count ?? SLACK_SEARCH_DEFAULT_COUNT;
        const requestBody: Record<string, unknown> = {
          query: finalQuery,
          channel_types: ['public_channel', 'private_channel', 'mpim', 'im'],
          content_types: ['messages'],
          include_context_messages: typedInput.includeContextMessages ?? true,
          include_bots: typedInput.includeBots ?? false,
          include_message_blocks: typedInput.includeMessageBlocks ?? true,
        };
        if (typedInput.sort) requestBody.sort = typedInput.sort;
        if (typedInput.sortDir) requestBody.sort_dir = typedInput.sortDir;
        if (typedInput.cursor) requestBody.cursor = typedInput.cursor;

        try {
          ctx.log.debug(`Slack searchMessages request`);
          const response =
            await slackRequestWithRateLimitRetry<SlackAssistantSearchContextResponse>({
              ctx,
              action: 'searchMessages',
              maxRetries: SLACK_MAX_RETRIES,
              request: () =>
                ctx.client.post(`${SLACK_API_BASE}/assistant.search.context`, requestBody, {
                  headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                  },
                }),
            });

          if (!response.data.ok) {
            throw new Error(
              formatSlackApiErrorMessage({
                action: 'searchMessages',
                responseData: response.data,
                responseHeaders: response.headers,
              })
            );
          }

          if (typedInput.raw) {
            return response.data;
          }

          const messages = response.data.results?.messages ?? [];
          const limitedMessages = messages.slice(0, Math.min(count, messages.length));

          return {
            ok: true,
            query: finalQuery,
            total: messages.length,
            response_metadata: response.data.response_metadata,
            matches: limitedMessages.map((m) => {
              return {
                ts: m.message_ts,
                team: m.team_id,
                text: m.content,
                permalink: m.permalink,
                channel: { id: m.channel_id, name: m.channel_name },
                sender: { userId: m.author_user_id, username: m.author_name },
              };
            }),
          };
        } catch (error) {
          const err = error as AxiosError<unknown>;
          ctx.log.error(
            `Slack searchMessages failed: ${err.message}, Status: ${
              err.response?.status
            }, Data: ${JSON.stringify(err.response?.data)}`
          );
          throw error;
        }
      },
    },

    listChannels: {
      isTool: true,
      description:
        'List Slack channels/conversations the token can see (one page per call). Use this to answer which channels exist or to browse IDs before sendMessage. Pass nextCursor from the previous response to fetch the next page. Prefer this over many resolveChannelId calls for discovery.',
      input: SlackListChannelsInputSchema,
      handler: async (ctx, input: SlackListChannelsInput) => {
        const params: SlackConversationsListParams = {
          types: input.types.join(','),
          exclude_archived: input.excludeArchived,
          limit: input.limit,
          ...(input.cursor ? { cursor: input.cursor } : {}),
        };

        const response = await slackRequestWithRateLimitRetry<SlackConversationsListResponse>({
          ctx,
          action: 'listChannels',
          maxRetries: SLACK_MAX_RETRIES,
          request: () => ctx.client.get(`${SLACK_API_BASE}/conversations.list`, { params }),
        });

        if (!response.data.ok) {
          throw new Error(
            formatSlackApiErrorMessage({
              action: 'listChannels',
              responseData: response.data,
              responseHeaders: response.headers,
            })
          );
        }

        if (input.raw) {
          return response.data;
        }

        const channels = response.data.channels ?? [];
        const nextCursor = response.data.response_metadata?.next_cursor;
        const hasMore = Boolean(nextCursor && nextCursor.length > 0);

        return {
          ok: true as const,
          source: 'conversations.list' as const,
          channels: channels.map((c) => ({
            id: c.id,
            name: c.name,
            is_private: c.is_private,
            is_archived: c.is_archived,
            is_member: c.is_member,
          })),
          nextCursor: hasMore ? nextCursor : undefined,
          hasMore,
        };
      },
    },

    // Helper for LLMs: resolve a channel ID (C.../G...) from a human name (e.g. "#general").
    // Deterministic (uses conversations.list). No caching to avoid cross-tenant/process state.
    // https://api.slack.com/methods/conversations.list
    resolveChannelId: {
      isTool: true,
      description:
        'Look up a Slack channel/conversation ID from a human-readable channel name (e.g. "general" or "#general"). Use before sendMessage when you already know the target name but need its ID. To list or explore channels, use listChannels instead of many resolveChannelId calls.',
      input: SlackResolveChannelIdInputSchema,
      handler: async (ctx, input: SlackResolveChannelIdInput) => {
        const nameNorm = input.name.trim().replace(/^#/, '').toLowerCase();

        let cursor = input.cursor;
        let pagesFetched = 0;

        while (pagesFetched < input.maxPages) {
          const params: SlackConversationsListParams = {
            types: input.types.join(','),
            exclude_archived: input.excludeArchived,
            limit: input.limit,
            ...(cursor ? { cursor } : {}),
          };

          ctx.log.debug(`Slack resolveChannelId scan (page ${pagesFetched + 1})`);
          const response = await slackRequestWithRateLimitRetry<SlackConversationsListResponse>({
            ctx,
            action: 'resolveChannelId',
            maxRetries: SLACK_MAX_RETRIES,
            request: () => ctx.client.get(`${SLACK_API_BASE}/conversations.list`, { params }),
          });

          if (!response.data.ok) {
            throw new Error(
              formatSlackApiErrorMessage({
                action: 'resolveChannelId',
                responseData: response.data,
                responseHeaders: response.headers,
              })
            );
          }

          const channels = response.data.channels ?? [];
          const found = channels.find((c) => {
            const cName = (c.name ?? '').toString().toLowerCase();
            if (!cName) return false;
            return input.match === 'exact' ? cName === nameNorm : cName.includes(nameNorm);
          });

          if (found?.id) {
            return {
              ok: true,
              found: true,
              id: found.id,
              name: found.name ?? nameNorm,
              source: 'conversations.list',
              pagesFetched: pagesFetched + 1,
              nextCursor: response.data.response_metadata?.next_cursor,
            };
          }

          const next = response.data.response_metadata?.next_cursor;
          pagesFetched += 1;
          if (!next) {
            cursor = undefined;
            break;
          }
          cursor = next;
        }

        return {
          ok: true,
          found: false,
          id: undefined,
          name: nameNorm,
          source: 'conversations.list',
          pagesFetched,
          nextCursor: cursor,
        };
      },
    },

    // https://api.slack.com/methods/conversations.create
    createConversation: {
      isTool: false,
      description:
        'Create a new Slack channel (public or private). Returns the created channel object including its ID.',
      input: SlackCreateConversationInputSchema,
      handler: async (ctx, input) => {
        const typedInput: SlackCreateConversationInput =
          SlackCreateConversationInputSchema.parse(input);

        const payload: Record<string, unknown> = {
          name: typedInput.name,
          is_private: typedInput.isPrivate ?? false,
        };

        try {
          ctx.log.debug(`Slack createConversation request: name=${typedInput.name}`);
          const response = await slackRequestWithRateLimitRetry({
            ctx,
            action: 'createConversation',
            maxRetries: SLACK_MAX_RETRIES,
            request: () =>
              ctx.client.post(`${SLACK_API_BASE}/conversations.create`, payload, {
                headers: {
                  'Content-Type': 'application/json; charset=utf-8',
                },
              }),
          });

          if (!response.data.ok) {
            throw new Error(
              formatSlackApiErrorMessage({
                action: 'createConversation',
                responseData: response.data,
                responseHeaders: response.headers,
              })
            );
          }

          return response.data;
        } catch (error) {
          const err = error as AxiosError<unknown>;
          ctx.log.error(
            `Slack createConversation failed: ${err.message}, Status: ${
              err.response?.status
            }, Data: ${JSON.stringify(err.response?.data)}`
          );
          throw error;
        }
      },
    },

    // https://api.slack.com/methods/conversations.invite
    inviteToConversation: {
      isTool: false,
      description: 'Invite one or more users to a Slack channel by channel ID and user IDs.',
      input: SlackInviteToConversationInputSchema,
      handler: async (ctx, input) => {
        const typedInput: SlackInviteToConversationInput =
          SlackInviteToConversationInputSchema.parse(input);

        const payload: Record<string, unknown> = {
          channel: typedInput.channel,
          users: typedInput.users,
        };

        try {
          ctx.log.debug(`Slack inviteToConversation request: channel=${typedInput.channel}`);
          const response = await slackRequestWithRateLimitRetry({
            ctx,
            action: 'inviteToConversation',
            maxRetries: SLACK_MAX_RETRIES,
            request: () =>
              ctx.client.post(`${SLACK_API_BASE}/conversations.invite`, payload, {
                headers: {
                  'Content-Type': 'application/json; charset=utf-8',
                },
              }),
          });

          if (!response.data.ok) {
            throw new Error(
              formatSlackApiErrorMessage({
                action: 'inviteToConversation',
                responseData: response.data,
                responseHeaders: response.headers,
              })
            );
          }

          return response.data;
        } catch (error) {
          const err = error as AxiosError<unknown>;
          ctx.log.error(
            `Slack inviteToConversation failed: ${err.message}, Status: ${
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
      description:
        'Send a message to a Slack channel or DM. Requires a channel ID. Use listChannels to discover channels, or resolveChannelId when you know the channel name and need its ID. Returns the message timestamp, which can be used as threadTs to post a reply in a thread.',
      input: SlackSendMessageInputSchema,
      handler: async (ctx, input) => {
        const typedInput: SlackSendMessageInput = SlackSendMessageInputSchema.parse(input);

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
          const response = await slackRequestWithRateLimitRetry({
            ctx,
            action: 'sendMessage',
            maxRetries: SLACK_MAX_RETRIES,
            request: () =>
              ctx.client.post(`${SLACK_API_BASE}/chat.postMessage`, payload, {
                headers: {
                  'Content-Type': 'application/json; charset=utf-8',
                },
              }),
          });

          if (!response.data.ok) {
            throw new Error(
              formatSlackApiErrorMessage({
                action: 'sendMessage',
                responseData: response.data,
                responseHeaders: response.headers,
              })
            );
          }

          return response.data;
        } catch (error) {
          const err = error as AxiosError<unknown>;
          ctx.log.error(
            `Slack sendMessage failed: ${err.message}, Status: ${
              err.response?.status
            }, Data: ${JSON.stringify(err.response?.data)}`
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
        const response = await ctx.client.get(`${SLACK_API_BASE}/auth.test`);

        if (!response.data.ok) {
          return {
            ok: false,
            message: formatSlackApiErrorMessage({
              action: 'test',
              responseData: response.data,
              responseHeaders: response.headers,
            }),
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

  skill: [
    'To list Slack channels or answer which channels exist, use listChannels. When the response has hasMore true, call listChannels again with the nextCursor from the previous response until you have enough context.',
    'When sending to a channel whose name you know but whose ID you do not, call resolveChannelId to get the channel ID, then pass it to sendMessage.',
    'Do not use resolveChannelId to discover channels—for example, do not use contains with a very short partial name to probe the workspace. Use listChannels for discovery instead.',
  ].join('\n'),
};
