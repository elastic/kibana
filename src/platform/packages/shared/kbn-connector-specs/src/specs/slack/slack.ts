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
import type { AxiosError, AxiosResponse } from 'axios';
import type { ConnectorSpec, ActionContext } from '../../connector_spec';
import { SLACK_CONNECTOR_TYPE_ID } from './constants';
import { slackEvents } from './events';
import { slackRelay } from './relay';
import {
  SlackAddReactionInputSchema,
  SlackAskQuestionInputSchema,
  SlackCreateConversationInputSchema,
  SlackGetConversationHistoryInputSchema,
  SlackGetConversationInfoInputSchema,
  SlackGetConversationRepliesInputSchema,
  SlackGetFileInfoInputSchema,
  SlackInviteToConversationInputSchema,
  SlackListChannelsInputSchema,
  SlackListFilesInputSchema,
  SlackListUserConversationsInputSchema,
  SlackListUsersInputSchema,
  SlackLookupUserByEmailInputSchema,
  SlackResolveChannelIdInputSchema,
  SlackSearchMessagesInputSchema,
  SlackSendBlockKitMessageInputSchema,
  SlackSendMessageInputSchema,
  SlackUpdateMessageInputSchema,
  SlackUploadFileInputSchema,
  SlackWhoAmIInputSchema,
  SLACK_SEARCH_DEFAULT_COUNT,
  type SlackAddReactionInput,
  type SlackAskQuestionInput,
  type SlackAssistantSearchContextResponse,
  type SlackAuthTestResponse,
  type SlackChatPostMessageResponse,
  type SlackChatUpdateResponse,
  type SlackConversationsHistoryResponse,
  type SlackConversationsListParams,
  type SlackConversationsListResponse,
  type SlackConversationsRepliesResponse,
  type SlackCreateConversationInput,
  type SlackErrorFields,
  type SlackFile,
  type SlackFilesCompleteUploadResponse,
  type SlackFilesGetUploadURLResponse,
  type SlackFilesInfoResponse,
  type SlackFilesListResponse,
  type SlackGetConversationHistoryInput,
  type SlackGetConversationInfoInput,
  type SlackGetConversationRepliesInput,
  type SlackGetFileInfoInput,
  type SlackInviteToConversationInput,
  type SlackListChannelsInput,
  type SlackListFilesInput,
  type SlackListUserConversationsInput,
  type SlackListUsersInput,
  type SlackLookupUserByEmailInput,
  type SlackResolveChannelIdInput,
  type SlackSearchMessagesInput,
  type SlackSendBlockKitMessageInput,
  type SlackSendMessageInput,
  type SlackUpdateMessageInput,
  type SlackUploadFileInput,
  type SlackWhoAmIInput,
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
 * - channels:read, groups:read, im:read, mpim:read - list public channels, private channels, DMs, and group DMs
 * - channels:history, groups:history, im:history, mpim:history - read message history from each conversation type
 * - chat:write - send messages
 * - channels:manage - create public channels and invite users (bot tokens)
 * - groups:write - create private channels and invite users
 * - search:read.public, search:read.private, search:read.im, search:read.mpim, search:read.files - search messages and files
 * - files:read - look up file metadata (getFileInfo, listFiles) and file references on messages
 * - users:read, users:read.email - list workspace users and look up users by email
 *
 * auth.test (the underlying call for the whoAmI sub-action and the connector's
 * own test handler) does not require an explicit scope — any valid token works.
 */
export const Slack: ConnectorSpec = {
  metadata: {
    id: SLACK_CONNECTOR_TYPE_ID,
    displayName: 'Slack (v2)',
    description: i18n.translate('core.kibanaConnectorSpecs.slack.metadata.description', {
      defaultMessage:
        'Send messages and Block Kit cards, update and react to messages, upload files, list channels and users, read conversation history and thread replies, search messages, and look up users by email in Slack',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder', 'contextEngine'],
    docsUrl: `https://www.elastic.co/docs/reference/kibana/connectors-kibana/slack-v2-action-type`,
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
          provider: 'slack',
          // reactions:write needed for addReaction; files:write needed for uploadFile.
          // channels:manage needed for createConversation/inviteToConversation on public channels (bot tokens).
          // groups:write needed for createConversation/inviteToConversation on private channels.
          scope:
            'channels:manage channels:read channels:history chat:write files:read files:write groups:read groups:history groups:write im:read im:history mpim:read mpim:history reactions:write search:read.files search:read.im search:read.mpim search:read.private search:read.public users:read users:read.email',
        },
      },
      {
        type: 'oauth_authorization_code',
        defaults: {
          authorizationUrl: 'https://slack.com/oauth/v2/authorize',
          tokenUrl: 'https://slack.com/api/oauth.v2.access',
          // History scopes (channels/groups/im/mpim:history) are needed for getConversationHistory.
          // users:read.email is needed for lookupUserByEmail.
          // reactions:write needed for addReaction; files:write needed for uploadFile.
          // channels:manage needed for createConversation/inviteToConversation on public channels.
          // groups:write needed for createConversation/inviteToConversation on private channels.
          scope:
            'channels:manage channels:read channels:history chat:write files:read files:write groups:read groups:history groups:write im:read im:history mpim:read mpim:history reactions:write search:read.files search:read.im search:read.mpim search:read.private search:read.public users:read users:read.email',
          scopeParamName: 'user_scope',
          accessTokenPath: 'authed_user.access_token',
          tokenType: 'Bearer',
        },
      },
      {
        type: 'bearer',
        defaults: {},
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.slack.auth.bearer.label', {
            defaultMessage: 'Bot Token',
          }),
          meta: {
            token: {
              sensitive: true,
              label: i18n.translate('core.kibanaConnectorSpecs.slack.auth.bearer.token.label', {
                defaultMessage: 'Slack Bot Token',
              }),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.slack.auth.bearer.token.helpText',
                {
                  defaultMessage:
                    'A Slack bot token starting with xoxb-. Create one at api.slack.com/apps.',
                }
              ),
            },
          },
        },
      },
      {
        type: 'relay',
        defaults: {},
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.slack.auth.relay.label', {
            defaultMessage: 'Elastic Slack app (Bot Token)',
          }),
        },
      },
    ],
  },

  // No additional configuration needed beyond OAuth credentials
  schema: lazySchema(() => z.object({})),

  actions: {
    // https://api.slack.com/methods/assistant.search.context
    searchMessages: {
      isTool: true,
      scope: 'read',
      description:
        'Search Slack messages by keyword. Returns matching messages with channel, sender, timestamp, and permalink. Use the dedicated fromUser, inChannel, after, and before parameters for filtering — do not embed Slack search operators in the query string.',
      input: SlackSearchMessagesInputSchema,
      handler: async (ctx, input) => {
        slackRelay.assertNotSupported(ctx, 'searchMessages');

        if (ctx.secrets?.authType === 'bearer') {
          throw new Error(
            i18n.translate('core.kibanaConnectorSpecs.slack.searchMessages.botTokenError', {
              defaultMessage:
                'searchMessages is not supported with bot token auth — Slack search APIs require a user token. Use getConversationHistory to read messages from a specific channel instead.',
            })
          );
        }

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
      scope: 'read',
      description:
        'List Slack channels/conversations the token can see (one page per call). Use this to answer which channels exist or to browse IDs before sendMessage. Pass nextCursor from the previous response to fetch the next page. Prefer this over many resolveChannelId calls for discovery.',
      input: SlackListChannelsInputSchema,
      handler: async (ctx, input: SlackListChannelsInput) => {
        const relayConnection = slackRelay.getConnection(ctx);
        if (relayConnection) {
          return slackRelay.actions.listChannels(relayConnection, ctx, input);
        }

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
      scope: 'read',
      description:
        'Look up a Slack channel/conversation ID from a human-readable channel name (e.g. "general" or "#general"). Use before sendMessage when you already know the target name but need its ID. To list or explore channels, use listChannels instead of many resolveChannelId calls.',
      input: SlackResolveChannelIdInputSchema,
      handler: async (ctx, input: SlackResolveChannelIdInput) => {
        const relayConnection = slackRelay.getConnection(ctx);
        if (relayConnection) {
          return slackRelay.actions.resolveChannelId(relayConnection, ctx, input);
        }

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

    // https://api.slack.com/methods/conversations.history
    getConversationHistory: {
      isTool: true,
      scope: 'read',
      description:
        'Fetch a page of recent messages from a Slack channel or DM. Returns messages newest-first. Pass nextCursor from the response to fetch older pages.',
      input: SlackGetConversationHistoryInputSchema,
      handler: async (ctx, input) => {
        slackRelay.assertNotSupported(ctx, 'getConversationHistory');

        const typedInput: SlackGetConversationHistoryInput =
          SlackGetConversationHistoryInputSchema.parse(input);

        const params: Record<string, string | number | boolean> = {
          channel: typedInput.channel,
          limit: typedInput.limit,
        };
        if (typedInput.oldest) params.oldest = typedInput.oldest;
        if (typedInput.latest) params.latest = typedInput.latest;
        if (typedInput.inclusive !== undefined) params.inclusive = typedInput.inclusive;
        if (typedInput.cursor) params.cursor = typedInput.cursor;

        const response = await slackRequestWithRateLimitRetry<SlackConversationsHistoryResponse>({
          ctx,
          action: 'getConversationHistory',
          maxRetries: SLACK_MAX_RETRIES,
          request: () => ctx.client.get(`${SLACK_API_BASE}/conversations.history`, { params }),
        });

        if (!response.data.ok) {
          throw new Error(
            formatSlackApiErrorMessage({
              action: 'getConversationHistory',
              responseData: response.data,
              responseHeaders: response.headers,
            })
          );
        }

        if (typedInput.raw) {
          return response.data;
        }

        const messages = response.data.messages ?? [];
        const nextCursor = response.data.response_metadata?.next_cursor;
        const hasMore = Boolean(response.data.has_more) || Boolean(nextCursor);

        return {
          ok: true as const,
          channel: typedInput.channel,
          messages: messages.map((m) => ({
            ts: m.ts,
            type: m.type,
            subtype: m.subtype,
            user: m.user,
            bot_id: m.bot_id,
            username: m.username,
            // Bot/app posts (alert webhooks, GitHub/Jira notifications, etc.) frequently
            // have empty `text` and put their content in `blocks` or `attachments`.
            // Fall back to the first attachment's fallback/text so workflows do not
            // have to opt into `raw` for bot-heavy channels.
            text:
              m.text && m.text.length > 0
                ? m.text
                : m.attachments?.find((a) => a.fallback)?.fallback ??
                  m.attachments?.find((a) => a.text)?.text ??
                  m.text,
            thread_ts: m.thread_ts,
            reply_count: m.reply_count,
            blocks: m.blocks,
            attachments: m.attachments,
            files: m.files,
          })),
          nextCursor: nextCursor && nextCursor.length > 0 ? nextCursor : undefined,
          hasMore,
        };
      },
    },

    // https://api.slack.com/methods/conversations.info
    getConversationInfo: {
      isTool: true,
      scope: 'read',
      description:
        'Look up metadata for a single Slack channel or DM by ID. Returns the channel object (name, privacy, membership, topic, purpose).',
      input: SlackGetConversationInfoInputSchema,
      handler: async (ctx, input) => {
        slackRelay.assertNotSupported(ctx, 'getConversationInfo');

        const typedInput: SlackGetConversationInfoInput =
          SlackGetConversationInfoInputSchema.parse(input);

        const params: Record<string, string | number | boolean> = {
          channel: typedInput.channel,
        };
        if (typedInput.includeNumMembers !== undefined) {
          params.include_num_members = typedInput.includeNumMembers;
        }
        if (typedInput.includeLocale !== undefined) {
          params.include_locale = typedInput.includeLocale;
        }

        const response = await slackRequestWithRateLimitRetry({
          ctx,
          action: 'getConversationInfo',
          maxRetries: SLACK_MAX_RETRIES,
          request: () => ctx.client.get(`${SLACK_API_BASE}/conversations.info`, { params }),
        });

        if (!response.data.ok) {
          throw new Error(
            formatSlackApiErrorMessage({
              action: 'getConversationInfo',
              responseData: response.data,
              responseHeaders: response.headers,
            })
          );
        }

        return typedInput.raw ? response.data : response.data.channel;
      },
    },

    // https://api.slack.com/methods/users.lookupByEmail
    lookupUserByEmail: {
      isTool: true,
      scope: 'read',
      description:
        'Find a Slack user by email address. Returns the matching user object including id, name, and profile. Throws if no user has that email.',
      input: SlackLookupUserByEmailInputSchema,
      handler: async (ctx, input) => {
        slackRelay.assertNotSupported(ctx, 'lookupUserByEmail');

        const typedInput: SlackLookupUserByEmailInput =
          SlackLookupUserByEmailInputSchema.parse(input);

        const response = await slackRequestWithRateLimitRetry({
          ctx,
          action: 'lookupUserByEmail',
          maxRetries: SLACK_MAX_RETRIES,
          request: () =>
            ctx.client.get(`${SLACK_API_BASE}/users.lookupByEmail`, {
              params: { email: typedInput.email },
            }),
        });

        if (!response.data.ok) {
          throw new Error(
            formatSlackApiErrorMessage({
              action: 'lookupUserByEmail',
              responseData: response.data,
              responseHeaders: response.headers,
            })
          );
        }

        return typedInput.raw ? response.data : response.data.user;
      },
    },

    // https://api.slack.com/methods/users.list
    listUsers: {
      isTool: true,
      scope: 'read',
      description:
        'List Slack workspace users (one page per call). Pass nextCursor from the previous response to fetch the next page.',
      input: SlackListUsersInputSchema,
      handler: async (ctx, input) => {
        slackRelay.assertNotSupported(ctx, 'listUsers');

        const typedInput: SlackListUsersInput = SlackListUsersInputSchema.parse(input);

        const params: Record<string, string | number | boolean> = {
          limit: typedInput.limit,
        };
        if (typedInput.cursor) params.cursor = typedInput.cursor;
        if (typedInput.includeLocale !== undefined) {
          params.include_locale = typedInput.includeLocale;
        }

        const response = await slackRequestWithRateLimitRetry({
          ctx,
          action: 'listUsers',
          maxRetries: SLACK_MAX_RETRIES,
          request: () => ctx.client.get(`${SLACK_API_BASE}/users.list`, { params }),
        });

        if (!response.data.ok) {
          throw new Error(
            formatSlackApiErrorMessage({
              action: 'listUsers',
              responseData: response.data,
              responseHeaders: response.headers,
            })
          );
        }

        if (typedInput.raw) {
          return response.data;
        }

        const rawMembers = Array.isArray(response.data.members) ? response.data.members : [];
        const nextCursor = response.data.response_metadata?.next_cursor;
        const hasMore = Boolean(nextCursor && nextCursor.length > 0);

        // Slack users.list members carry tz fields, ~12 `is_*` flags, and a profile
        // with the full set of `image_24`..`image_512` avatar URLs. With limit 200
        // and isTool: true, returning them verbatim blows up agent token cost.
        // Project to the fields a workflow / agent actually needs; use `raw: true`
        // to opt back into the full payload.
        const members = rawMembers.map((m: Record<string, unknown>) => {
          const profile = isRecord(m.profile) ? m.profile : undefined;
          return {
            id: m.id,
            name: m.name,
            real_name: m.real_name,
            is_bot: m.is_bot,
            is_admin: m.is_admin,
            is_owner: m.is_owner,
            deleted: m.deleted,
            profile: profile
              ? {
                  email: profile.email,
                  display_name: profile.display_name,
                  real_name: profile.real_name,
                  title: profile.title,
                }
              : undefined,
          };
        });

        return {
          ok: true as const,
          members,
          nextCursor: hasMore ? nextCursor : undefined,
          hasMore,
        };
      },
    },

    // https://api.slack.com/methods/users.conversations
    listUserConversations: {
      isTool: true,
      scope: 'read',
      description:
        'List the channels/conversations a Slack user is a member of (one page per call). Omit user to list for the authenticated user. Pass nextCursor to fetch the next page.',
      input: SlackListUserConversationsInputSchema,
      handler: async (ctx, input) => {
        slackRelay.assertNotSupported(ctx, 'listUserConversations');

        const typedInput: SlackListUserConversationsInput =
          SlackListUserConversationsInputSchema.parse(input);

        const params: Record<string, string | number | boolean> = {
          types: typedInput.types.join(','),
          exclude_archived: typedInput.excludeArchived,
          limit: typedInput.limit,
        };
        if (typedInput.user) params.user = typedInput.user;
        if (typedInput.cursor) params.cursor = typedInput.cursor;

        const response = await slackRequestWithRateLimitRetry<SlackConversationsListResponse>({
          ctx,
          action: 'listUserConversations',
          maxRetries: SLACK_MAX_RETRIES,
          request: () => ctx.client.get(`${SLACK_API_BASE}/users.conversations`, { params }),
        });

        if (!response.data.ok) {
          throw new Error(
            formatSlackApiErrorMessage({
              action: 'listUserConversations',
              responseData: response.data,
              responseHeaders: response.headers,
            })
          );
        }

        if (typedInput.raw) {
          return response.data;
        }

        const channels = response.data.channels ?? [];
        const nextCursor = response.data.response_metadata?.next_cursor;
        const hasMore = Boolean(nextCursor && nextCursor.length > 0);

        return {
          ok: true as const,
          source: 'users.conversations' as const,
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

    // https://api.slack.com/methods/auth.test
    whoAmI: {
      isTool: true,
      scope: 'read',
      description:
        'Return the identity the Slack connector is authenticated as. Useful before sendMessage to confirm the workspace, or to resolve "me" to a user ID for other actions.',
      input: SlackWhoAmIInputSchema,
      handler: async (ctx, input) => {
        slackRelay.assertNotSupported(ctx, 'whoAmI');

        const typedInput: SlackWhoAmIInput = SlackWhoAmIInputSchema.parse(input);

        const response = await slackRequestWithRateLimitRetry<SlackAuthTestResponse>({
          ctx,
          action: 'whoAmI',
          maxRetries: SLACK_MAX_RETRIES,
          request: () => ctx.client.get(`${SLACK_API_BASE}/auth.test`),
        });

        if (!response.data.ok) {
          throw new Error(
            formatSlackApiErrorMessage({
              action: 'whoAmI',
              responseData: response.data,
              responseHeaders: response.headers,
            })
          );
        }

        if (typedInput.raw) {
          return response.data;
        }

        return {
          ok: true as const,
          url: response.data.url,
          team: response.data.team,
          user: response.data.user,
          team_id: response.data.team_id,
          user_id: response.data.user_id,
          bot_id: response.data.bot_id,
          enterprise_id: response.data.enterprise_id,
          is_enterprise_install: response.data.is_enterprise_install,
        };
      },
    },

    // https://api.slack.com/methods/files.info
    getFileInfo: {
      isTool: true,
      scope: 'read',
      description:
        'Look up a single Slack file by ID. Returns the file metadata (name, mimetype, size, urls, sharing channels).',
      input: SlackGetFileInfoInputSchema,
      handler: async (ctx, input) => {
        slackRelay.assertNotSupported(ctx, 'getFileInfo');

        const typedInput: SlackGetFileInfoInput = SlackGetFileInfoInputSchema.parse(input);

        const response = await slackRequestWithRateLimitRetry<SlackFilesInfoResponse>({
          ctx,
          action: 'getFileInfo',
          maxRetries: SLACK_MAX_RETRIES,
          request: () =>
            ctx.client.get(`${SLACK_API_BASE}/files.info`, {
              params: { file: typedInput.file },
            }),
        });

        if (!response.data.ok) {
          throw new Error(
            formatSlackApiErrorMessage({
              action: 'getFileInfo',
              responseData: response.data,
              responseHeaders: response.headers,
            })
          );
        }

        return typedInput.raw ? response.data : response.data.file;
      },
    },

    // https://api.slack.com/methods/files.list
    // Classic-paginated: uses `page`/`pages`, not cursor-based pagination.
    listFiles: {
      isTool: true,
      scope: 'read',
      description:
        'List Slack files (one page per call). Filter by channel, user, time range, or types. Pass nextPage from the previous response to fetch the next page.',
      input: SlackListFilesInputSchema,
      handler: async (ctx, input) => {
        slackRelay.assertNotSupported(ctx, 'listFiles');

        const typedInput: SlackListFilesInput = SlackListFilesInputSchema.parse(input);

        const params: Record<string, string | number | boolean> = {
          count: typedInput.count,
          page: typedInput.page,
        };
        if (typedInput.channel) params.channel = typedInput.channel;
        if (typedInput.user) params.user = typedInput.user;
        if (typedInput.tsFrom) params.ts_from = typedInput.tsFrom;
        if (typedInput.tsTo) params.ts_to = typedInput.tsTo;
        if (typedInput.types) params.types = typedInput.types;

        const response = await slackRequestWithRateLimitRetry<SlackFilesListResponse>({
          ctx,
          action: 'listFiles',
          maxRetries: SLACK_MAX_RETRIES,
          request: () => ctx.client.get(`${SLACK_API_BASE}/files.list`, { params }),
        });

        if (!response.data.ok) {
          throw new Error(
            formatSlackApiErrorMessage({
              action: 'listFiles',
              responseData: response.data,
              responseHeaders: response.headers,
            })
          );
        }

        if (typedInput.raw) {
          return response.data;
        }

        // Slack file objects carry a dozen URL/thumbnail variants per file; project
        // to the fields a workflow / agent actually needs. Opt into the full
        // payload with raw: true.
        const files = (response.data.files ?? []).map((f: SlackFile) => ({
          id: f.id,
          name: f.name,
          title: f.title,
          mimetype: f.mimetype,
          filetype: f.filetype,
          user: f.user,
          size: f.size,
          created: f.created,
          url_private: f.url_private,
          permalink: f.permalink,
          channels: f.channels,
        }));

        const paging = response.data.paging;
        const currentPage = paging?.page ?? typedInput.page;
        const totalPages = paging?.pages ?? currentPage;
        const hasMore = currentPage < totalPages;

        return {
          ok: true as const,
          files,
          page: currentPage,
          pages: totalPages,
          total: paging?.total,
          nextPage: hasMore ? currentPage + 1 : undefined,
          hasMore,
        };
      },
    },

    // https://api.slack.com/methods/conversations.create
    createConversation: {
      isTool: true,
      scope: 'write',
      description:
        'Create a new Slack channel (public or private). Returns the created channel object including its ID. Use this to spin up a dedicated incident war-room channel, then pass the channel ID to inviteToConversation to add responders.',
      input: SlackCreateConversationInputSchema,
      handler: async (ctx, input) => {
        slackRelay.assertNotSupported(ctx, 'createConversation');

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
      isTool: true,
      scope: 'write',
      description:
        'Invite one or more users to a Slack channel by channel ID and user IDs. Typically used after createConversation to populate a new incident channel with the right responders.',
      input: SlackInviteToConversationInputSchema,
      handler: async (ctx, input) => {
        slackRelay.assertNotSupported(ctx, 'inviteToConversation');

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
      scope: 'write',
      description:
        'Send a message to a Slack channel or DM. Accepts a conversation ID, or a connected channel name (e.g. "#general") on the Elastic Slack app. Use listChannels to discover channels, or resolveChannelId when you know the name and need its ID. Returns the message timestamp, which can be used as threadTs to post a reply in a thread. Confirm the message content and destination with the user before sending unless they have already made their intent explicit.',
      input: SlackSendMessageInputSchema,
      handler: async (ctx, input) => {
        const typedInput: SlackSendMessageInput = SlackSendMessageInputSchema.parse(input);

        const relayConnection = slackRelay.getConnection(ctx);
        if (relayConnection) {
          return slackRelay.actions.sendMessage(relayConnection, ctx, typedInput);
        }

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

          // Normalize to { timestamp } so the caller can use it as threadTs for replies.
          // This distinguishes V2 from V1 slack_api which returned the raw Slack envelope.
          return { timestamp: response.data.ts };
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

    // https://api.slack.com/methods/chat.postMessage (Block Kit payload)
    sendBlockKitMessage: {
      isTool: true,
      scope: 'write',
      description:
        'Post a rich Block Kit message to a Slack channel or DM. Use this instead of sendMessage when you need formatted cards, buttons, images, or interactive elements. Accepts a blocks[] array following the Slack Block Kit schema. Returns the message timestamp, which can be used as threadTs for replies.',
      input: SlackSendBlockKitMessageInputSchema,
      handler: async (ctx, input) => {
        const typedInput: SlackSendBlockKitMessageInput =
          SlackSendBlockKitMessageInputSchema.parse(input);

        const payload: Record<string, unknown> = {
          channel: typedInput.channel,
          blocks: typedInput.blocks,
        };

        if (typedInput.text) payload.text = typedInput.text;
        if (typedInput.threadTs) payload.thread_ts = typedInput.threadTs;
        if (typedInput.unfurlLinks !== undefined) payload.unfurl_links = typedInput.unfurlLinks;
        if (typedInput.unfurlMedia !== undefined) payload.unfurl_media = typedInput.unfurlMedia;

        try {
          ctx.log.debug(`Slack sendBlockKitMessage request: channel=${typedInput.channel}`);
          const response = await slackRequestWithRateLimitRetry<SlackChatPostMessageResponse>({
            ctx,
            action: 'sendBlockKitMessage',
            maxRetries: SLACK_MAX_RETRIES,
            request: () =>
              ctx.client.post(`${SLACK_API_BASE}/chat.postMessage`, payload, {
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
              }),
          });

          if (!response.data.ok) {
            throw new Error(
              formatSlackApiErrorMessage({
                action: 'sendBlockKitMessage',
                responseData: response.data,
                responseHeaders: response.headers,
              })
            );
          }

          return { timestamp: response.data.ts };
        } catch (error) {
          const err = error as AxiosError<unknown>;
          ctx.log.error(
            `Slack sendBlockKitMessage failed: ${err.message}, Status: ${
              err.response?.status
            }, Data: ${JSON.stringify(err.response?.data)}`
          );
          throw error;
        }
      },
    },

    // https://api.slack.com/methods/conversations.replies
    getConversationReplies: {
      isTool: true,
      scope: 'read',
      description:
        'Fetch threaded replies for a message in a Slack channel or DM. Pass the channel ID and the parent message timestamp (threadTs). Returns replies newest-first; pass nextCursor to fetch older pages.',
      input: SlackGetConversationRepliesInputSchema,
      handler: async (ctx, input) => {
        const typedInput: SlackGetConversationRepliesInput =
          SlackGetConversationRepliesInputSchema.parse(input);

        const params: Record<string, string | number | boolean> = {
          channel: typedInput.channel,
          ts: typedInput.ts,
          limit: typedInput.limit,
        };
        if (typedInput.oldest) params.oldest = typedInput.oldest;
        if (typedInput.latest) params.latest = typedInput.latest;
        if (typedInput.inclusive !== undefined) params.inclusive = typedInput.inclusive;
        if (typedInput.cursor) params.cursor = typedInput.cursor;

        const response = await slackRequestWithRateLimitRetry<SlackConversationsRepliesResponse>({
          ctx,
          action: 'getConversationReplies',
          maxRetries: SLACK_MAX_RETRIES,
          request: () => ctx.client.get(`${SLACK_API_BASE}/conversations.replies`, { params }),
        });

        if (!response.data.ok) {
          throw new Error(
            formatSlackApiErrorMessage({
              action: 'getConversationReplies',
              responseData: response.data,
              responseHeaders: response.headers,
            })
          );
        }

        if (typedInput.raw) {
          return response.data;
        }

        const messages = response.data.messages ?? [];
        const nextCursor = response.data.response_metadata?.next_cursor;
        const hasMore = Boolean(response.data.has_more) || Boolean(nextCursor);

        return {
          ok: true as const,
          channel: typedInput.channel,
          ts: typedInput.ts,
          messages: messages.map((m) => ({
            ts: m.ts,
            type: m.type,
            subtype: m.subtype,
            user: m.user,
            bot_id: m.bot_id,
            username: m.username,
            text:
              m.text && m.text.length > 0
                ? m.text
                : m.attachments?.find((a) => a.fallback)?.fallback ??
                  m.attachments?.find((a) => a.text)?.text ??
                  m.text,
            thread_ts: m.thread_ts,
            reply_count: m.reply_count,
            blocks: m.blocks,
            attachments: m.attachments,
            files: m.files,
          })),
          nextCursor: nextCursor && nextCursor.length > 0 ? nextCursor : undefined,
          hasMore,
        };
      },
    },

    // https://api.slack.com/methods/chat.update
    updateMessage: {
      isTool: true,
      scope: 'write',
      description:
        'Edit an existing Slack message in-place. Use this to update an alert card as its state transitions (e.g. open → acknowledged → resolved) without posting new messages. Requires the channel ID and the message timestamp (ts) from the original sendMessage or sendBlockKitMessage response.',
      input: SlackUpdateMessageInputSchema,
      handler: async (ctx, input) => {
        const typedInput: SlackUpdateMessageInput = SlackUpdateMessageInputSchema.parse(input);

        const payload: Record<string, unknown> = {
          channel: typedInput.channel,
          ts: typedInput.ts,
        };
        if (typedInput.text !== undefined) payload.text = typedInput.text;
        if (typedInput.blocks !== undefined) payload.blocks = typedInput.blocks;

        try {
          ctx.log.debug(
            `Slack updateMessage request: channel=${typedInput.channel} ts=${typedInput.ts}`
          );
          const response = await slackRequestWithRateLimitRetry<SlackChatUpdateResponse>({
            ctx,
            action: 'updateMessage',
            maxRetries: SLACK_MAX_RETRIES,
            request: () =>
              ctx.client.post(`${SLACK_API_BASE}/chat.update`, payload, {
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
              }),
          });

          if (!response.data.ok) {
            throw new Error(
              formatSlackApiErrorMessage({
                action: 'updateMessage',
                responseData: response.data,
                responseHeaders: response.headers,
              })
            );
          }

          return {
            ok: true as const,
            channel: response.data.channel,
            ts: response.data.ts,
            text: response.data.text,
          };
        } catch (error) {
          const err = error as AxiosError<unknown>;
          ctx.log.error(
            `Slack updateMessage failed: ${err.message}, Status: ${
              err.response?.status
            }, Data: ${JSON.stringify(err.response?.data)}`
          );
          throw error;
        }
      },
    },

    // https://api.slack.com/methods/reactions.add
    addReaction: {
      isTool: true,
      scope: 'write',
      description:
        'Add an emoji reaction to a Slack message. Use as a lightweight acknowledgement signal (e.g. adding "eyes" when an alert is seen, "white_check_mark" when resolved). Requires the channel ID, message timestamp, and emoji name (without colons).',
      input: SlackAddReactionInputSchema,
      handler: async (ctx, input) => {
        const typedInput: SlackAddReactionInput = SlackAddReactionInputSchema.parse(input);

        const payload: Record<string, unknown> = {
          channel: typedInput.channel,
          timestamp: typedInput.timestamp,
          name: typedInput.name,
        };

        try {
          ctx.log.debug(
            `Slack addReaction request: channel=${typedInput.channel} name=${typedInput.name}`
          );
          const response = await slackRequestWithRateLimitRetry({
            ctx,
            action: 'addReaction',
            maxRetries: SLACK_MAX_RETRIES,
            request: () =>
              ctx.client.post(`${SLACK_API_BASE}/reactions.add`, payload, {
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
              }),
          });

          if (!response.data.ok) {
            throw new Error(
              formatSlackApiErrorMessage({
                action: 'addReaction',
                responseData: response.data,
                responseHeaders: response.headers,
              })
            );
          }

          return { ok: true as const };
        } catch (error) {
          const err = error as AxiosError<unknown>;
          ctx.log.error(
            `Slack addReaction failed: ${err.message}, Status: ${
              err.response?.status
            }, Data: ${JSON.stringify(err.response?.data)}`
          );
          throw error;
        }
      },
    },

    // https://api.slack.com/methods/files.getUploadURLExternal (Slack v2 upload flow)
    uploadFile: {
      isTool: true,
      scope: 'write',
      description:
        'Upload a file to Slack and optionally share it into a channel or thread. Supports text and binary content (use encoding="base64" for binary). Uses the Slack v2 upload flow (getUploadURLExternal + PUT + completeUploadExternal). WARNING: file content is included in the action payload — only call this when you have a concrete file to share (e.g. an incident report, log snippet, or screenshot).',
      input: SlackUploadFileInputSchema,
      handler: async (ctx, input) => {
        const typedInput: SlackUploadFileInput = SlackUploadFileInputSchema.parse(input);

        // Decode content to a Buffer for accurate byte-length calculation.
        const contentBuffer =
          typedInput.encoding === 'base64'
            ? Buffer.from(typedInput.content, 'base64')
            : Buffer.from(typedInput.content, 'utf8');
        const contentLength = contentBuffer.length;

        // Step 1: Get an upload URL from Slack.
        ctx.log.debug(
          `Slack uploadFile step 1 — getUploadURLExternal: filename=${typedInput.filename} length=${contentLength}`
        );
        const uploadUrlResponse =
          await slackRequestWithRateLimitRetry<SlackFilesGetUploadURLResponse>({
            ctx,
            action: 'uploadFile/getUploadURLExternal',
            maxRetries: SLACK_MAX_RETRIES,
            request: () =>
              ctx.client.post(
                `${SLACK_API_BASE}/files.getUploadURLExternal`,
                { filename: typedInput.filename, length: contentLength },
                { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
              ),
          });

        if (!uploadUrlResponse.data.ok || !uploadUrlResponse.data.upload_url) {
          throw new Error(
            formatSlackApiErrorMessage({
              action: 'uploadFile/getUploadURLExternal',
              responseData: uploadUrlResponse.data,
              responseHeaders: uploadUrlResponse.headers,
            })
          );
        }

        const { upload_url: uploadUrl, file_id: fileId } = uploadUrlResponse.data;

        // Step 2: PUT the file content to the pre-signed upload URL.
        ctx.log.debug(`Slack uploadFile step 2 — PUT content to upload URL`);
        await ctx.client.put(uploadUrl, contentBuffer, {
          headers: { 'Content-Type': 'application/octet-stream' },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        });

        // Step 3: Complete the upload and optionally share to a channel.
        const completePayload: Record<string, unknown> = {
          files: [{ id: fileId }],
        };
        if (typedInput.channel) completePayload.channel_id = typedInput.channel;
        if (typedInput.initialComment) completePayload.initial_comment = typedInput.initialComment;
        if (typedInput.threadTs) completePayload.thread_ts = typedInput.threadTs;
        if (typedInput.title) {
          // The title is set on the file object in the files array, not at the top level.
          completePayload.files = [{ id: fileId, title: typedInput.title }];
        }

        ctx.log.debug(`Slack uploadFile step 3 — completeUploadExternal: fileId=${fileId}`);
        const completeResponse =
          await slackRequestWithRateLimitRetry<SlackFilesCompleteUploadResponse>({
            ctx,
            action: 'uploadFile/completeUploadExternal',
            maxRetries: SLACK_MAX_RETRIES,
            request: () =>
              ctx.client.post(`${SLACK_API_BASE}/files.completeUploadExternal`, completePayload, {
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
              }),
          });

        if (!completeResponse.data.ok) {
          throw new Error(
            formatSlackApiErrorMessage({
              action: 'uploadFile/completeUploadExternal',
              responseData: completeResponse.data,
              responseHeaders: completeResponse.headers,
            })
          );
        }

        const uploadedFile = completeResponse.data.files?.[0];
        return {
          ok: true as const,
          fileId,
          title: uploadedFile?.title,
        };
      },
    },

    // https://api.slack.com/methods/chat.postMessage (interactive Block Kit for HITL)
    askQuestion: {
      isTool: true,
      scope: 'write',
      description:
        'Post an interactive question to a Slack channel or user with button response options. Returns the message timestamp so the question can be tracked. NOTE: resolving the human response requires an inbound Slack interactivity callback — the response half is not yet handled by this connector. Use this to send the prompt now and wire the response via an external event trigger when available.',
      input: SlackAskQuestionInputSchema,
      handler: async (ctx, input) => {
        const typedInput: SlackAskQuestionInput = SlackAskQuestionInputSchema.parse(input);

        // Build a Block Kit message with a section for the question and an actions block with buttons.
        const blocks: unknown[] = [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: typedInput.question },
          },
          {
            type: 'actions',
            elements: typedInput.buttons.map((btn) => {
              const element: Record<string, unknown> = {
                type: 'button',
                text: { type: 'plain_text', text: btn.text, emoji: true },
                value: btn.value,
                action_id: `ask_question_${btn.value.slice(0, 50)}`,
              };
              if (btn.style) element.style = btn.style;
              return element;
            }),
          },
        ];

        const payload: Record<string, unknown> = {
          channel: typedInput.channel,
          text: typedInput.question,
          blocks,
        };
        if (typedInput.threadTs) payload.thread_ts = typedInput.threadTs;

        try {
          ctx.log.debug(`Slack askQuestion request: channel=${typedInput.channel}`);
          const response = await slackRequestWithRateLimitRetry<SlackChatPostMessageResponse>({
            ctx,
            action: 'askQuestion',
            maxRetries: SLACK_MAX_RETRIES,
            request: () =>
              ctx.client.post(`${SLACK_API_BASE}/chat.postMessage`, payload, {
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
              }),
          });

          if (!response.data.ok) {
            throw new Error(
              formatSlackApiErrorMessage({
                action: 'askQuestion',
                responseData: response.data,
                responseHeaders: response.headers,
              })
            );
          }

          return {
            ok: true as const,
            timestamp: response.data.ts,
            channelId: response.data.channel,
          };
        } catch (error) {
          const err = error as AxiosError<unknown>;
          ctx.log.error(
            `Slack askQuestion failed: ${err.message}, Status: ${
              err.response?.status
            }, Data: ${JSON.stringify(err.response?.data)}`
          );
          throw error;
        }
      },
    },
  },

  events: slackEvents,

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.slack.test.description', {
      defaultMessage: 'Verifies Slack connection by checking API access',
    }),
    handler: async (ctx) => {
      ctx.log.debug('Slack test handler');

      const relayConnection = slackRelay.getConnection(ctx);
      if (relayConnection) {
        return slackRelay.test(relayConnection, ctx);
      }

      // Test connection by calling auth.test which validates the token
      const response = await ctx.client.get(`${SLACK_API_BASE}/auth.test`);
      if (!response.data.ok) {
        throw new Error(
          formatSlackApiErrorMessage({
            action: 'test',
            responseData: response.data,
            responseHeaders: response.headers,
          })
        );
      }
      return {};
    },
    enabled: true,
  },

  skill: [
    'Use whoAmI before any write or "as me" action to confirm the authenticated workspace/user. It is also the cheapest way to translate the implicit "me" to a concrete user_id for listUserConversations or message attribution.',
    'searchMessages requires a user token (EARS or OAuth). If this connector uses a bot token, searchMessages will fail — use getConversationHistory with a specific channel ID to read recent messages instead.',
    'To list Slack channels or answer which channels exist, use listChannels. When the response has hasMore true, call listChannels again with the nextCursor from the previous response until you have enough context.',
    'When sending to a channel whose name you know but whose ID you do not, call resolveChannelId to get the channel ID, then pass it to sendMessage.',
    'Do not use resolveChannelId to discover channels—for example, do not use contains with a very short partial name to probe the workspace. Use listChannels for discovery instead.',
    'sendMessage returns { timestamp } which you can use as threadTs in a follow-up sendMessage, sendBlockKitMessage, or askQuestion to post a reply in the same thread.',
    'Use sendBlockKitMessage instead of sendMessage when the message needs formatted cards, buttons, sections, or images. Block Kit is the only way to attach interactive elements like approval buttons.',
    'To update an existing message (e.g. change alert state from "open" to "acknowledged"), use updateMessage with the channel ID and the timestamp from the original sendMessage/sendBlockKitMessage response. This edits the message in-place rather than posting a new one.',
    'addReaction adds a lightweight emoji acknowledgement to a message. Use it as a quick ack signal (e.g. "eyes" when seen, "white_check_mark" when resolved) without cluttering the channel with new messages.',
    'To read threaded replies on a message, use getConversationReplies with the channel ID and the parent message timestamp. Returns the full thread including the parent message itself.',
    'To read messages from a channel or DM, use getConversationHistory with a channel ID. Returns messages newest-first; pass nextCursor from the previous response (or use oldest/latest timestamps) to walk further back in time.',
    "getConversationInfo returns metadata (name, privacy, topic, purpose) for a single channel/DM by ID. Prefer it over listChannels when you already have the ID and only need that conversation's details.",
    'To find a Slack user, prefer lookupUserByEmail when you have the email. Use listUsers only when you need to browse or enumerate the workspace; it is paginated.',
    "listUserConversations returns the channels a given user (or the authenticated user, if user is omitted) is a member of. Prefer it over listChannels when you only care about a specific user's memberships.",
    'When a user identity comes back from one action as an ID (e.g. a message author_user_id) and you need their email or profile, resolve it via listUsers or by feeding a known email to lookupUserByEmail.',
    'For Slack files: use uploadFile to attach text or binary content (log snippets, reports, screenshots) to a channel; set encoding="base64" for binary content. Use getFileInfo with a file ID (F...) when a message references a file you need metadata for, and listFiles when browsing or scoping by channel/user/time range.',
    'For incident war-room orchestration: createConversation creates a new channel, then inviteToConversation adds the responders, and sendMessage or sendBlockKitMessage posts the initial alert briefing.',
    'askQuestion posts an interactive prompt with button options to a Slack channel or user. The message timestamp is returned for tracking. To act on the button click, wire an external interactivity callback (the response half is not yet built into this connector).',
    'V1 migration note: V1 slack_api.postMessage returned the raw Slack envelope ({ok, channel, ts, message}). V2 sendMessage returns { timestamp } (normalized ts). Replace V1 message field references with text, channels[] with a resolved channelId (use resolveChannelId since V2 requires an ID), and raw ts with the normalized timestamp.',
  ].join('\n'),
};
