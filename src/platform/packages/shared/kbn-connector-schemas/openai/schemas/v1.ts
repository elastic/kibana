/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z } from '@kbn/zod';
import { DEFAULT_MODEL, OpenAiProviderType } from '../constants';

export const TelemetryMetadataSchema = z
  .object({
    pluginId: z.string().optional(),
    aggregateBy: z.string().optional(),
  })
  .strict();

// Connector schema
export const ConfigSchema = z.union([
  z
    .object({
      apiProvider: z.enum([OpenAiProviderType.AzureAi]),
      apiUrl: z.string(),
      defaultModel: z.string().optional(),
      headers: z.record(z.string(), z.string()).optional(),
      contextWindowLength: z.coerce.number().optional(),
      temperature: z.coerce.number().optional(),
    })
    .strict(),
  z
    .object({
      apiProvider: z.enum([OpenAiProviderType.OpenAi]),
      apiUrl: z.string(),
      organizationId: z.string().optional(),
      projectId: z.string().optional(),
      defaultModel: z.string().default(DEFAULT_MODEL),
      headers: z.record(z.string(), z.string()).optional(),
      contextWindowLength: z.coerce.number().optional(),
      temperature: z.coerce.number().optional(),
    })
    .strict(),
  z
    .object({
      apiProvider: z.enum([OpenAiProviderType.Other]),
      apiUrl: z.string(),
      defaultModel: z.string(),
      verificationMode: z.enum(['full', 'certificate', 'none']).default('full').optional(),
      headers: z.record(z.string(), z.string()).optional(),
      contextWindowLength: z.coerce.number().optional(),
      temperature: z.coerce.number().optional(),
      enableNativeFunctionCalling: z.boolean().optional(),
    })
    .strict(),
]);

export const SecretsSchema = z.union([
  z.object({ apiKey: z.string() }).strict(),
  z
    .object({
      apiKey: z.string().min(1).optional(),
      certificateData: z.string().min(1).optional(),
      privateKeyData: z.string().min(1).optional(),
      caData: z.string().min(1).optional(),
    })
    .strict(),
]);

// Run action schema
export const RunActionParamsSchema = z
  .object({
    body: z.string(),
    // abort signal from client
    signal: z.any().optional(),
    timeout: z.coerce.number().optional(),
    telemetryMetadata: TelemetryMetadataSchema.optional(),
  })
  .strict();

const AIMessage = z
  .object({
    role: z.string(),
    content: z.string(),
    name: z.string().optional(),
    function_call: z
      .object({
        arguments: z.string(),
        name: z.string(),
      })
      .strict()
      .optional(),
    tool_calls: z
      .array(
        z
          .object({
            id: z.string(),
            function: z
              .object({
                arguments: z.string(),
                name: z.string(),
              })
              .strict(),
            type: z.string(),
          })
          .strict()
      )
      .optional(),
    tool_call_id: z.string().optional(),
  })
  .strict();

// Run action schema
export const InvokeAIActionParamsSchema = z
  .object({
    messages: z.array(AIMessage),
    model: z.string().optional(),
    tools: z
      .array(
        z
          .object({
            type: z.literal('function'),
            function: z
              .object({
                description: z.string().optional(),
                name: z.string(),
                parameters: z.object({}).passthrough(),
                strict: z.boolean().optional(),
              })
              .passthrough(),
          })
          // Not sure if this will include other properties, we should pass them if it does
          .passthrough()
      )
      .optional(),
    tool_choice: z
      .union([
        z.literal('none'),
        z.literal('auto'),
        z.literal('required'),
        z.object({
          type: z.literal('function'),
          function: z.object({ name: z.string() }).passthrough(),
        }),
      ])
      .optional(),
    // Deprecated in favor of tools
    functions: z
      .array(
        z
          .object({
            name: z.string(),
            description: z.string(),
            parameters: z
              .object({
                type: z.string(),
                properties: z.object({}).passthrough(),
                additionalProperties: z.boolean(),
                $schema: z.string(),
              })
              .passthrough(),
          })
          // Not sure if this will include other properties, we should pass them if it does
          .passthrough()
      )
      .optional(),
    // Deprecated in favor of tool_choice
    function_call: z
      .union([
        z.literal('none'),
        z.literal('auto'),
        z.object({
          name: z.string(),
        }),
      ])
      .optional(),
    n: z.coerce.number().optional(),
    stop: z.union([z.string(), z.array(z.string())]).nullish(),
    temperature: z.coerce.number().optional(),
    response_format: z.any().optional(),
    // abort signal from client
    signal: z.any().optional(),
    timeout: z.coerce.number().optional(),
    telemetryMetadata: TelemetryMetadataSchema.optional(),
  })
  .strict();

export const InvokeAIActionResponseSchema = z.object({
  message: z.string(),
  usage: z.object({
    prompt_tokens: z.coerce.number(),
    completion_tokens: z.coerce.number(),
    total_tokens: z.coerce.number(),
  }),
});

// Execute action schema
export const StreamActionParamsSchema = z
  .object({
    body: z.string(),
    stream: z.boolean().default(false),
    // abort signal from client
    signal: z.any().optional(),
    timeout: z.coerce.number().optional(),
    telemetryMetadata: TelemetryMetadataSchema.optional(),
  })
  .strict();

export const StreamingResponseSchema = z.any();

export const RunActionResponseSchema = z.object({
  id: z.string().optional(),
  object: z.string().optional(),
  created: z.coerce.number().optional(),
  model: z.string().optional(),
  usage: z.object({
    prompt_tokens: z.coerce.number(),
    completion_tokens: z.coerce.number(),
    total_tokens: z.coerce.number(),
  }),
  choices: z.array(
    z.object({
      message: z.object({
        role: z.string(),
        // nullable because message can contain function calls instead of final response when used with RAG
        content: z.string().nullish(),
      }),
      finish_reason: z.string().optional(),
      index: z.coerce.number().optional(),
    })
  ),
});

// Run action schema
export const DashboardActionParamsSchema = z
  .object({
    dashboardId: z.string(),
  })
  .strict();

export const DashboardActionResponseSchema = z.object({
  available: z.boolean(),
});
