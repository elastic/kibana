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

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

/**
 * A date and time, either as a string whose format can depend on the context (defaulting to ISO 8601), or a
 * number of milliseconds since the Epoch. Elasticsearch accepts both as input, but will generally output a string
 * representation.
 */
export const DateTime = z.union([z.string(), EpochTime]).meta({ id: 'DateTime' })
export type DateTime = z.infer<typeof DateTime>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const double = z.number().meta({ id: 'double' })
export type double = z.infer<typeof double>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const MlOverallBucketJob = z.object({
  job_id: Id,
  max_anomaly_score: double
}).meta({ id: 'MlOverallBucketJob' })
export type MlOverallBucketJob = z.infer<typeof MlOverallBucketJob>

export const MlOverallBucket = z.object({
  bucket_span: DurationValue.describe('The length of the bucket in seconds. Matches the job with the longest bucket_span value.'),
  is_interim: z.boolean().describe('If true, this is an interim result. In other words, the results are calculated based on partial input data.'),
  jobs: z.array(MlOverallBucketJob).describe('An array of objects that contain the max_anomaly_score per job_id.'),
  overall_score: double.describe('The top_n average of the maximum bucket anomaly_score per job.'),
  result_type: z.string().describe('Internal. This is always set to overall_bucket.'),
  timestamp: EpochTime.describe('The start time of the bucket for which these results were calculated.'),
  timestamp_string: DateTime.describe('The start time of the bucket for which these results were calculated.').optional()
}).meta({ id: 'MlOverallBucket' })
export type MlOverallBucket = z.infer<typeof MlOverallBucket>

/**
 * Get overall bucket results.
 *
 * Retrievs overall bucket results that summarize the bucket results of
 * multiple anomaly detection jobs.
 *
 * The `overall_score` is calculated by combining the scores of all the
 * buckets within the overall bucket span. First, the maximum
 * `anomaly_score` per anomaly detection job in the overall bucket is
 * calculated. Then the `top_n` of those scores are averaged to result in
 * the `overall_score`. This means that you can fine-tune the
 * `overall_score` so that it is more or less sensitive to the number of
 * jobs that detect an anomaly at the same time. For example, if you set
 * `top_n` to `1`, the `overall_score` is the maximum bucket score in the
 * overall bucket. Alternatively, if you set `top_n` to the number of jobs,
 * the `overall_score` is high only when all jobs detect anomalies in that
 * overall bucket. If you set the `bucket_span` parameter (to a value
 * greater than its default), the `overall_score` is the maximum
 * `overall_score` of the overall buckets that have a span equal to the
 * jobs' largest bucket span.
 */
export const MlGetOverallBucketsRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job. It can be a job identifier, a group name, a comma-separated list of jobs or groups, or a wildcard expression. You can summarize the bucket results for all anomaly detection jobs by using `_all` or by specifying `*` as the `<job_id>`.').meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Refer to the description for the `allow_no_match` query parameter.').optional().meta({ found_in: 'body' }),
  bucket_span: Duration.describe('Refer to the description for the `bucket_span` query parameter.').optional().meta({ found_in: 'body' }),
  end: DateTime.describe('Refer to the description for the `end` query parameter.').optional().meta({ found_in: 'body' }),
  exclude_interim: z.boolean().describe('Refer to the description for the `exclude_interim` query parameter.').optional().meta({ found_in: 'body' }),
  overall_score: double.describe('Refer to the description for the `overall_score` query parameter.').optional().meta({ found_in: 'body' }),
  start: DateTime.describe('Refer to the description for the `start` query parameter.').optional().meta({ found_in: 'body' }),
  top_n: integer.describe('Refer to the description for the `top_n` query parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlGetOverallBucketsRequest' })
export type MlGetOverallBucketsRequest = z.infer<typeof MlGetOverallBucketsRequest>

export const MlGetOverallBucketsResponse = z.object({
  count: long,
  overall_buckets: z.array(MlOverallBucket).describe('Array of overall bucket objects')
}).meta({ id: 'MlGetOverallBucketsResponse' })
export type MlGetOverallBucketsResponse = z.infer<typeof MlGetOverallBucketsResponse>
