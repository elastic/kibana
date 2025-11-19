/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/openai/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod/v4';

// OpenAI connector parameter schema
export const OpenAIParamsSchema = z.object({
  body: z.string(),
  model: z.string().optional(),
  n: z.number().optional(),
  stop: z.array(z.string()).optional(),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
});

// OpenAI connector response schema
export const OpenAIResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        role: z.string(),
        content: z.string(),
      }),
      finish_reason: z.string().optional(),
    })
  ),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      total_tokens: z.number(),
    })
    .optional(),
});
