/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ObjectType } from '@kbn/config-schema';
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
export declare const metricsAggsSchemas: Record<string, ObjectType>;
