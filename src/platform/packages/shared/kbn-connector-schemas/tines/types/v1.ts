/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { z } from '@kbn/zod';
import type {
  TinesConfigSchema,
  TinesSecretsSchema,
  TinesRunActionParamsSchema,
  TinesRunActionResponseSchema,
  TinesStoriesActionResponseSchema,
  TinesWebhooksActionResponseSchema,
  TinesWebhooksActionParamsSchema,
  TinesWebhookObjectSchema,
  TinesWebhookActionConfigSchema,
  TinesStoryObjectSchema,
} from '../schemas/v1';

export type TinesConfig = z.infer<typeof TinesConfigSchema>;
export type TinesSecrets = z.infer<typeof TinesSecretsSchema>;
export type TinesRunActionParams = z.infer<typeof TinesRunActionParamsSchema>;
export type TinesRunActionResponse = z.infer<typeof TinesRunActionResponseSchema>;
export type TinesStoriesActionParams = void;
export type TinesStoryObject = z.infer<typeof TinesStoryObjectSchema>;
export type TinesStoriesActionResponse = z.infer<typeof TinesStoriesActionResponseSchema>;
export type TinesWebhooksActionParams = z.infer<typeof TinesWebhooksActionParamsSchema>;
export type TinesWebhooksActionResponse = z.infer<typeof TinesWebhooksActionResponseSchema>;
export type TinesWebhookActionConfig = z.infer<typeof TinesWebhookActionConfigSchema>;
export type TinesWebhookObject = z.infer<typeof TinesWebhookObjectSchema>;
