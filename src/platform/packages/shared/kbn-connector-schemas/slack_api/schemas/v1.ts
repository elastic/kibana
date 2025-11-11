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

export const SlackApiParamsSchema = z.union([
  ValidChannelIdParamsSchema,
  PostMessageParamsSchema,
  PostBlockkitParamsSchema,
]);
