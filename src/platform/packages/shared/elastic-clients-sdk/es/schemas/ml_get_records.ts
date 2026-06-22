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

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const double = z.number().meta({ id: 'double' })
export type double = z.infer<typeof double>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const MlAnomalyExplanation = z.object({
  anomaly_characteristics_impact: integer.describe('Impact from the duration and magnitude of the detected anomaly relative to the historical average.').optional(),
  anomaly_length: integer.describe('Length of the detected anomaly in the number of buckets.').optional(),
  anomaly_type: z.string().describe('Type of the detected anomaly: `spike` or `dip`.').optional(),
  high_variance_penalty: z.boolean().describe('Indicates reduction of anomaly score for the bucket with large confidence intervals. If a bucket has large confidence intervals, the score is reduced.').optional(),
  incomplete_bucket_penalty: z.boolean().describe('If the bucket contains fewer samples than expected, the score is reduced.').optional(),
  lower_confidence_bound: double.describe('Lower bound of the 95% confidence interval.').optional(),
  multi_bucket_impact: integer.describe('Impact of the deviation between actual and typical values in the past 12 buckets.').optional(),
  single_bucket_impact: integer.describe('Impact of the deviation between actual and typical values in the current bucket.').optional(),
  typical_value: double.describe('Typical (expected) value for this bucket.').optional(),
  upper_confidence_bound: double.describe('Upper bound of the 95% confidence interval.').optional()
}).meta({ id: 'MlAnomalyExplanation' })
export type MlAnomalyExplanation = z.infer<typeof MlAnomalyExplanation>

export const MlGeoResults = z.object({
  actual_point: z.string().describe('The actual value for the bucket formatted as a `geo_point`.').optional(),
  typical_point: z.string().describe('The typical value for the bucket formatted as a `geo_point`.').optional()
}).meta({ id: 'MlGeoResults' })
export type MlGeoResults = z.infer<typeof MlGeoResults>

export const MlInfluence = z.object({
  influencer_field_name: z.string(),
  influencer_field_values: z.array(z.string())
}).meta({ id: 'MlInfluence' })
export type MlInfluence = z.infer<typeof MlInfluence>

export const MlAnomalyCause = z.object({
  actual: z.array(double).optional(),
  by_field_name: Name.optional(),
  by_field_value: z.string().optional(),
  correlated_by_field_value: z.string().optional(),
  field_name: Field.optional(),
  function: z.string().optional(),
  function_description: z.string().optional(),
  geo_results: MlGeoResults.optional(),
  influencers: z.array(MlInfluence).optional(),
  over_field_name: Name.optional(),
  over_field_value: z.string().optional(),
  partition_field_name: z.string().optional(),
  partition_field_value: z.string().optional(),
  probability: double,
  typical: z.array(double).optional()
}).meta({ id: 'MlAnomalyCause' })
export type MlAnomalyCause = z.infer<typeof MlAnomalyCause>

