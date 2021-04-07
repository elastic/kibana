/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema as s, ObjectType } from '@kbn/config-schema';

/*
 * Types for Metrics Aggregations
 *
 * Not implemented:
 * - Extended Stats Aggregation https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-extendedstats-aggregation.html
 * - Geo Bounds Aggregation https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-geobounds-aggregation.html
 * - Geo Centroid Aggregation https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-geocentroid-aggregation.html
 * - Percentiles Aggregation https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-percentile-aggregation.html
 * - Percentile Ranks Aggregation https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-percentile-rank-aggregation.html
 * - Scripted Metric Aggregation https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-scripted-metric-aggregation.html
 * - Stats Aggregation https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-stats-aggregation.html
 * - String Stats Aggregation (x-pack) https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-string-stats-aggregation.html
 * - Sum Aggregation https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-sum-aggregation.html
 * - Top Hits Aggregation https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-top-hits-aggregation.html
 * - Value Count Aggregation https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-valuecount-aggregation.html
 * - Median Absolute Deviation Aggregation https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-median-absolute-deviation-aggregation.html
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
  top_hits: s.object({
    explain: s.maybe(s.boolean()),
    docvalue_fields: s.maybe(s.oneOf([s.string(), s.arrayOf(s.string())])),
    stored_fields: s.maybe(s.oneOf([s.string(), s.arrayOf(s.string())])),
    from: s.maybe(s.number()),
    size: s.maybe(s.number()),
    sort: s.maybe(s.oneOf([s.literal('asc'), s.literal('desc')])),
    seq_no_primary_term: s.maybe(s.boolean()),
    version: s.maybe(s.boolean()),
    track_scores: s.maybe(s.boolean()),
    highlight: s.maybe(s.any()),
    _source: s.maybe(s.oneOf([s.boolean(), s.string(), s.arrayOf(s.string())])),
  }),
};
