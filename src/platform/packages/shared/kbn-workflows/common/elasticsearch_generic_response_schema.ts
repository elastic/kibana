/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

/**
 * Basic _shards info, appears in many responses
 */
export const EsShardsInfoSchema = z.object({
  total: z.number(),
  successful: z.number(),
  failed: z.number(),
  skipped: z.number().optional(),
});

/**
 * A generic document source – override with your own schema
 */
export const EsHitSourceSchema = z.record(z.string(), z.unknown());

/**
 * Generic hit (for search, msearch, etc.)
 */
export const EsHitSchema = z
  .object({
    _index: z.string(),
    _id: z.string(),
    _score: z.number().nullable().optional(),
    _source: EsHitSourceSchema.optional(),
    fields: z.record(z.string(), z.array(z.unknown())).optional(),
    highlight: z.record(z.string(), z.array(z.string())).optional(),
    sort: z.array(z.union([z.string(), z.number(), z.null()])).optional(),
    inner_hits: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

/**
 * `hits` container used in search-like APIs
 */
export const EsHitsSchema = z.object({
  total: z
    .union([
      z.number(),
      z.object({
        value: z.number(),
        relation: z.enum(['eq', 'gte']).optional(),
      }),
    ])
    .optional(),
  max_score: z.number().nullable().optional(),
  hits: z.array(EsHitSchema),
});

/**
 * Single bucket; appears inside many agg responses
 */
export const EsAggregationBucketSchema = z
  .object({
    key: z.union([z.string(), z.number()]).optional(),
    key_as_string: z.string().optional(),
    doc_count: z.number().optional(),
  })
  // Aggregation buckets may contain additional fields depending on the aggregation type,
  // such as 'from', 'to', or nested sub-aggregations. `.passthrough()` allows these extra fields.
  .passthrough();

/**
 * Best-effort generic aggregations:
 * - either a bucket
 * - or “thing with buckets”
 * - or fallback to unknown
 */
export const EsAggregationsSchema = z
  .record(
    z.string(),
    z.union([
      EsAggregationBucketSchema,
      z
        .object({
          buckets: z
            .array(
              z.union([
                EsAggregationBucketSchema,
                z.record(z.string(), z.unknown()), // filters, range, etc. with extra fields
              ])
            )
            .optional(),
        })
        .passthrough(),
      z.unknown(),
    ])
  )
  .optional();

/**
 * A generic Elasticsearch JSON response.
 *
 * Gives autocomplete for:
 * - search-ish fields: took, timed_out, _shards, hits, aggregations
 * - write-ish fields: acknowledged, errors
 * - status-ish fields: status
 *
 * And still accepts any other keys via .passthrough().
 */
export const EsGenericResponseSchema = z
  .object({
    // Common for search-like APIs
    took: z.number().optional(),
    timed_out: z.boolean().optional(),
    _shards: EsShardsInfoSchema.optional(),
    hits: EsHitsSchema.optional(),
    aggregations: EsAggregationsSchema.optional(),

    // Common for write/admin APIs
    acknowledged: z.boolean().optional(),
    errors: z.boolean().optional(),

    // Common for “status-ish” envelopes
    status: z.number().optional(),

    // Bulk, reindex, etc. often return “items”
    items: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();
