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

export const ListChannelsInputSchema = z.object({
  teamId: z.string().describe('The ID of the team'),
});
export type ListChannelsInput = z.infer<typeof ListChannelsInputSchema>;

export const ListChannelMessagesInputSchema = z.object({
  teamId: z.string().describe('The ID of the team'),
  channelId: z.string().describe('The ID of the channel'),
  top: z
    .number()
    .min(1)
    .max(50)
    .optional()
    .describe('Number of messages to return (max 50; default: 20)'),
});
export type ListChannelMessagesInput = z.infer<typeof ListChannelMessagesInputSchema>;

export const ListChatsInputSchema = z.object({
  userId: z
    .string()
    .optional()
    .describe(
      'User ID for app-only auth via client credentials. Omit when using delegated auth (bearer token).'
    ),
  top: z.number().min(1).optional().describe('Number of chats to return (max 50; default: 20)'),
});
export type ListChatsInput = z.infer<typeof ListChatsInputSchema>;

export const ListChatMessagesInputSchema = z.object({
  chatId: z.string().describe('The ID of the chat'),
  top: z.number().min(1).optional().describe('Number of messages to return (max 50; default: 20)'),
});
export type ListChatMessagesInput = z.infer<typeof ListChatMessagesInputSchema>;

export const SearchMessagesInputSchema = z.object({
  query: z.string().describe('Search query (supports KQL syntax, e.g. "from:bob sent>2024-01-01")'),
  from: z
    .number()
    .optional()
    .describe(
      'Zero-based offset for pagination (default: 0). Combine with size to page through results.'
    ),
  size: z
    .number()
    .optional()
    .describe('Number of results to return (max 25; default: 25 when omitted)'),
  enableTopResults: z.boolean().optional().describe('Sort results by relevance (default: false)'),
});
export type SearchMessagesInput = z.infer<typeof SearchMessagesInputSchema>;
