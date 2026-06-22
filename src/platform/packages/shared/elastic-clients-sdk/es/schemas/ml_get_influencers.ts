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

export const MlInfluencer = z.object({
  bucket_span: DurationValue.describe('The length of the bucket in seconds. This value matches the bucket span that is specified in the job.'),
  influencer_score: double.describe('A normalized score between 0-100, which is based on the probability of the influencer in this bucket aggregated across detectors. Unlike `initial_influencer_score`, this value is updated by a re-normalization process as new data is analyzed.'),
  influencer_field_name: Field.describe('The field name of the influencer.'),
  influencer_field_value: z.string().describe('The entity that influenced, contributed to, or was to blame for the anomaly.'),
  initial_influencer_score: double.describe('A normalized score between 0-100, which is based on the probability of the influencer aggregated across detectors. This is the initial value that was calculated at the time the bucket was processed.'),
  is_interim: z.boolean().describe('If true, this is an interim result. In other words, the results are calculated based on partial input data.'),
  job_id: Id.describe('Identifier for the anomaly detection job.'),
  probability: double.describe('The probability that the influencer has this behavior, in the range 0 to 1. This value can be held to a high precision of over 300 decimal places, so the `influencer_score` is provided as a human-readable and friendly interpretation of this value.'),
  result_type: z.string().describe('Internal. This value is always set to `influencer`.'),
  timestamp: EpochTime.describe('The start time of the bucket for which these results were calculated.'),
  foo: z.string().describe('Additional influencer properties are added, depending on the fields being analyzed. For example, if it’s analyzing `user_name` as an influencer, a field `user_name` is added to the result document. This information enables you to filter the anomaly results more easily.').optional()
}).meta({ id: 'MlInfluencer' })
export type MlInfluencer = z.infer<typeof MlInfluencer>

export const MlPage = z.object({
  from: integer.describe('Skips the specified number of items.').optional(),
  size: integer.describe('Specifies the maximum number of items to obtain.').optional()
}).meta({ id: 'MlPage' })
export type MlPage = z.infer<typeof MlPage>

/**
 * Get anomaly detection job results for influencers.
 *
 * Influencers are the entities that have contributed to, or are to blame for,
 * the anomalies. Influencer results are available only if an
 * `influencer_field_name` is specified in the job configuration.
 */
export const MlGetInfluencersRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  desc: z.boolean().describe('If true, the results are sorted in descending order.').optional().meta({ found_in: 'query' }),
  end: DateTime.describe('Returns influencers with timestamps earlier than this time. The default value means it is unset and results are not limited to specific timestamps.').optional().meta({ found_in: 'query' }),
  exclude_interim: z.boolean().describe('If true, the output excludes interim results. By default, interim results are included.').optional().meta({ found_in: 'query' }),
  influencer_score: double.describe('Returns influencers with anomaly scores greater than or equal to this value.').optional().meta({ found_in: 'query' }),
  from: integer.describe('Skips the specified number of influencers.').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies the maximum number of influencers to obtain.').optional().meta({ found_in: 'query' }),
  sort: Field.describe('Specifies the sort field for the requested influencers. By default, the influencers are sorted by the `influencer_score` value.').optional().meta({ found_in: 'query' }),
  start: DateTime.describe('Returns influencers with timestamps after this time. The default value means it is unset and results are not limited to specific timestamps.').optional().meta({ found_in: 'query' }),
  page: MlPage.describe('Configures pagination. This parameter has the `from` and `size` properties.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlGetInfluencersRequest' })
export type MlGetInfluencersRequest = z.infer<typeof MlGetInfluencersRequest>

export const MlGetInfluencersResponse = z.object({
  count: long,
  influencers: z.array(MlInfluencer).describe('Array of influencer objects')
}).meta({ id: 'MlGetInfluencersResponse' })
export type MlGetInfluencersResponse = z.infer<typeof MlGetInfluencersResponse>
