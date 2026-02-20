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
import type { SlackAssistantSearchContextResponse, SlackErrorFields } from './types';

const SLACK_API_BASE = 'https://slack.com/api';
const ENABLE_TEMPORARY_MANUAL_TOKEN_AUTH = true; // Temporary: remove once OAuth support is unblocked.
const SLACK_CONVERSATION_TYPES = ['public_channel', 'private_channel', 'im', 'mpim'] as const;

// Slack API/connector constants (avoid magic numbers)
const SLACK_MAX_SEARCH_RESULTS_PER_PAGE = 20;
const SLACK_SEARCH_DEFAULT_COUNT = SLACK_MAX_SEARCH_RESULTS_PER_PAGE;
const SLACK_MAX_CONVERSATIONS_LIST_LIMIT = 1000;
const SLACK_DEFAULT_CONVERSATIONS_LIST_LIMIT = SLACK_MAX_CONVERSATIONS_LIST_LIMIT;
const SLACK_DEFAULT_RESOLVE_CHANNEL_MAX_PAGES = 10;
const SLACK_MAX_RESOLVE_CHANNEL_MAX_PAGES = 100;

const SLACK_RETRY_DEFAULT_BASE_DELAY_MS = 1000;
const SLACK_RETRY_JITTER_MAX_MS = 250;
const SLACK_RETRY_MAX_DELAY_MS = 60_000;
const SLACK_RETRY_EXPONENT_CAP = 6;
const SLACK_MAX_RETRIES = 5;

// Tiny async sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const SlackSearchMessagesInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.searchMessages.input.query.description',
        {
          defaultMessage:
            'Search query to find messages (supports Slack search operators; see optional constraint fields)',
        }
      )
    ),
  inChannel: z
    .string()
    .optional()
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.searchMessages.input.inChannel.description',
        {
          defaultMessage:
            'Optional Slack search constraint. Adds `in:<channel_name>` to the query.',
        }
      )
    ),
  fromUser: z
    .string()
    .optional()
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.searchMessages.input.fromUser.description',
        {
          defaultMessage:
            'Optional Slack search constraint. Adds `from:<@UserID>` or `from:username` to the query.',
        }
      )
    ),
  after: z
    .string()
    .optional()
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.searchMessages.input.after.description',
        {
          defaultMessage:
            'Optional Slack search constraint. Adds `after:<date>` to the query (e.g. 2026-02-10).',
        }
      )
    ),
  before: z
    .string()
    .optional()
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.searchMessages.input.before.description',
        {
          defaultMessage:
            'Optional Slack search constraint. Adds `before:<date>` to the query (e.g. 2026-02-10).',
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
        { defaultMessage: 'Sort direction' }
      )
    ),
  count: z
    .number()
    .int()
    .min(1)
    .max(SLACK_MAX_SEARCH_RESULTS_PER_PAGE)
    .optional()
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.searchMessages.input.count.description',
        {
          defaultMessage: `Number of results to return (1-${SLACK_MAX_SEARCH_RESULTS_PER_PAGE}). Slack returns up to ${SLACK_MAX_SEARCH_RESULTS_PER_PAGE} results per page.`,
        }
      )
    ),
  cursor: z
    .string()
    .optional()
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.searchMessages.input.cursor.description',
        {
          defaultMessage:
            'Pagination cursor to fetch the next page of results (use response_metadata.next_cursor from a previous call).',
        }
      )
    ),
  includeContextMessages: z
    .boolean()
    .optional()
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.searchMessages.input.includeContextMessages.description',
        {
          defaultMessage:
            'Include contextual messages (messages before/after the matched message, or thread context). Defaults to true.',
        }
      )
    ),
  includeBots: z
    .boolean()
    .optional()
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.searchMessages.input.includeBots.description',
        {
          defaultMessage: 'Include bot-authored messages. Defaults to false.',
        }
      )
    ),
  includeMessageBlocks: z
    .boolean()
    .optional()
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.searchMessages.input.includeMessageBlocks.description',
        {
          defaultMessage:
            'Include Block Kit blocks in message results (useful for extracting mentions/links). Defaults to true.',
        }
      )
    ),
  raw: z
    .boolean()
    .optional()
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.searchMessages.input.raw.description',
        {
          defaultMessage:
            'Return the full raw Slack API response instead of a compact, LLM-friendly result.',
        }
      )
    ),
});
type SlackSearchMessagesInput = z.infer<typeof SlackSearchMessagesInputSchema>;

const SlackResolveChannelIdInputSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.resolveChannelId.input.name.description',
        {
          defaultMessage:
            'Channel name to resolve (e.g. "general" or "#general"). Returns the matching conversation ID (C.../G...).',
        }
      )
    ),
  types: z
    .array(z.enum(SLACK_CONVERSATION_TYPES))
    .optional()
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.resolveChannelId.input.types.description',
        {
          defaultMessage:
            'Conversation types to search. Defaults to public_channel. Valid: public_channel, private_channel, im, mpim.',
        }
      )
    ),
  match: z
    .enum(['exact', 'contains'])
    .optional()
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.resolveChannelId.input.match.description',
        {
          defaultMessage:
            'How to match the channel name. exact is fastest/most precise. contains can help when you only know part of the name.',
        }
      )
    ),
  excludeArchived: z
    .boolean()
    .optional()
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.resolveChannelId.input.excludeArchived.description',
        { defaultMessage: 'Exclude archived channels (default true)' }
      )
    ),
  cursor: z
    .string()
    .optional()
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.resolveChannelId.input.cursor.description',
        { defaultMessage: 'Optional cursor to resume a previous scan (advanced). Usually omit.' }
      )
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(SLACK_MAX_CONVERSATIONS_LIST_LIMIT)
    .optional()
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.resolveChannelId.input.limit.description',
        {
          defaultMessage: `Channels per page to request (1-${SLACK_MAX_CONVERSATIONS_LIST_LIMIT}). Defaults to ${SLACK_DEFAULT_CONVERSATIONS_LIST_LIMIT}.`,
        }
      )
    ),
  maxPages: z
    .number()
    .int()
    .min(1)
    .max(SLACK_MAX_RESOLVE_CHANNEL_MAX_PAGES)
    .optional()
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.resolveChannelId.input.maxPages.description',
        {
          defaultMessage: `Maximum number of pages to scan before giving up. Defaults to ${SLACK_DEFAULT_RESOLVE_CHANNEL_MAX_PAGES}.`,
        }
      )
    ),
});
type SlackResolveChannelIdInput = z.infer<typeof SlackResolveChannelIdInputSchema>;

const SlackSendMessageInputSchema = z.object({
  channel: z
    .string()
    .min(1)
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.sendMessage.input.channel.description',
        {
          defaultMessage:
            'Conversation ID to send the message to (e.g. C... for channels, G... for private channels, D... for DMs). Use resolveChannelId to discover channel IDs.',
        }
      )
    ),
  text: z
    .string()
    .min(1)
    .describe(
      i18n.translate('core.kibanaConnectorSpecs.slack.actions.sendMessage.input.text.description', {
        defaultMessage: 'The message text to send',
      })
    ),
  threadTs: z
    .string()
    .optional()
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.sendMessage.input.threadTs.description',
        {
          defaultMessage: 'Timestamp of another message to reply to (creates a threaded reply)',
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
});
type SlackSendMessageInput = z.infer<typeof SlackSendMessageInputSchema>;

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
      defaultMessage: 'List public channels and send messages to Slack channels',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: [
      ...(ENABLE_TEMPORARY_MANUAL_TOKEN_AUTH
        ? ([
            {
              type: 'bearer',
              defaults: {
                token: '',
              },
              overrides: {
                meta: {
                  token: {
                    sensitive: true,
                    label: i18n.translate(
                      'core.kibanaConnectorSpecs.slack.auth.temporaryManualToken.label',
                      {
                        defaultMessage: 'Temporary Slack user token',
                      }
                    ),
                    helpText: i18n.translate(
                      'core.kibanaConnectorSpecs.slack.auth.temporaryManualToken.helpText',
                      {
                        defaultMessage:
                          'Temporary option for testing only. Paste a Slack user token (e.g. xoxp-...) here.',
                      }
                    ),
                  },
                },
              },
            },
          ] as const)
        : []),
    ],
  },

  // No additional configuration needed beyond OAuth credentials
  schema: z.object({}),

  actions: {
    // https://api.slack.com/methods/assistant.search.context
    searchMessages: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.searchMessages.description',
        {
          defaultMessage:
            'Search Slack messages using the Real-time Search API (assistant.search.context)',
        }
      ),
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

    // Helper for LLMs: resolve a channel ID (C.../G...) from a human name (e.g. "#general").
    // Deterministic (uses conversations.list). No caching to avoid cross-tenant/process state.
    // https://api.slack.com/methods/conversations.list
    resolveChannelId: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.resolveChannelId.description',
        {
          defaultMessage:
            'Resolve a Slack channel/conversation ID from a channel name (rate-limit-aware pagination)',
        }
      ),
      input: SlackResolveChannelIdInputSchema,
      handler: async (ctx, input) => {
        const typedInput: SlackResolveChannelIdInput =
          SlackResolveChannelIdInputSchema.parse(input);

        const nameNorm = typedInput.name.trim().replace(/^#/, '').toLowerCase();
        const types =
          typedInput.types && typedInput.types.length > 0
            ? typedInput.types
            : (['public_channel'] as Array<(typeof SLACK_CONVERSATION_TYPES)[number]>);
        const match = typedInput.match ?? 'exact';
        const excludeArchived = typedInput.excludeArchived ?? true;
        const limit = typedInput.limit ?? SLACK_DEFAULT_CONVERSATIONS_LIST_LIMIT;
        const maxPages = typedInput.maxPages ?? SLACK_DEFAULT_RESOLVE_CHANNEL_MAX_PAGES;

        let cursor = typedInput.cursor;
        let pagesFetched = 0;

        while (pagesFetched < maxPages) {
          const params: Record<string, string | number | boolean> = {
            types: types.join(','),
            exclude_archived: excludeArchived,
            limit,
            ...(cursor ? { cursor } : {}),
          };

          ctx.log.debug(`Slack resolveChannelId scan (page ${pagesFetched + 1})`);
          const response = await slackRequestWithRateLimitRetry<{
            ok: boolean;
            error?: string;
            needed?: string;
            provided?: string;
            channels?: Array<{ id?: string; name?: string }>;
            response_metadata?: { next_cursor?: string };
          }>({
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
            return match === 'exact' ? cName === nameNorm : cName.includes(nameNorm);
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

    // https://api.slack.com/methods/chat.postMessage
    sendMessage: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.sendMessage.description',
        {
          defaultMessage: 'Send a message to a Slack channel',
        }
      ),
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
};
