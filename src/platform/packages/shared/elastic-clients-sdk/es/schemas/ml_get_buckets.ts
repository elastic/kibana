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

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

/** Path to field or array of paths. Some API's support wildcards in the path to select multiple fields. */
export const Field = z.string().meta({ id: 'Field' })
export type Field = z.infer<typeof Field>

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

export const MlBucketInfluencer = z.object({
  anomaly_score: double.describe('A normalized score between 0-100, which is calculated for each bucket influencer. This score might be updated as newer data is analyzed.'),
  bucket_span: DurationValue.describe('The length of the bucket in seconds. This value matches the bucket span that is specified in the job.'),
  influencer_field_name: Field.describe('The field name of the influencer.'),
  initial_anomaly_score: double.describe('The score between 0-100 for each bucket influencer. This score is the initial value that was calculated at the time the bucket was processed.'),
  is_interim: z.boolean().describe('If true, this is an interim result. In other words, the results are calculated based on partial input data.'),
  job_id: Id.describe('Identifier for the anomaly detection job.'),
  probability: double.describe('The probability that the bucket has this behavior, in the range 0 to 1. This value can be held to a high precision of over 300 decimal places, so the `anomaly_score` is provided as a human-readable and friendly interpretation of this.'),
  raw_anomaly_score: double.describe('Internal.'),
  result_type: z.string().describe('Internal. This value is always set to `bucket_influencer`.'),
  timestamp: EpochTime.describe('The start time of the bucket for which these results were calculated.'),
  timestamp_string: DateTime.describe('The start time of the bucket for which these results were calculated.').optional()
}).meta({ id: 'MlBucketInfluencer' })
export type MlBucketInfluencer = z.infer<typeof MlBucketInfluencer>

export const MlBucketSummary = z.object({
  anomaly_score: double.describe('The maximum anomaly score, between 0-100, for any of the bucket influencers. This is an overall, rate-limited score for the job. All the anomaly records in the bucket contribute to this score. This value might be updated as new data is analyzed.'),
  bucket_influencers: z.array(MlBucketInfluencer),
  bucket_span: DurationValue.describe('The length of the bucket in seconds. This value matches the bucket span that is specified in the job.'),
  event_count: long.describe('The number of input data records processed in this bucket.'),
  initial_anomaly_score: double.describe('The maximum anomaly score for any of the bucket influencers. This is the initial value that was calculated at the time the bucket was processed.'),
  is_interim: z.boolean().describe('If true, this is an interim result. In other words, the results are calculated based on partial input data.'),
  job_id: Id.describe('Identifier for the anomaly detection job.'),
  processing_time_ms: DurationValue.describe('The amount of time, in milliseconds, that it took to analyze the bucket contents and calculate results.'),
  result_type: z.string().describe('Internal. This value is always set to bucket.'),
  timestamp: EpochTime.describe('The start time of the bucket. This timestamp uniquely identifies the bucket. Events that occur exactly at the timestamp of the bucket are included in the results for the bucket.'),
  timestamp_string: DateTime.describe('The start time of the bucket. This timestamp uniquely identifies the bucket. Events that occur exactly at the timestamp of the bucket are included in the results for the bucket.').optional()
}).meta({ id: 'MlBucketSummary' })
export type MlBucketSummary = z.infer<typeof MlBucketSummary>

export const MlPage = z.object({
  from: integer.describe('Skips the specified number of items.').optional(),
  size: integer.describe('Specifies the maximum number of items to obtain.').optional()
}).meta({ id: 'MlPage' })
export type MlPage = z.infer<typeof MlPage>

/**
 * Get anomaly detection job results for buckets.
 *
 * The API presents a chronological view of the records, grouped by bucket.
 */
export const MlGetBucketsRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  timestamp: DateTime.describe('The timestamp of a single bucket result. If you do not specify this parameter, the API returns information about all buckets.').optional().meta({ found_in: 'path' }),
  from: integer.describe('Skips the specified number of buckets.').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies the maximum number of buckets to obtain.').optional().meta({ found_in: 'query' }),
  anomaly_score: double.describe('Refer to the description for the `anomaly_score` query parameter.').optional().meta({ found_in: 'body' }),
  desc: z.boolean().describe('Refer to the description for the `desc` query parameter.').optional().meta({ found_in: 'body' }),
  end: DateTime.describe('Refer to the description for the `end` query parameter.').optional().meta({ found_in: 'body' }),
  exclude_interim: z.boolean().describe('Refer to the description for the `exclude_interim` query parameter.').optional().meta({ found_in: 'body' }),
  expand: z.boolean().describe('Refer to the description for the `expand` query parameter.').optional().meta({ found_in: 'body' }),
  page: MlPage.optional().meta({ found_in: 'body' }),
  sort: Field.describe('Refer to the desription for the `sort` query parameter.').optional().meta({ found_in: 'body' }),
  start: DateTime.describe('Refer to the description for the `start` query parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlGetBucketsRequest' })
export type MlGetBucketsRequest = z.infer<typeof MlGetBucketsRequest>

export const MlGetBucketsResponse = z.object({
  buckets: z.array(MlBucketSummary),
  count: long
}).meta({ id: 'MlGetBucketsResponse' })
export type MlGetBucketsResponse = z.infer<typeof MlGetBucketsResponse>
