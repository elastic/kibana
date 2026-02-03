/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/webhook/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod/v4';

// Webhook connector parameter schema
export const WebhookParamsSchema = z.object({
  body: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

// Webhook connector response schema
export const WebhookResponseSchema = z.object({
  status: z.number(),
  statusText: z.string(),
  data: z.any(),
  headers: z.record(z.string(), z.string()),
});
