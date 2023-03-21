/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema as s, ObjectType } from '@kbn/config-schema';
import { sortSchema } from './common_schemas';

/**
 * Schemas for the metrics Aggregations
 *
 * Currently supported:
 * - avg
 * - cardinality
 * - min
 * - max
 * - sum
 * - top_hits
 * - value_count
 * - weighted_avg
 *
 * Not implemented:
 * - boxplot
 * - extended_stats
 * - geo_bounds
 * - geo_centroid
 * - geo_line
 * - matrix_stats
 * - median_absolute_deviation
 * - percentile_ranks
 * - percentiles
 * - rate
 * - scripted_metric
 * - stats
 * - string_stats
 * - t_test
 * - value_count
 */
export const metricsAggsSchemas: Record<string, ObjectType> = {
  avg: s.object({
    field: s.maybe(s.string()),
    missing: s.maybe(s.oneOf([s.string(), s.number(), s.boolean()])),
  }),
  cardinality: s.object({
    field: s.maybe(s.string()),
    precision_threshold: s.maybe(s.number()),
    rehash: s.maybe(s.boolean()),
    missing: s.maybe(s.oneOf([s.string(), s.number(), s.boolean()])),
  }),
  min: s.object({
    field: s.maybe(s.string()),
    missing: s.maybe(s.oneOf([s.string(), s.number(), s.boolean()])),
    format: s.maybe(s.string()),
  }),
  max: s.object({
    field: s.maybe(s.string()),
    missing: s.maybe(s.oneOf([s.string(), s.number(), s.boolean()])),
    format: s.maybe(s.string()),
  }),
  sum: s.object({
    field: s.maybe(s.string()),
    missing: s.maybe(s.oneOf([s.string(), s.number(), s.boolean()])),
  }),
  top_hits: s.object({
    explain: s.maybe(s.boolean()),
    docvalue_fields: s.maybe(s.oneOf([s.string(), s.arrayOf(s.string())])),
    stored_fields: s.maybe(s.oneOf([s.string(), s.arrayOf(s.string())])),
    from: s.maybe(s.number()),
    size: s.maybe(s.number()),
    sort: s.maybe(sortSchema),
    seq_no_primary_term: s.maybe(s.boolean()),
    version: s.maybe(s.boolean()),
    track_scores: s.maybe(s.boolean()),
    highlight: s.maybe(s.any()),
    _source: s.maybe(s.oneOf([s.boolean(), s.string(), s.arrayOf(s.string())])),
  }),
  value_count: s.object({
    field: s.maybe(s.string()),
  }),
  weighted_avg: s.object({
    format: s.maybe(s.string()),
    value_type: s.maybe(s.string()),
    value: s.maybe(
      s.object({
        field: s.maybe(s.string()),
        missing: s.maybe(s.number()),
      })
    ),
    weight: s.maybe(
      s.object({
        field: s.maybe(s.string()),
        missing: s.maybe(s.number()),
      })
    ),
  }),
};
