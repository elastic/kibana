/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z } from '@kbn/zod';

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
            id: z.string().min(1),
            name: z.string().min(1),
          })
          .strict()
      )
      .max(25)
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
    channels: z.array(z.string()).max(1).optional(),
    channelIds: z.array(z.string()).max(1).optional(),
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

export const PostBlockkitSubActionParamsSchema = z
  .object({
    channels: z.array(z.string()).max(1).optional(),
    channelIds: z.array(z.string()).max(1).optional(),
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
