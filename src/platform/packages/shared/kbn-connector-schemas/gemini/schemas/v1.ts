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

export const ConfigSchema = z
  .object({
    apiUrl: z.string(),
    defaultModel: z.string().default(DEFAULT_MODEL),
    gcpRegion: z.string(),
    gcpProjectID: z.string(),
    contextWindowLength: z.coerce.number().optional(),
    temperature: z.coerce.number().optional(),
  })
  .strict();

export const SecretsSchema = z
  .object({
    credentialsJson: z.string(),
  })
  .strict();

export const RunActionParamsSchema = z
  .object({
    body: z.any(),
    model: z.string().optional(),
    signal: z.any().optional(),
    timeout: z.coerce.number().optional(),
    temperature: z.coerce.number().optional(),
    stopSequences: z.array(z.string()).optional(),
    raw: z.boolean().optional(),
    telemetryMetadata: TelemetryMetadataSchema.optional(),
  })
  .strict();

export const RunApiResponseSchema = z.object({
  candidates: z.any(),
  usageMetadata: z.object({
    promptTokenCount: z.coerce.number(),
    candidatesTokenCount: z.coerce.number(),
    totalTokenCount: z.coerce.number(),
  }),
});

export const RunActionResponseSchema = z.object({
  completion: z.string(),
  stop_reason: z.string().optional(),
  usageMetadata: z
    .object({
      promptTokenCount: z.coerce.number(),
      candidatesTokenCount: z.coerce.number(),
      totalTokenCount: z.coerce.number(),
    })
    .optional(),
});

export const RunActionRawResponseSchema = z.any();

export const InvokeAIActionParamsSchema = z
  .object({
    maxOutputTokens: z.coerce.number().optional(),
    messages: z.any(),
    systemInstruction: z.string().optional(),
    model: z.string().optional(),
    temperature: z.coerce.number().optional(),
    stopSequences: z.array(z.string()).optional(),
    signal: z.any().optional(),
    timeout: z.coerce.number().optional(),
    tools: z.array(z.any()).optional(),
    toolConfig: z
      .object({
        mode: z.enum(['AUTO', 'ANY', 'NONE']),
        allowedFunctionNames: z.array(z.string()).optional(),
      })
      .strict()
      .optional(),
    telemetryMetadata: TelemetryMetadataSchema.optional(),
  })
  .strict();

export const InvokeAIRawActionParamsSchema = InvokeAIActionParamsSchema;

export const InvokeAIActionResponseSchema = z.object({
  message: z.string(),
  usageMetadata: z
    .object({
      promptTokenCount: z.coerce.number(),
      candidatesTokenCount: z.coerce.number(),
      totalTokenCount: z.coerce.number(),
    })
    .optional(),
});

export const InvokeAIRawActionResponseSchema = z.any();

export const StreamingResponseSchema = z.any();

export const DashboardActionParamsSchema = z
  .object({
    dashboardId: z.string(),
  })
  .strict();

export const DashboardActionResponseSchema = z.object({
  available: z.boolean(),
});