export const MlAnomaly = z.object({
  actual: z.array(double).describe('The actual value for the bucket.').optional(),
  anomaly_score_explanation: MlAnomalyExplanation.describe('Information about the factors impacting the initial anomaly score.').optional(),
  bucket_span: DurationValue.describe('The length of the bucket in seconds. This value matches the `bucket_span` that is specified in the job.'),
  by_field_name: z.string().describe('The field used to split the data. In particular, this property is used for analyzing the splits with respect to their own history. It is used for finding unusual values in the context of the split.').optional(),
  by_field_value: z.string().describe('The value of `by_field_name`.').optional(),
  causes: z.array(MlAnomalyCause).describe('For population analysis, an over field must be specified in the detector. This property contains an array of anomaly records that are the causes for the anomaly that has been identified for the over field. This sub-resource contains the most anomalous records for the `over_field_name`. For scalability reasons, a maximum of the 10 most significant causes of the anomaly are returned. As part of the core analytical modeling, these low-level anomaly records are aggregated for their parent over field record. The `causes` resource contains similar elements to the record resource, namely `actual`, `typical`, `geo_results.actual_point`, `geo_results.typical_point`, `*_field_name` and `*_field_value`. Probability and scores are not applicable to causes.').optional(),
  detector_index: integer.describe('A unique identifier for the detector.'),
  field_name: z.string().describe('Certain functions require a field to operate on, for example, `sum()`. For those functions, this value is the name of the field to be analyzed.').optional(),
  function: z.string().describe('The function in which the anomaly occurs, as specified in the detector configuration. For example, `max`.').optional(),
  function_description: z.string().describe('The description of the function in which the anomaly occurs, as specified in the detector configuration.').optional(),
  geo_results: MlGeoResults.describe('If the detector function is `lat_long`, this object contains comma delimited strings for the latitude and longitude of the actual and typical values.').optional(),
  influencers: z.array(MlInfluence).describe('If influencers were specified in the detector configuration, this array contains influencers that contributed to or were to blame for an anomaly.').optional(),
  initial_record_score: double.describe('A normalized score between 0-100, which is based on the probability of the anomalousness of this record. This is the initial value that was calculated at the time the bucket was processed.'),
  is_interim: z.boolean().describe('If true, this is an interim result. In other words, the results are calculated based on partial input data.'),
  job_id: z.string().describe('Identifier for the anomaly detection job.'),
  over_field_name: z.string().describe('The field used to split the data. In particular, this property is used for analyzing the splits with respect to the history of all splits. It is used for finding unusual values in the population of all splits.').optional(),
  over_field_value: z.string().describe('The value of `over_field_name`.').optional(),
  partition_field_name: z.string().describe('The field used to segment the analysis. When you use this property, you have completely independent baselines for each value of this field.').optional(),
  partition_field_value: z.string().describe('The value of `partition_field_name`.').optional(),
  probability: double.describe('The probability of the individual anomaly occurring, in the range 0 to 1. For example, `0.0000772031`. This value can be held to a high precision of over 300 decimal places, so the `record_score` is provided as a human-readable and friendly interpretation of this.'),
  record_score: double.describe('A normalized score between 0-100, which is based on the probability of the anomalousness of this record. Unlike `initial_record_score`, this value will be updated by a re-normalization process as new data is analyzed.'),
  result_type: z.string().describe('Internal. This is always set to `record`.'),
  timestamp: EpochTime.describe('The start time of the bucket for which these results were calculated.'),
  typical: z.array(double).describe('The typical value for the bucket, according to analytical modeling.').optional()
}).meta({ id: 'MlAnomaly' })
export type MlAnomaly = z.infer<typeof MlAnomaly>

export const MlPage = z.object({
  from: integer.describe('Skips the specified number of items.').optional(),
  size: integer.describe('Specifies the maximum number of items to obtain.').optional()
}).meta({ id: 'MlPage' })
export type MlPage = z.infer<typeof MlPage>

/**
 * Get anomaly records for an anomaly detection job.
 *
 * Records contain the detailed analytical results. They describe the anomalous
 * activity that has been identified in the input data based on the detector
 * configuration.
 * There can be many anomaly records depending on the characteristics and size
 * of the input data. In practice, there are often too many to be able to
 * manually process them. The machine learning features therefore perform a
 * sophisticated aggregation of the anomaly records into buckets.
 * The number of record results depends on the number of anomalies found in each
 * bucket, which relates to the number of time series being modeled and the
 * number of detectors.
 */
export const MlGetRecordsRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  from: integer.describe('Skips the specified number of records.').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies the maximum number of records to obtain.').optional().meta({ found_in: 'query' }),
  desc: z.boolean().describe('Refer to the description for the `desc` query parameter.').optional().meta({ found_in: 'body' }),
  end: DateTime.describe('Refer to the description for the `end` query parameter.').optional().meta({ found_in: 'body' }),
  exclude_interim: z.boolean().describe('Refer to the description for the `exclude_interim` query parameter.').optional().meta({ found_in: 'body' }),
  page: MlPage.optional().meta({ found_in: 'body' }),
  record_score: double.describe('Refer to the description for the `record_score` query parameter.').optional().meta({ found_in: 'body' }),
  sort: Field.describe('Refer to the description for the `sort` query parameter.').optional().meta({ found_in: 'body' }),
  start: DateTime.describe('Refer to the description for the `start` query parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlGetRecordsRequest' })
export type MlGetRecordsRequest = z.infer<typeof MlGetRecordsRequest>

export const MlGetRecordsResponse = z.object({
  count: long,
  records: z.array(MlAnomaly)
}).meta({ id: 'MlGetRecordsResponse' })
export type MlGetRecordsResponse = z.infer<typeof MlGetRecordsResponse>
