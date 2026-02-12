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

const SLACK_API_BASE = 'https://slack.com/api';
const ENABLE_TEMPORARY_MANUAL_TOKEN_AUTH = true; // Temporary: remove once OAuth support is unblocked.
const SLACK_CONVERSATION_TYPES = ['public_channel', 'private_channel', 'im', 'mpim'] as const;

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
  highlight: z
    .boolean()
    .optional()
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.searchMessages.input.highlight.description',
        { defaultMessage: 'Whether to include highlight markers in results' }
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
    .max(1000)
    .optional()
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.resolveChannelId.input.limit.description',
        {
          defaultMessage: 'Channels per page to request (1-1000). Defaults to 1000.',
        }
      )
    ),
  maxPages: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.slack.actions.resolveChannelId.input.maxPages.description',
        {
          defaultMessage: 'Maximum number of pages to scan before giving up. Defaults to 10.',
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

interface SlackErrorFields {
  error?: string;
  needed?: string;
  provided?: string;
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
  const { action, responseData, responseHeaders } = params;
  const { error: slackError, needed, provided } = getSlackErrorFields(responseData);
  const error = slackError ?? 'unknown_error';

  // Slack frequently returns these headers on Web API responses; they’re the most reliable way
  // to understand which scopes a token actually has vs. what an endpoint requires.
  const accepted = getHeader(responseHeaders, 'x-accepted-oauth-scopes');
  const scopes = getHeader(responseHeaders, 'x-oauth-scopes');

  const extras: string[] = [];
  if (needed) extras.push(`needed=${needed}`);
  if (provided) extras.push(`provided=${provided}`);
  if (accepted) extras.push(`acceptedScopes=${accepted}`);
  if (scopes) extras.push(`tokenScopes=${scopes}`);

  return extras.length > 0
    ? `Slack ${action} error: ${error} (${extras.join(', ')})`
    : `Slack ${action} error: ${error}`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getSlackRetryDelayMs(params: {
  responseHeaders?: unknown;
  attempt: number;
  defaultBaseDelayMs?: number;
}) {
  const { responseHeaders, attempt, defaultBaseDelayMs = 1000 } = params;
  const retryAfter = getHeader(responseHeaders, 'retry-after');
  const retryAfterSeconds = typeof retryAfter === 'string' ? Number(retryAfter) : NaN;

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    // Add a small jitter so multiple callers don't retry in lockstep.
    const jitterMs = Math.floor(Math.random() * 250);
    return Math.min(60_000, Math.floor(retryAfterSeconds * 1000) + jitterMs);
  }

  // Fallback exponential backoff with jitter.
  const exp = Math.min(6, Math.max(0, attempt)); // cap at 2^6
  const base = defaultBaseDelayMs * Math.pow(2, exp);
  const jitterMs = Math.floor(Math.random() * 250);
  return Math.min(60_000, base + jitterMs);
}

interface SlackSearchMatch {
  score?: number;
  iid?: string;
  team?: string;
  text?: string;
  permalink?: string;
  user?: string;
  username?: string;
  ts?: string;
  channel?: { id?: string; name?: string };
  blocks?: unknown;
}

function extractMentionedUserIds(match: SlackSearchMatch): string[] {
  const ids = new Set<string>();

  const text = typeof match.text === 'string' ? match.text : '';
  const re = /<@([A-Z0-9]+)(?:\\|[^>]+)?>/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m[1]) ids.add(m[1]);
  }

  const stack: unknown[] = match.blocks ? [match.blocks] : [];
  const seen = new Set<unknown>();
  let visited = 0;

  // Walk the blocks tree to find user mentions like { type: 'user', user_id: 'U...' }.
  while (stack.length > 0) {
    const cur = stack.pop();
    visited += 1;
    if (visited > 5000) break;
    if (!cur || typeof cur !== 'object') continue;
    if (seen.has(cur)) continue;
    seen.add(cur);

    const rec = cur as Record<string, unknown>;
    if (rec.type === 'user' && typeof rec.user_id === 'string') {
      ids.add(rec.user_id);
    }

    for (const v of Object.values(rec)) {
      if (Array.isArray(v)) stack.push(...v);
      else if (v && typeof v === 'object') stack.push(v);
    }
  }

  return Array.from(ids);
}

async function slackRequestWithRateLimitRetry<TData>(params: {
  ctx: ActionContext;
  action: string;
  request: () => Promise<AxiosResponse<TData>>;
  maxRetries?: number;
}): Promise<AxiosResponse<TData>> {
  const { ctx, action, request, maxRetries = 3 } = params;

  let attempt = 0;

  while (true) {
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

      if (!isRateLimited || attempt >= maxRetries) {
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
      attempt += 1;
    }
  }
}

/**
 * Slack connector using a user-provided bearer token (temporary MVP path).
 *
 * Required Slack App scopes:
 * MVP:
 * - channels:read - to list channels/conversations (public/private/DMs depending on workspace + membership)
 * - chat:write - for sending messages to public channels
 * - search:read - for searching messages (requires a user token)
 *
 * Optional (not required for MVP):
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
    // MVP: bearer token only (OAuth auth-code flow not required for merge into main)
    types: ENABLE_TEMPORARY_MANUAL_TOKEN_AUTH
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
      : [],
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
          defaultMessage: 'Search for messages in Slack (uses the authorized user token)',
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

        const params = new URLSearchParams({ query: finalQuery });
        if (typedInput.sort) params.append('sort', typedInput.sort);
        if (typedInput.sortDir) params.append('sort_dir', typedInput.sortDir);
        if (typedInput.count) params.append('count', typedInput.count.toString());
        if (typedInput.page) params.append('page', typedInput.page.toString());
        if (typedInput.highlight !== undefined) {
          params.append('highlight', typedInput.highlight ? 'true' : 'false');
        }

        try {
          ctx.log.debug(`Slack searchMessages request`);
          const response = await slackRequestWithRateLimitRetry({
            ctx,
            action: 'searchMessages',
            maxRetries: 5,
            request: () => ctx.client.get(`${SLACK_API_BASE}/search.messages?${params.toString()}`),
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

          const matches: SlackSearchMatch[] =
            (response.data?.messages?.matches as SlackSearchMatch[]) ?? [];

          return {
            ok: true,
            query: response.data?.query ?? finalQuery,
            total: response.data?.messages?.total,
            pagination: response.data?.messages?.pagination,
            matches: matches.map((m) => ({
              score: m.score,
              ts: m.ts,
              team: m.team,
              text: m.text,
              permalink: m.permalink,
              channel: { id: m.channel?.id, name: m.channel?.name },
              sender: { userId: m.user, username: m.username },
              mentionedUserIds: extractMentionedUserIds(m),
            })),
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
        const limit = typedInput.limit ?? 1000;
        const maxPages = typedInput.maxPages ?? 10;

        let cursor = typedInput.cursor;
        let pagesFetched = 0;

        while (pagesFetched < maxPages) {
          const params = new URLSearchParams();
          params.append('types', types.join(','));
          params.append('exclude_archived', excludeArchived ? 'true' : 'false');
          params.append('limit', limit.toString());
          if (cursor) params.append('cursor', cursor);

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
            maxRetries: 5,
            request: () =>
              ctx.client.get(`${SLACK_API_BASE}/conversations.list?${params.toString()}`),
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
            maxRetries: 5,
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
