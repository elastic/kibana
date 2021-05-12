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
 * - filter
 * - histogram
 * - nested
 * - terms
 *
 * Not implemented:
 * - adjacency_matrix
 * - auto_date_histogram
 * - children
 * - composite
 * - date_histogram
 * - date_range
 * - diversified_sampler
 * - filters
 * - geo_distance
 * - geohash_grid
 * - geotile_grid
 * - global
 * - ip_range
 * - missing
 * - multi_terms
 * - parent
 * - range
 * - rare_terms
 * - reverse_nested
 * - sampler
 * - significant_terms
 * - significant_text
 * - variable_width_histogram
 */

export const bucketAggsSchemas: Record<string, ObjectType> = {
  filter: s.object({
    term: s.recordOf(s.string(), s.oneOf([s.string(), s.boolean(), s.number()])),
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
  terms: s.object({
    field: s.maybe(s.string()),
    collect_mode: s.maybe(s.string()),
    exclude: s.maybe(s.oneOf([s.string(), s.arrayOf(s.string())])),
    include: s.maybe(s.oneOf([s.string(), s.arrayOf(s.string())])),
    execution_hint: s.maybe(s.string()),
    missing: s.maybe(s.number()),
    min_doc_count: s.maybe(s.number({ min: 1 })),
    size: s.maybe(s.number()),
    show_term_doc_count_error: s.maybe(s.boolean()),
    order: s.maybe(
      s.oneOf([
        sortOrderSchema,
        s.recordOf(s.string(), sortOrderSchema),
        s.arrayOf(s.recordOf(s.string(), sortOrderSchema)),
      ])
    ),
  }),
};
