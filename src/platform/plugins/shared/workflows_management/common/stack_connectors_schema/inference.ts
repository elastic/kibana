/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/common/inference/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod/v4';

// AI Message schema (subset of OpenAI.ChatCompletionMessageParam)
const AIMessageZodSchema = z.object({
  role: z.string(),
  content: z.string().nullable().optional(),
  name: z.string().optional(),
  tool_calls: z
    .array(
      z.object({
        id: z.string(),
        function: z.object({
          arguments: z.string().optional(),
          name: z.string().optional(),
        }),
        type: z.string(),
      })
    )
    .optional(),
  tool_call_id: z.string().optional(),
});

// AI Tool schema
const AIToolZodSchema = z.object({
  type: z.string(),
  function: z.object({
    name: z.string(),
    description: z.string().optional(),
    parameters: z.record(z.string(), z.any()).optional(),
  }),
});

// Telemetry metadata schema
const TelemetryMetadataZodSchema = z.object({
  pluginId: z.string().optional(),
  aggregateBy: z.string().optional(),
});

// Inference parameter schemas
export const InferenceUnifiedCompletionParamsSchema = z.object({
  body: z.object({
    messages: z.array(AIMessageZodSchema).default([]),
    model: z.string().optional(),
    max_tokens: z.number().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    n: z.number().optional(),
    stop: z
      .union([z.string(), z.array(z.string())])
      .nullable()
      .optional(),
    temperature: z.number().optional(),
    tool_choice: z
      .union([
        z.string(),
        z.object({
          type: z.string(),
          function: z.object({
            name: z.string(),
          }),
        }),
      ])
      .optional(),
    tools: z.array(AIToolZodSchema).optional(),
    top_p: z.number().optional(),
    user: z.string().optional(),
  }),
  signal: z.any().optional(),
  telemetryMetadata: TelemetryMetadataZodSchema.optional(),
});

export const InferenceCompletionParamsSchema = z.object({
  input: z.string(),
});

export const InferenceRerankParamsSchema = z.object({
  input: z.array(z.string()).default([]),
  query: z.string(),
});

export const InferenceTextEmbeddingParamsSchema = z.object({
  input: z.string(),
  inputType: z.string(),
});

export const InferenceSparseEmbeddingParamsSchema = z.object({
  input: z.string(),
});

// Inference response schemas
export const InferenceUnifiedCompletionResponseSchema = z.object({
  id: z.string(),
  choices: z
    .array(
      z.object({
        finish_reason: z
          .enum(['stop', 'length', 'tool_calls', 'content_filter', 'function_call'])
          .nullable()
          .optional(),
        index: z.number().optional(),
        message: z.object({
          content: z.string().nullable().optional(),
          refusal: z.string().nullable().optional(),
          role: z.string().optional(),
          tool_calls: z
            .array(
              z.object({
                id: z.string().optional(),
                index: z.number().optional(),
                function: z
                  .object({
                    arguments: z.string().optional(),
                    name: z.string().optional(),
                  })
                  .optional(),
                type: z.string().optional(),
              })
            )
            .default([])
            .optional(),
        }),
      })
    )
    .default([]),
  created: z.number().optional(),
  model: z.string().optional(),
  object: z.string().optional(),
  usage: z
    .object({
      completion_tokens: z.number().optional(),
      prompt_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .nullable()
    .optional(),
});

export const InferenceCompletionResponseSchema = z
  .array(
    z.object({
      result: z.string(),
    })
  )
  .default([]);

export const InferenceRerankResponseSchema = z
  .array(
    z.object({
      text: z.string().optional(),
      index: z.number(),
      score: z.number(),
    })
  )
  .default([]);

export const InferenceTextEmbeddingResponseSchema = z
  .array(
    z.object({
      embedding: z.array(z.any()).default([]),
    })
  )
  .default([]);

export const InferenceSparseEmbeddingResponseSchema = z
  .array(z.object({}).passthrough())
  .default([]);
