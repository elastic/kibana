/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

// =============================================================================
// Slack Web API response types (minimal shapes used by this connector spec)
// =============================================================================

export interface SlackAssistantSearchContextMessage {
  author_name?: string;
  author_user_id?: string;
  team_id?: string;
  channel_id?: string;
  channel_name?: string;
  message_ts?: string;
  content?: string;
  is_author_bot?: boolean;
  permalink?: string;
  blocks?: unknown;
  context_messages?: unknown;
}

export interface SlackAssistantSearchContextResponse {
  ok: boolean;
  error?: string;
  needed?: string;
  provided?: string;
  results?: {
    messages?: SlackAssistantSearchContextMessage[];
    files?: unknown[];
    channels?: unknown[];
  };
  response_metadata?: { next_cursor?: string };
}

export interface SlackErrorFields {
  error?: string;
  needed?: string;
  provided?: string;
}

export interface SlackConversationsListChannel {
  id?: string;
  name?: string;
  is_private?: boolean;
  is_archived?: boolean;
  is_member?: boolean;
}

export interface SlackConversationsListResponse extends SlackErrorFields {
  ok: boolean;
  channels?: SlackConversationsListChannel[];
  response_metadata?: { next_cursor?: string };
}

export type SlackConversationsListParams = Record<string, string | number | boolean>;

const SLACK_CONVERSATION_TYPES = ['public_channel', 'private_channel', 'im', 'mpim'] as const;

const SLACK_MAX_CONVERSATIONS_LIST_LIMIT = 1000;
const SLACK_DEFAULT_CONVERSATIONS_LIST_LIMIT = SLACK_MAX_CONVERSATIONS_LIST_LIMIT;
const SLACK_DEFAULT_RESOLVE_CHANNEL_MAX_PAGES = 10;
const SLACK_MAX_RESOLVE_CHANNEL_MAX_PAGES = 100;

const slackConversationTypesWithPublicDefault = () =>
  z
    .array(z.enum(SLACK_CONVERSATION_TYPES))
    .optional()
    .transform(
      (val): Array<(typeof SLACK_CONVERSATION_TYPES)[number]> =>
        val && val.length > 0 ? val : ['public_channel']
    );

export const SlackResolveChannelIdInputSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      'Channel name to resolve (e.g. "general" or "#general"). Returns the first matching conversation ID (C.../G...). To list or browse channels (e.g. what is available), use listChannels instead of probing many names here.'
    ),
  types: slackConversationTypesWithPublicDefault().describe(
    'Conversation types to search. Defaults to public_channel. Valid: public_channel, private_channel, im, mpim.'
  ),
  match: z
    .enum(['exact', 'contains'])
    .default('exact')
    .describe(
      'How to match the channel name. exact is fastest/most precise. contains is for a partial name you already know (e.g. a word from the channel name); do not use contains with very short strings to scan or discover channels — use listChannels for discovery.'
    ),
  excludeArchived: z.boolean().default(true).describe('Exclude archived channels (default true)'),
  cursor: z
    .string()
    .optional()
    .describe('Optional cursor to resume a previous scan (advanced). Usually omit.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(SLACK_MAX_CONVERSATIONS_LIST_LIMIT)
    .default(SLACK_DEFAULT_CONVERSATIONS_LIST_LIMIT)
    .describe(
      `Channels per page to request (1-${SLACK_MAX_CONVERSATIONS_LIST_LIMIT}). Defaults to ${SLACK_DEFAULT_CONVERSATIONS_LIST_LIMIT}.`
    ),
  maxPages: z
    .number()
    .int()
    .min(1)
    .max(SLACK_MAX_RESOLVE_CHANNEL_MAX_PAGES)
    .default(SLACK_DEFAULT_RESOLVE_CHANNEL_MAX_PAGES)
    .describe(
      `Maximum number of pages to scan before giving up. Defaults to ${SLACK_DEFAULT_RESOLVE_CHANNEL_MAX_PAGES}.`
    ),
});
export type SlackResolveChannelIdInput = z.infer<typeof SlackResolveChannelIdInputSchema>;

