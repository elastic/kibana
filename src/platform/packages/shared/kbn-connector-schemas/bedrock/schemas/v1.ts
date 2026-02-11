/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { DEFAULT_MODEL } from '../constants';

export const TelemetryMetadataSchema = z
  .object({
    pluginId: z.string().optional(),
    aggregateBy: z.string().optional(),
  })
  .strict();

// Connector schema
export const ConfigSchema = z
  .object({
    apiUrl: z.string(),
    defaultModel: z.string().default(DEFAULT_MODEL),
    contextWindowLength: z.coerce.number().optional(),
    temperature: z.coerce.number().optional(),
  })
  .strict();

export const SecretsSchema = z
  .object({
    accessKey: z.string(),
    secret: z.string(),
  })
  .strict();

export const RunActionParamsSchema = z
  .object({
    body: z.string(),
    model: z.string().optional(),
    // abort signal from client
    signal: z.any().optional(),
    timeout: z.coerce.number().optional(),
    raw: z.boolean().optional(),
    telemetryMetadata: TelemetryMetadataSchema.optional(),
  })
  .strict();

export const BedrockMessageSchema = z
  .object({
    role: z.string(),
    content: z.string().optional(),
    rawContent: z.array(z.any()).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.content === undefined && value.rawContent === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Must specify either content or rawContent',
      });
    } else if (value.content !== undefined && value.rawContent !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'content and rawContent can not be used at the same time',
      });
    }
  });

export const BedrockToolChoiceSchema = z
  .object({
    type: z.enum(['auto', 'any', 'tool']),
    name: z.string().optional(),
  })
  .strict();

export const BedrockUsageSchema = z
  .object({
    input_tokens: z.coerce.number(),
    output_tokens: z.coerce.number(),
    // added with Sonnet 3.7
    cache_creation_input_tokens: z.coerce.number().optional(),
  })
  .passthrough()
  .optional();

export const InvokeAIActionParamsSchema = z
  .object({
    messages: z.array(BedrockMessageSchema),
    model: z.string().optional(),
    temperature: z.coerce.number().optional(),
    stopSequences: z.array(z.string()).optional(),
    system: z.string().optional(),
    maxTokens: z.coerce.number().optional(),
    // abort signal from client
    signal: z.any().optional(),
    timeout: z.coerce.number().optional(),
    anthropicVersion: z.string().optional(),
    tools: z
      .array(
        z
          .object({
            name: z.string(),
            description: z.string(),
            input_schema: z.object({}).passthrough(),
          })
          .strict()
      )
      .optional(),
    toolChoice: BedrockToolChoiceSchema.optional(),
    telemetryMetadata: TelemetryMetadataSchema.optional(),
  })
  .strict();

export const InvokeAIActionResponseSchema = z
  .object({
    message: z.string(),
    usage: BedrockUsageSchema,
  })
  .strict();

export const InvokeAIRawActionParamsSchema = z
  .object({
    messages: z.array(
      z
        .object({
          role: z.string(),
          content: z.any(),
        })
        .strict()
    ),
    model: z.string().optional(),
    temperature: z.coerce.number().optional(),
    stopSequences: z.array(z.string()).optional(),
    system: z.string().optional(),
    maxTokens: z.coerce.number().optional(),
    // abort signal from client
    signal: z.any().optional(),
    anthropicVersion: z.string().optional(),
    timeout: z.coerce.number().optional(),
    tools: z
      .array(
        z
          .object({
            name: z.string(),
            description: z.string(),
            input_schema: z.object({}).passthrough(),
          })
          .strict()
      )
      .optional(),
    toolChoice: BedrockToolChoiceSchema.optional(),
    telemetryMetadata: TelemetryMetadataSchema.optional(),
  })
  .strict();

export const InvokeAIRawActionResponseSchema = z.object({}).passthrough();

export const ConverseResponseSchema = z
  .object({
    output: z.object({
      message: z.object({}).passthrough().optional(),
    }),
    stopReason: z.string().optional(),
    usage: z
      .object({
        inputToken: z.number().optional(),
        outputTokens: z.number().optional(),
        totalTokens: z.number().optional(),
      })
      .passthrough(),
  })
  .passthrough();

export const RunApiLatestResponseSchema = z
  .object({
    stop_reason: z.string().optional(),
    usage: BedrockUsageSchema,
    content: z.array(z.object({ type: z.string(), text: z.string().optional() }).passthrough()),
  })
  .passthrough();

export const RunActionResponseSchema = z.object({
  completion: z.string(),
  stop_reason: z.string().optional(),
  usage: BedrockUsageSchema,
});

export const StreamingResponseSchema = z.any();

// Run action schema
export const DashboardActionParamsSchema = z
  .object({
    dashboardId: z.string(),
  })
  .strict();

export const DashboardActionResponseSchema = z
  .object({
    available: z.boolean(),
  })
  .strict();

export const BedrockClientSendParamsSchema = z
  .object({
    // ConverseCommand | ConverseStreamCommand from @aws-sdk/client-bedrock-runtime
    command: z.any(),
    // Kibana related properties
    signal: z.any().optional(),
    telemetryMetadata: TelemetryMetadataSchema.optional(),
  })
  .strict();

export const BedrockClientSendResponseSchema = z.object({}).passthrough();

export const ConverseActionParamsSchema = z
  .object({
    // Converse API will already be validating, no need for us to strictly validate again
    messages: z.array(z.any()),
    model: z.string().optional(),
    system: z.array(z.any()).optional(),
    temperature: z.coerce.number().optional(),
    maxTokens: z.coerce.number().optional(),
    stopSequences: z.array(z.string()).optional(),
    tools: z.array(z.any()).optional(),
    toolChoice: z.any().optional(),
    // Kibana related properties
    signal: z.any().optional(),
    timeout: z.coerce.number().optional(),
    telemetryMetadata: TelemetryMetadataSchema.optional(),
    connectorUsageCollector: z.any().optional(),
  })
  .passthrough();

export const ConverseStreamActionParamsSchema = ConverseActionParamsSchema;
