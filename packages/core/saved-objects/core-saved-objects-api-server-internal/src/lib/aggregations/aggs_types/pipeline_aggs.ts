/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema as s, ObjectType } from '@kbn/config-schema';

/**
 * Schemas for the Bucket aggregations.
 *
 * Currently supported:
 * - max_bucket
 *
 * Not implemented:
 * - avg_bucket
 * - bucket_script
 * - bucket_count_ks_test
 * - bucket_correlation
 * - bucket_selector
 * - bucket_sort
 * - cumulative_cardinality
 * - cumulative_sum
 * - derivative
 * - extended_stats_bucket
 * - inference
 * - min_bucket
 * - moving_fn
 * - moving_percentiles
 * - normalize
 * - percentiles_bucket
 * - serial_diff
 * - stats_bucket
 * - sum_bucket
 */

export const pipelineAggsSchemas: Record<string, ObjectType> = {
  max_bucket: s.object({
    buckets_path: s.string(),
    gap: s.maybe(s.oneOf([s.literal('skip'), s.literal('insert_zeros'), s.literal('keep_values')])),
    format: s.maybe(s.string()),
  }),
};
