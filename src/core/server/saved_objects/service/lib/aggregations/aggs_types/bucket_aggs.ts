/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema as s, ObjectType } from '@kbn/config-schema';
import { sortOrderSchema } from './common_schemas';

/**
 * Schemas for the Bucket aggregations.
 *
 * Currently supported:
 * - date_range
 * - filter
 * - histogram
 * - nested
 * - reverse_nested
 * - terms
 * - multi_terms
 *
 * Not fully supported:
 * - filter
 * - filters
 *
 * Not implemented:
 * - adjacency_matrix
 * - auto_date_histogram
 * - children
 * - composite
 * - date_histogram
 * - diversified_sampler
 * - geo_distance
 * - geohash_grid
 * - geotile_grid
 * - global
 * - ip_range
 * - missing
 * - parent
 * - range
 * - rare_terms
 * - sampler
 * - significant_terms
 * - significant_text
 * - variable_width_histogram
 */

// TODO: it would be great if we could recursively build the schema since the aggregation have be nested
// For more details see how the types are defined in the elasticsearch javascript client:
// https://github.com/elastic/elasticsearch-js/blob/4ad5daeaf401ce8ebb28b940075e0a67e56ff9ce/src/api/typesWithBodyKey.ts#L5295
const termSchema = s.object({
  term: s.recordOf(s.string(), s.oneOf([s.string(), s.boolean(), s.number()])),
});

// TODO: it would be great if we could recursively build the schema since the aggregation have be nested
// For more details see how the types are defined in the elasticsearch javascript client:
// https://github.com/elastic/elasticsearch-js/blob/4ad5daeaf401ce8ebb28b940075e0a67e56ff9ce/src/api/typesWithBodyKey.ts#L5295
const boolSchema = s.object({
  bool: s.object({
    must_not: s.oneOf([termSchema]),
  }),
});

const orderSchema = s.oneOf([
  sortOrderSchema,
  s.recordOf(s.string(), sortOrderSchema),
  s.arrayOf(s.recordOf(s.string(), sortOrderSchema)),
]);

const termsSchema = s.object({
  field: s.maybe(s.string()),
  collect_mode: s.maybe(s.string()),
  exclude: s.maybe(s.oneOf([s.string(), s.arrayOf(s.string())])),
  include: s.maybe(s.oneOf([s.string(), s.arrayOf(s.string())])),
  execution_hint: s.maybe(s.string()),
  missing: s.maybe(s.number()),
  min_doc_count: s.maybe(s.number({ min: 1 })),
  size: s.maybe(s.number()),
  show_term_doc_count_error: s.maybe(s.boolean()),
  order: s.maybe(orderSchema),
});

const multiTermsSchema = s.object({
  terms: s.arrayOf(termsSchema),
  size: s.maybe(s.number()),
  shard_size: s.maybe(s.number()),
  show_term_doc_count_error: s.maybe(s.boolean()),
  min_doc_count: s.maybe(s.number()),
  shard_min_doc_count: s.maybe(s.number()),
  collect_mode: s.maybe(s.oneOf([s.literal('depth_first'), s.literal('breadth_first')])),
  order: s.maybe(s.recordOf(s.string(), orderSchema)),
});

export const bucketAggsSchemas: Record<string, ObjectType> = {
  date_range: s.object({
    field: s.string(),
    format: s.string(),
    ranges: s.arrayOf(s.object({ from: s.maybe(s.string()), to: s.maybe(s.string()) })),
  }),
  filter: termSchema,
  filters: s.object({
    filters: s.recordOf(s.string(), s.oneOf([termSchema, boolSchema])),
  }),
  histogram: s.object({
    field: s.maybe(s.string()),
    interval: s.maybe(s.number()),
    min_doc_count: s.maybe(s.number({ min: 1 })),
    extended_bounds: s.maybe(
      s.object({
        min: s.number(),
        max: s.number(),
      })
    ),
    hard_bounds: s.maybe(
      s.object({
        min: s.number(),
        max: s.number(),
      })
    ),
    missing: s.maybe(s.number()),
    keyed: s.maybe(s.boolean()),
    order: s.maybe(
      s.object({
        _count: s.string(),
        _key: s.string(),
      })
    ),
  }),
  nested: s.object({
    path: s.string(),
  }),
  reverse_nested: s.object({
    path: s.maybe(s.string()),
  }),
  multi_terms: multiTermsSchema,
  terms: termsSchema,
};
