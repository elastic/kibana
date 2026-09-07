/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/common/openai/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod/v4';

// Gen AI connector parameter schema for run action
export const GenAIRunParamsSchema = z.object({
  body: z.string().describe('The request body as a JSON string'),
  timeout: z.number().optional().describe('Request timeout in milliseconds'),
});

// Gen AI connector parameter schema for invokeAI action
export const GenAIInvokeAIParamsSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.string(),
        content: z.string(),
        name: z.string().optional(),
        function_call: z
          .object({
            arguments: z.string(),
            name: z.string(),
          })
          .optional(),
        tool_calls: z
          .array(
            z.object({
              id: z.string(),
              function: z.object({
                arguments: z.string(),
                name: z.string(),
              }),
              type: z.string(),
            })
          )
          .optional(),
        tool_call_id: z.string().optional(),
      })
    )
    .describe('Array of messages for the conversation'),
  model: z.string().optional().describe('The model to use for the request'),
  tools: z
    .array(
      z.object({
        type: z.literal('function'),
        function: z.object({
          description: z.string().optional(),
          name: z.string(),
          parameters: z.record(z.string(), z.any()),
          strict: z.boolean().optional(),
        }),
      })
    )
    .optional()
    .describe('Available tools for the AI to use'),
  tool_choice: z
    .union([
      z.literal('none'),
      z.literal('auto'),
      z.literal('required'),
      z.object({
        type: z.literal('function'),
        function: z.object({
          name: z.string(),
        }),
      }),
    ])
    .optional()
    .describe('How the AI should choose tools'),
  functions: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        parameters: z.object({
          type: z.string(),
          properties: z.record(z.string(), z.any()),
          additionalProperties: z.boolean(),
        }),
      })
    )
    .optional()
    .describe('Available functions (deprecated, use tools instead)'),
  function_call: z
    .union([
      z.literal('none'),
      z.literal('auto'),
      z.object({
        name: z.string(),
      }),
    ])
    .optional()
    .describe('Function call behavior (deprecated, use tool_choice instead)'),
  n: z.number().optional().describe('Number of completions to generate'),
  stop: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional()
    .describe('Stop sequences'),
  temperature: z.number().optional().describe('Sampling temperature'),
  response_format: z.any().optional().describe('Response format specification'),
  timeout: z.number().optional().describe('Request timeout in milliseconds'),
});

// Gen AI connector parameter schema for stream actions
export const GenAIStreamParamsSchema = z.object({
  body: z.string().describe('The request body as a JSON string'),
  stream: z.boolean().default(false).describe('Whether to stream the response'),
  timeout: z.number().optional().describe('Request timeout in milliseconds'),
});

// Gen AI connector parameter schema for getDashboard action
export const GenAIDashboardParamsSchema = z.object({
  dashboardId: z.string().describe('The ID of the dashboard to retrieve'),
});

// Gen AI connector parameter schema for test action
export const GenAITestParamsSchema = z.object({
  timeout: z.number().optional().describe('Request timeout in milliseconds'),
});

// Gen AI connector response schemas
export const GenAIRunResponseSchema = z.object({
  id: z.string().optional(),
  object: z.string().optional(),
  created: z.number().optional(),
  model: z.string().optional(),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }),
  choices: z.array(
    z.object({
      message: z.object({
        role: z.string(),
        content: z.string().nullable().optional(),
      }),
      finish_reason: z.string().optional(),
      index: z.number().optional(),
    })
  ),
});

export const GenAIInvokeAIResponseSchema = z.object({
  message: z.string(),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }),
});

export const GenAIStreamResponseSchema = z.any();

export const GenAIDashboardResponseSchema = z.object({
  available: z.boolean().describe('Whether the dashboard is available'),
});

export const GenAITestResponseSchema = z.object({
  success: z.boolean().describe('Whether the test was successful'),
});
