/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/common/d3security/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod/v4';

// D3 Security connector parameter schema for run action
export const D3SecurityRunParamsSchema = z.object({
  body: z.string().optional(),
  severity: z.string().optional().describe('Severity level: high, medium, low, or empty'),
  eventType: z.string().optional().describe('Type of event to create'),
});

// D3 Security connector parameter schema for test action
export const D3SecurityTestParamsSchema = z.object({
  body: z.string().optional(),
  severity: z.string().optional().describe('Severity level: high, medium, low, or empty'),
  eventType: z.string().optional().describe('Type of event to create'),
});

// D3 Security connector response schema
export const D3SecurityResponseSchema = z.object({
  refid: z.string(),
});
