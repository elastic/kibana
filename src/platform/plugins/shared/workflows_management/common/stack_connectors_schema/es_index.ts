/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/es_index/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod/v4';

// Elasticsearch Index connector parameter schema
export const EsIndexParamsSchema = z.object({
  documents: z.array(z.record(z.string(), z.any())),
  indexOverride: z.string().optional(),
});

// Elasticsearch Index connector response schema
export const EsIndexResponseSchema = z.object({
  took: z.number(),
  errors: z.boolean(),
  items: z.array(
    z.object({
      index: z
        .object({
          _index: z.string(),
          _id: z.string(),
          _version: z.number(),
          result: z.string(),
          _shards: z.object({
            total: z.number(),
            successful: z.number(),
            failed: z.number(),
          }),
          status: z.number(),
        })
        .optional(),
      create: z
        .object({
          _index: z.string(),
          _id: z.string(),
          _version: z.number(),
          result: z.string(),
          status: z.number(),
        })
        .optional(),
    })
  ),
});
