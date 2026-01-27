/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z } from '@kbn/zod';

// Connector schema
export const TinesConfigSchema = z.object({ url: z.string() }).strict();
export const TinesSecretsSchema = z.object({ email: z.string(), token: z.string() }).strict();

// Stories action schema
export const TinesStoriesActionParamsSchema = null;
export const TinesStoryObjectSchema = z
  .object({
    id: z.coerce.number(),
    name: z.string(),
    published: z.boolean(),
  })
  .strict();
export const TinesStoriesActionResponseSchema = z
  .object({
    stories: z.array(TinesStoryObjectSchema),
    incompleteResponse: z.boolean(),
  })
  .strict();

// Webhooks action schema
export const TinesWebhooksActionParamsSchema = z.object({ storyId: z.coerce.number() }).strict();
export const TinesWebhookObjectSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  storyId: z.coerce.number(),
});

// Webhooks action configuration schema
export const TinesWebhookActionConfigSchema = z
  .object({
    path: z.string(),
    secret: z.string(),
  })
  .strict();

export const TinesWebhooksActionResponseSchema = z
  .object({
    webhooks: z.array(TinesWebhookObjectSchema),
    incompleteResponse: z.boolean(),
  })
  .strict();

// Run action schema
export const TinesRunActionParamsSchema = z
  .object({
    webhook: TinesWebhookObjectSchema.optional(),
    webhookUrl: z.string().optional(),
    body: z.string(),
  })
  .strict();
export const TinesRunActionResponseSchema = z.object({});
