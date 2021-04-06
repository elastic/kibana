/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as rt from 'io-ts';

import { fieldBasic, FieldBasicRT } from '../helpers';

/*
 * Types for Metrics Aggregations
 *
 * TODO:
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

export const metricsAggsType: Record<string, Record<string, rt.Any>> = {
  avg: fieldBasic,
  weighted_avg: {
    value: rt.intersection([FieldBasicRT, rt.partial({ missing: rt.number })]),
    weight: rt.intersection([FieldBasicRT, rt.partial({ missing: rt.number })]),
    format: rt.string,
    value_type: rt.string,
  },
  cardinality: fieldBasic,
  max: {
    ...fieldBasic,
    missing: rt.number,
  },
  min: {
    ...fieldBasic,
    missing: rt.number,
  },
  top_hits: {
    explain: rt.boolean,
    from: rt.string,
    highlight: rt.any,
    seq_no_primary_term: rt.boolean,
    size: rt.number,
    sort: rt.any,
    stored_fields: rt.array(rt.string),
    version: rt.boolean,
    _name: rt.string,
    _source: rt.partial({
      includes: rt.array(rt.string),
      excludes: rt.array(rt.string),
    }),
  },
};
