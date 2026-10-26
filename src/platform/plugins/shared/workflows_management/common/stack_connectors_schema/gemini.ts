/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/gemini/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod/v4';

// Gemini connector parameter schema
export const GeminiParamsSchema = z.object({
  body: z.string(),
  model: z.string().optional(),
});

// Gemini connector response schema
export const GeminiResponseSchema = z.object({
  candidates: z.array(
    z.object({
      content: z.object({
        parts: z.array(
          z.object({
            text: z.string(),
          })
        ),
        role: z.string(),
      }),
      finishReason: z.string().optional(),
    })
  ),
  usageMetadata: z
    .object({
      promptTokenCount: z.number(),
      candidatesTokenCount: z.number(),
      totalTokenCount: z.number(),
    })
    .optional(),
});
