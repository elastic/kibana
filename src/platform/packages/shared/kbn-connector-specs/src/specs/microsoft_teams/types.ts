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
// Shared limits
// =============================================================================
const MAX_FREEFORM = 10000;
const MAX_ID = 200;
const MAX_TITLE = 255;

// =============================================================================
// Action input schemas & inferred types
// =============================================================================

export const ListJoinedTeamsInputSchema = lazySchema(() =>
  z
    .object({
      userId: z
        .string()
        .max(MAX_ID)
        .optional()
        .describe(
          'User ID for app-only auth via client credentials. Omit when using delegated auth (bearer token).'
        ),
    })
    .optional()
);
export type ListJoinedTeamsInput = z.infer<typeof ListJoinedTeamsInputSchema>;

export const ListChannelsInputSchema = lazySchema(() =>
  z.object({
    teamId: z
      .string()
      .max(MAX_ID)
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
      .max(MAX_ID)
      .describe(
        'The ID of the Microsoft Team containing the channel. Obtain this from listJoinedTeams (the "id" field on each team object).'
      ),
    channelId: z
      .string()
      .max(MAX_ID)
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
      .max(MAX_ID)
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
      .max(MAX_ID)
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
      .max(2000)
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

// =============================================================================
// Send / write action input schemas
// =============================================================================

export const SendChannelMessageInputSchema = lazySchema(() =>
  z.object({
    teamId: z
      .string()
      .max(MAX_ID)
      .describe(
        'The ID of the team containing the channel. Obtain this from listJoinedTeams (the "id" field on each team object).'
      ),
    channelId: z
      .string()
      .max(MAX_ID)
      .describe(
        'The ID of the channel to post to. Obtain this from listChannels (the "id" field on each channel object).'
      ),
    content: z
      .string()
      .max(MAX_FREEFORM)
      .describe(
        'The message body text to send. Supports plain text or HTML when contentType is set to "html".'
      ),
    contentType: z
      .enum(['text', 'html'])
      .default('text')
      .describe(
        'Content type of the message body: "text" (default) for plain text, "html" for rich-text HTML messages.'
      ),
    subject: z
      .string()
      .max(MAX_TITLE)
      .optional()
      .describe(
        'Optional subject line for the message. When set, the message is displayed with a subject header in the channel.'
      ),
  })
);
export type SendChannelMessageInput = z.infer<typeof SendChannelMessageInputSchema>;

export const SendChatMessageInputSchema = lazySchema(() =>
  z.object({
    chatId: z
      .string()
      .max(MAX_ID)
      .describe(
        'The ID of the chat (1:1 or group) to send a message to. Obtain this from listChats (the "id" field) or from createChat.'
      ),
    content: z
      .string()
      .max(MAX_FREEFORM)
      .describe(
        'The message body text to send. Supports plain text or HTML when contentType is set to "html".'
      ),
    contentType: z
      .enum(['text', 'html'])
      .default('text')
      .describe(
        'Content type of the message body: "text" (default) for plain text, "html" for rich-text HTML messages.'
      ),
  })
);
export type SendChatMessageInput = z.infer<typeof SendChatMessageInputSchema>;

export const UpdateMessageInputSchema = lazySchema(() =>
  z
    .object({
      messageId: z
        .string()
        .max(MAX_ID)
        .describe(
          'The ID of the message to update. Obtain this from listChannelMessages or listChatMessages (the "id" field).'
        ),
      // Channel message context — provide teamId + channelId for a channel message.
      teamId: z
        .string()
        .max(MAX_ID)
        .optional()
        .describe(
          'The team ID — required when updating a channel message (must be provided with channelId). Obtain this from listJoinedTeams.'
        ),
      channelId: z
        .string()
        .max(MAX_ID)
        .optional()
        .describe(
          'The channel ID — required when updating a channel message (must be provided with teamId). Obtain this from listChannels.'
        ),
      // Chat message context — provide chatId for a chat message.
      chatId: z
        .string()
        .max(MAX_ID)
        .optional()
        .describe(
          'The chat ID — required when updating a chat message. Obtain this from listChats. Mutually exclusive with teamId + channelId.'
        ),
      content: z
        .string()
        .max(MAX_FREEFORM)
        .describe('The new message body text to replace the existing content.'),
      contentType: z
        .enum(['text', 'html'])
        .default('text')
        .describe(
          'Content type of the updated body: "text" (default) for plain text, "html" for rich-text HTML.'
        ),
    })
    .refine(
      (v) => (v.teamId !== undefined && v.channelId !== undefined) || v.chatId !== undefined,
      {
        message:
          'Provide either teamId + channelId (for a channel message) or chatId (for a chat message).',
      }
    )
);
export type UpdateMessageInput = z.infer<typeof UpdateMessageInputSchema>;

export const GetUserInputSchema = lazySchema(() =>
  z.object({
    userId: z
      .string()
      .max(MAX_ID)
      .describe(
        'The user ID (GUID) or user principal name (UPN) to look up. Example UPN: "alice@contoso.com". Example GUID: "00000000-0000-0000-0000-000000000000".'
      ),
  })
);
export type GetUserInput = z.infer<typeof GetUserInputSchema>;

export const CreateChatInputSchema = lazySchema(() =>
  z.object({
    chatType: z
      .enum(['oneOnOne', 'group'])
      .describe(
        'The type of chat to create: "oneOnOne" for a 1:1 direct message (exactly two member IDs required: yourself and the other person) or "group" for a group chat (three or more member IDs required: yourself and two or more others).'
      ),
    memberIds: z
      .array(z.string().max(MAX_ID))
      .min(2)
      .max(20)
      .describe(
        'User IDs (GUIDs or UPNs) of all chat members, including yourself. For "oneOnOne" provide exactly two IDs (your own and the other person\'s); for "group" provide three or more. Use getUser to resolve an email or UPN to a GUID.'
      ),
    topic: z
      .string()
      .max(MAX_TITLE)
      .optional()
      .describe(
        'Optional display topic or title for the chat. Applicable to "group" chats; ignored for "oneOnOne".'
      ),
  })
);
export type CreateChatInput = z.infer<typeof CreateChatInputSchema>;
