/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z } from '@kbn/zod';

export const MAX_ALLOWED_CHANNELS = 500;

export const SlackApiSecretsSchema = z
  .object({
    token: z.string().min(1),
  })
  .strict();

export const SlackApiConfigSchema = z
  .object({
    allowedChannels: z
      .array(
        z
          .object({
            id: z.string().min(1).optional(),
            name: z.string().min(1),
          })
          .strict()
      )
      .max(MAX_ALLOWED_CHANNELS)
      .optional(),
  })
  .strict();

export const ValidChannelIdSubActionParamsSchema = z
  .object({
    channelId: z.string().optional(),
  })
  .strict();

export const ValidChannelIdParamsSchema = z
  .object({
    subAction: z.literal('validChannelId'),
    subActionParams: ValidChannelIdSubActionParamsSchema,
  })
  .strict();

export const PostMessageSubActionParamsSchema = z
  .object({
    /**
     * @deprecated Use `channelNames` or `channelIds` instead
     * `channelNames` takes priority over `channelIds` and `channels`
     */
    channels: z.array(z.string()).max(1).optional(),
    channelIds: z.array(z.string()).max(1).optional(),
    channelNames: z
      // min of two characters to account for '#' prefix
      .array(z.string().min(2).max(200).superRefine(validateChannelName))
      .max(1)
      .optional(),
    text: z.string().min(1),
  })
  .strict();

export function validateBlockkit(text: string, ctx: z.RefinementCtx) {
  try {
    const parsedText = JSON.parse(text);

    if (!Object.hasOwn(parsedText, 'blocks')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'block kit body must contain field "blocks"',
      });
    }
  } catch (err) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `block kit body is not valid JSON - ${err.message}`,
    });
  }
}

export function validateChannelName(value: string | undefined, ctx: z.RefinementCtx) {
  if (!value || value.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Channel name cannot be empty',
    });
    return;
  }

  if (!value.startsWith('#')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Channel name must start with #',
    });
  }
}

export const PostBlockkitSubActionParamsSchema = z
  .object({
    /**
     * @deprecated Use `channelNames` or `channelIds` instead
     * `channelNames` takes priority over `channelIds` and `channels`
     */
    channels: z.array(z.string()).max(1).optional(),
    channelIds: z.array(z.string()).max(1).optional(),
    channelNames: z.array(z.string().superRefine(validateChannelName)).max(1).optional(),
    text: z.string().superRefine(validateBlockkit),
  })
  .strict();

export const PostMessageParamsSchema = z
  .object({
    subAction: z.literal('postMessage'),
    subActionParams: PostMessageSubActionParamsSchema,
  })
  .strict();

export const PostBlockkitParamsSchema = z
  .object({
    subAction: z.literal('postBlockkit'),
    subActionParams: PostBlockkitSubActionParamsSchema,
  })
  .strict();

export const GetConversationsListSubActionParamsSchema = z
  .object({
    types: z.string().optional(),
    cursor: z.string().optional(),
    excludeArchived: z.boolean().optional(),
    limit: z.number().int().min(1).max(1000).optional(),
  })
  .strict();

export const GetConversationsListParamsSchema = z
  .object({
    subAction: z.literal('getConversationsList'),
    subActionParams: GetConversationsListSubActionParamsSchema,
  })
  .strict();

export const GetConversationsHistorySubActionParamsSchema = z
  .object({
    channel: z.string().min(1),
    oldest: z.number().optional(),
    cursor: z.string().optional(),
    limit: z.number().int().min(1).max(1000).optional(),
  })
  .strict();

export const GetConversationsHistoryParamsSchema = z
  .object({
    subAction: z.literal('getConversationsHistory'),
    subActionParams: GetConversationsHistorySubActionParamsSchema,
  })
  .strict();

export const GetConversationsRepliesSubActionParamsSchema = z
  .object({
    channel: z.string().min(1),
    ts: z.string().min(1),
  })
  .strict();

export const GetConversationsRepliesParamsSchema = z
  .object({
    subAction: z.literal('getConversationsReplies'),
    subActionParams: GetConversationsRepliesSubActionParamsSchema,
  })
  .strict();

export const GetUsersListSubActionParamsSchema = z
  .object({
    cursor: z.string().optional(),
    limit: z.number().int().min(1).max(1000).optional(),
  })
  .strict();

export const GetUsersListParamsSchema = z
  .object({
    subAction: z.literal('getUsersList'),
    subActionParams: GetUsersListSubActionParamsSchema,
  })
  .strict();

export const GetChannelDigestSubActionParamsSchema = z
  .object({
    since: z.number().int().min(0),
    types: z.array(z.enum(['public_channel', 'private_channel', 'im', 'mpim'])).min(1),
    keywords: z.array(z.string()).optional(),
  })
  .strict();

export const GetChannelDigestParamsSchema = z
  .object({
    subAction: z.literal('getChannelDigest'),
    subActionParams: GetChannelDigestSubActionParamsSchema,
  })
  .strict();

export const SlackApiParamsSchema = z.union([
  ValidChannelIdParamsSchema,
  PostMessageParamsSchema,
  PostBlockkitParamsSchema,
  GetConversationsListParamsSchema,
  GetConversationsHistoryParamsSchema,
  GetConversationsRepliesParamsSchema,
  GetUsersListParamsSchema,
  GetChannelDigestParamsSchema,
]);