export const SlackListChannelsInputSchema = z.object({
  types: slackConversationTypesWithPublicDefault().describe(
    'Conversation types to list. Defaults to public_channel only. Valid: public_channel, private_channel, im, mpim.'
  ),
  excludeArchived: z.boolean().default(true).describe('Exclude archived channels (default true)'),
  cursor: z
    .string()
    .optional()
    .describe(
      'Pagination cursor from a previous listChannels response (nextCursor). Omit for the first page.'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(SLACK_MAX_CONVERSATIONS_LIST_LIMIT)
    .default(SLACK_DEFAULT_CONVERSATIONS_LIST_LIMIT)
    .describe(
      `Channels per page to request (1-${SLACK_MAX_CONVERSATIONS_LIST_LIMIT}). Defaults to ${SLACK_DEFAULT_CONVERSATIONS_LIST_LIMIT}.`
    ),
  raw: z
    .boolean()
    .optional()
    .describe(
      'Return the full raw Slack API response instead of a compact, LLM-friendly result. Defaults to false.'
    ),
});

export type SlackListChannelsInput = z.infer<typeof SlackListChannelsInputSchema>;

const SLACK_MAX_SEARCH_RESULTS_PER_PAGE = 20;
export const SLACK_SEARCH_DEFAULT_COUNT = SLACK_MAX_SEARCH_RESULTS_PER_PAGE;

export const SlackSearchMessagesInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      'Plain text search query to find messages. Do NOT embed Slack search operators like from: or in: here — use the dedicated fromUser, inChannel, after, and before parameters instead. Keep queries focused on a few keywords rather than long phrases for better results.'
    ),
  inChannel: z
    .string()
    .optional()
    .describe(
      'Optional Slack search constraint. Adds `in:CHANNEL_NAME` to the query (e.g. in:general).'
    ),
  fromUser: z
    .string()
    .optional()
    .describe(
      "Optional Slack search constraint. Adds `from:USER_ID` (e.g. from:U012ABCDEF) or `from:username` to the query. Accepts a Slack username or user ID, NOT a full name. If you only know a person's full name, search for it as keywords in the query parameter first, then use the sender.username field from results for subsequent filtered searches."
    ),
  after: z
    .string()
    .optional()
    .describe(
      'Optional Slack search constraint. Adds `after:YYYY-MM-DD` to the query (e.g. after:2026-02-10).'
    ),
  before: z
    .string()
    .optional()
    .describe(
      'Optional Slack search constraint. Adds `before:YYYY-MM-DD` to the query (e.g. before:2026-02-10).'
    ),
  sort: z
    .enum(['score', 'timestamp'])
    .optional()
    .describe('Sort order: score (relevance) or timestamp'),
  sortDir: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
  count: z
    .number()
    .int()
    .min(1)
    .max(SLACK_MAX_SEARCH_RESULTS_PER_PAGE)
    .optional()
    .describe(
      `Number of results to return (1-${SLACK_MAX_SEARCH_RESULTS_PER_PAGE}). Slack returns up to ${SLACK_MAX_SEARCH_RESULTS_PER_PAGE} results per page.`
    ),
  cursor: z
    .string()
    .optional()
    .describe(
      'Pagination cursor to fetch the next page of results (use response_metadata.next_cursor from a previous call).'
    ),
  includeContextMessages: z
    .boolean()
    .optional()
    .describe(
      'Include contextual messages (messages before/after the matched message, or thread context). Defaults to true.'
    ),
  includeBots: z.boolean().optional().describe('Include bot-authored messages. Defaults to false.'),
  includeMessageBlocks: z
    .boolean()
    .optional()
    .describe(
      'Include Block Kit blocks in message results (useful for extracting mentions/links). Defaults to true.'
    ),
  raw: z
    .boolean()
    .optional()
    .describe('Return the full raw Slack API response instead of a compact, LLM-friendly result.'),
});
export type SlackSearchMessagesInput = z.infer<typeof SlackSearchMessagesInputSchema>;

export const SlackCreateConversationInputSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      'Name of the channel to create. Channel names can only contain lowercase letters, numbers, hyphens, and underscores, and must be 80 characters or fewer.'
    ),
  isPrivate: z
    .boolean()
    .optional()
    .describe('Whether to create a private channel. Defaults to false (public).'),
});
export type SlackCreateConversationInput = z.infer<typeof SlackCreateConversationInputSchema>;

export const SlackInviteToConversationInputSchema = z.object({
  channel: z
    .string()
    .min(1)
    .describe('The ID of the channel to invite users to (e.g. C... or G...).'),
  users: z
    .string()
    .min(1)
    .describe(
      'Comma-separated list of user IDs to invite to the channel (e.g. U01PWE77HD2,U02ABC1234).'
    ),
});
export type SlackInviteToConversationInput = z.infer<typeof SlackInviteToConversationInputSchema>;

export const SlackSendMessageInputSchema = z.object({
  channel: z
    .string()
    .min(1)
    .describe(
      'Conversation ID to send the message to (e.g. C... for channels, G... for private channels, D... for DMs). Use listChannels to browse available channels, or resolveChannelId when you know the channel name and need its ID.'
    ),
  text: z.string().min(1).describe('The message text to send'),
  threadTs: z
    .string()
    .optional()
    .describe('Timestamp of another message to reply to (creates a threaded reply)'),
  unfurlLinks: z
    .boolean()
    .optional()
    .describe('Whether to enable unfurling of primarily text-based content'),
  unfurlMedia: z.boolean().optional().describe('Whether to enable unfurling of media content'),
});
export type SlackSendMessageInput = z.infer<typeof SlackSendMessageInputSchema>;
