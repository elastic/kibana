/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */
// @ts-nocheck

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

/**
 * We are still working on this type, it will arrive soon.
 * If it's critical for you, please open an issue.
 * https://github.com/elastic/elasticsearch-specification
 */
export const TODO = z.record(z.string(), z.any())
export type TODO = z.infer<typeof TODO>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const Ids = z.union([Id, z.array(Id)]).meta({ id: 'Ids' })
export type Ids = z.infer<typeof Ids>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const MlRunningStateSearchInterval = z.object({
  end: Duration.describe('The end time.').optional(),
  end_ms: DurationValue.describe('The end time as an epoch in milliseconds.'),
  start: Duration.describe('The start time.').optional(),
  start_ms: DurationValue.describe('The start time as an epoch in milliseconds.')
}).meta({ id: 'MlRunningStateSearchInterval' })
export type MlRunningStateSearchInterval = z.infer<typeof MlRunningStateSearchInterval>

export const MlDatafeedRunningState = z.object({
  real_time_configured: z.boolean().describe('Indicates if the datafeed is "real-time"; meaning that the datafeed has no configured `end` time.'),
  real_time_running: z.boolean().describe('Indicates whether the datafeed has finished running on the available past data. For datafeeds without a configured `end` time, this means that the datafeed is now running on "real-time" data.'),
  search_interval: MlRunningStateSearchInterval.describe('Provides the latest time interval the datafeed has searched.').optional()
}).meta({ id: 'MlDatafeedRunningState' })
export type MlDatafeedRunningState = z.infer<typeof MlDatafeedRunningState>

export const MlDatafeedState = z.enum(['started', 'stopped', 'starting', 'stopping']).meta({ id: 'MlDatafeedState' })
export type MlDatafeedState = z.infer<typeof MlDatafeedState>

export const MlExponentialAverageCalculationContext = z.object({
  incremental_metric_value_ms: DurationValue,
  latest_timestamp: EpochTime.optional(),
  previous_exponential_average_ms: DurationValue.optional()
}).meta({ id: 'MlExponentialAverageCalculationContext' })
export type MlExponentialAverageCalculationContext = z.infer<typeof MlExponentialAverageCalculationContext>

export const MlDatafeedTimingStats = z.object({
  bucket_count: long.describe('The number of buckets processed.'),
  exponential_average_search_time_per_hour_ms: DurationValue.describe('The exponential average search time per hour, in milliseconds.'),
  exponential_average_calculation_context: MlExponentialAverageCalculationContext.optional(),
  job_id: Id.describe('Identifier for the anomaly detection job.'),
  search_count: long.describe('The number of searches run by the datafeed.'),
  total_search_time_ms: DurationValue.describe('The total time the datafeed spent searching, in milliseconds.'),
  average_search_time_per_bucket_ms: DurationValue.describe('The average search time per bucket, in milliseconds.').optional()
}).meta({ id: 'MlDatafeedTimingStats' })
export type MlDatafeedTimingStats = z.infer<typeof MlDatafeedTimingStats>

export const MlDatafeedStats = z.object({
  assignment_explanation: z.string().describe('For started datafeeds only, contains messages relating to the selection of a node.').optional(),
  datafeed_id: Id.describe('A numerical character string that uniquely identifies the datafeed. This identifier can contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It must start and end with alphanumeric characters.'),
  state: MlDatafeedState.describe('The status of the datafeed, which can be one of the following values: `starting`, `started`, `stopping`, `stopped`.'),
  timing_stats: MlDatafeedTimingStats.describe('An object that provides statistical information about timing aspect of this datafeed.').optional(),
  running_state: MlDatafeedRunningState.describe('An object containing the running state for this datafeed. It is only provided if the datafeed is started.').optional()
}).meta({ id: 'MlDatafeedStats' })
export type MlDatafeedStats = z.infer<typeof MlDatafeedStats>

/**
 * Get datafeed stats.
 *
 * You can get statistics for multiple datafeeds in a single API request by
 * using a comma-separated list of datafeeds or a wildcard expression. You can
 * get statistics for all datafeeds by using `_all`, by specifying `*` as the
 * `<feed_id>`, or by omitting the `<feed_id>`. If the datafeed is stopped, the
 * only information you receive is the `datafeed_id` and the `state`.
 * This API returns a maximum of 10,000 datafeeds.
 */
export const MlGetDatafeedStatsRequest = z.object({
  ...RequestBase.shape,
  datafeed_id: Ids.describe('Identifier for the datafeed. It can be a datafeed identifier or a wildcard expression. If you do not specify one of these options, the API returns information about all datafeeds.').optional().meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: 1. Contains wildcard expressions and there are no datafeeds that match. 2. Contains the `_all` string or no identifiers and there are no matches. 3. Contains wildcard expressions and there are only partial matches. The default value is `true`, which returns an empty `datafeeds` array when there are no matches and the subset of results when there are partial matches. If this parameter is `false`, the request returns a `404` status code when there are no matches or only partial matches.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlGetDatafeedStatsRequest' })
export type MlGetDatafeedStatsRequest = z.infer<typeof MlGetDatafeedStatsRequest>

export const MlGetDatafeedStatsResponse = z.object({
  count: long,
  datafeeds: z.array(MlDatafeedStats)
}).meta({ id: 'MlGetDatafeedStatsResponse' })
export type MlGetDatafeedStatsResponse = z.infer<typeof MlGetDatafeedStatsResponse>
