/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/http/
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod/v4';

// HTTP connector parameter schema
export const HttpParamsSchema = z.object({
  url: z
    .string()
    .optional()
    .describe(
      'The base URL to send the request to. If `connector-id` is provided the configured URL will be used and this value will be ignored.'
    ),
  path: z.string().optional().describe('The path appended to the base URL.'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET'),
  body: z.string().optional(),
  query: z.record(z.string(), z.string()).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  timeout: z.number().positive().optional(),
  fetcher: z
    .object({
      skip_ssl_verification: z.boolean().optional(),
      follow_redirects: z.boolean().optional(),
      max_redirects: z.number().optional(),
      keep_alive: z.boolean().optional(),
    })
    .optional(),
});

// HTTP connector response schema
export const HttpResponseSchema = z.object({
  status: z.number(),
  statusText: z.string(),
  data: z.any(),
  headers: z.record(z.string(), z.string()),
});
