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
