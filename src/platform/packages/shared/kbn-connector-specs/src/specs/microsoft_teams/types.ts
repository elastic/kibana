/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// =============================================================================
// Action input schemas & inferred types
// =============================================================================

export const ListJoinedTeamsInputSchema = z
  .object({
    userId: z
      .string()
      .optional()
      .describe(
        'User ID for app-only auth via client credentials. Omit when using delegated auth (bearer token).'
      ),
  })
  .optional();
export type ListJoinedTeamsInput = z.infer<typeof ListJoinedTeamsInputSchema>;

export const ListChannelsInputSchema = lazySchema(() =>
  z.object({
    teamId: z
      .string()
      .describe(
        'The ID of the Microsoft Team whose channels you want to list. Obtain this from listJoinedTeams (the "id" field on each team object).'
      ),
  })
);
export type ListChannelsInput = z.infer<typeof ListChannelsInputSchema>;

export const ListChannelMessagesInputSchema = lazySchema(() =>
  z.object({
    teamId: z
      .string()
      .describe(
        'The ID of the Microsoft Team containing the channel. Obtain this from listJoinedTeams (the "id" field on each team object).'
      ),
    channelId: z
      .string()
      .describe(
        'The ID of the channel whose messages you want to retrieve. Obtain this from listChannels (the "id" field on each channel object).'
      ),
    top: z
      .number()
      .min(1)
      .max(50)
      .default(20)
      .describe('Number of messages to return (max 50; default: 20)'),
  })
);
export type ListChannelMessagesInput = z.infer<typeof ListChannelMessagesInputSchema>;

export const ListChatsInputSchema = lazySchema(() =>
  z.object({
    userId: z
      .string()
      .optional()
      .describe(
        'User ID for app-only auth via client credentials. Omit when using delegated auth (bearer token).'
      ),
    top: z
      .number()
      .min(1)
      .max(50)
      .default(20)
      .describe('Number of chats to return (max 50; default: 20)'),
  })
);
export type ListChatsInput = z.infer<typeof ListChatsInputSchema>;

export const ListChatMessagesInputSchema = lazySchema(() =>
  z.object({
    chatId: z
      .string()
      .describe(
        'The ID of the chat (direct message or group chat) whose messages you want to retrieve. Obtain this from listChats (the "id" field on each chat object).'
      ),
    top: z
      .number()
      .min(1)
      .max(50)
      .default(20)
      .describe('Number of messages to return (max 50; default: 20)'),
  })
);
export type ListChatMessagesInput = z.infer<typeof ListChatMessagesInputSchema>;

export const SearchMessagesInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .describe('Search query (supports KQL syntax, e.g. "from:bob sent>2024-01-01")'),
    from: z
      .number()
      .optional()
      .describe(
        'Zero-based offset for pagination (default: 0). Combine with size to page through results.'
      ),
    size: z
      .number()
      .min(1)
      .max(25)
      .default(25)
      .describe('Number of results to return (max 25; default: 25 when omitted)'),
    enableTopResults: z
      .boolean()
      .default(false)
      .describe('Sort results by relevance (default: false)'),
  })
);
export type SearchMessagesInput = z.infer<typeof SearchMessagesInputSchema>;
