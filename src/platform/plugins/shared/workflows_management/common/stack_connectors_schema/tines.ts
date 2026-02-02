/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/tines/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod/v4';

// Tines connector parameter schemas for different sub-actions
export const TinesStoriesParamsSchema = z.object({
  // Get stories parameters
});

export const TinesWebhooksParamsSchema = z.object({
  // Get webhooks parameters
});

export const TinesRunParamsSchema = z.object({
  webhook: z.object({
    url: z.string(),
    body: z.string().optional(),
    headers: z.record(z.string(), z.string()).optional(),
  }),
});

export const TinesTestParamsSchema = z.object({
  webhook: z.object({
    url: z.string(),
    body: z.string().optional(),
    headers: z.record(z.string(), z.string()).optional(),
  }),
});

// Tines connector response schema
export const TinesResponseSchema = z.object({
  status: z.string(),
  data: z.any(),
});
