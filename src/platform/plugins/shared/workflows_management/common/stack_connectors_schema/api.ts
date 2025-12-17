/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/api/
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod/v4';

// API connector parameter schema
export const ApiParamsSchema = z.object({
  path: z.string().optional(),
  method: z.enum(['get', 'post', 'put', 'patch', 'delete']).default('get'),
  body: z.string().optional(),
  query: z.record(z.string(), z.string()).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  timeout: z.number().positive().optional(),
});

// API connector response schema
export const ApiResponseSchema = z.object({
  status: z.number(),
  statusText: z.string(),
  data: z.any(),
  headers: z.record(z.string(), z.string()),
});
