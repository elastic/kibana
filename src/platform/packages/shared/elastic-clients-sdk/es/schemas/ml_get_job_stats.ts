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

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const ByteSize = z.union([long, z.string()]).meta({ id: 'ByteSize' })
export type ByteSize = z.infer<typeof ByteSize>

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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const double = z.number().meta({ id: 'double' })
export type double = z.infer<typeof double>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const MlCategorizationStatus = z.enum(['ok', 'warn']).meta({ id: 'MlCategorizationStatus' })
export type MlCategorizationStatus = z.infer<typeof MlCategorizationStatus>

export const MlDataCounts = z.object({
  bucket_count: long,
  earliest_record_timestamp: long.optional(),
  empty_bucket_count: long,
  input_bytes: long,
  input_field_count: long,
  input_record_count: long,
  invalid_date_count: long,
  job_id: Id,
  last_data_time: long.optional(),
  latest_empty_bucket_timestamp: long.optional(),
  latest_record_timestamp: long.optional(),
  latest_sparse_bucket_timestamp: long.optional(),
  latest_bucket_timestamp: long.optional(),
  log_time: long.optional(),
  missing_field_count: long,
  out_of_order_timestamp_count: long,
  processed_field_count: long,
  processed_record_count: long,
  sparse_bucket_count: long
}).meta({ id: 'MlDataCounts' })
export type MlDataCounts = z.infer<typeof MlDataCounts>

export const MlJobStatistics = z.object({
  avg: double,
  max: double,
  min: double,
  total: double
}).meta({ id: 'MlJobStatistics' })
export type MlJobStatistics = z.infer<typeof MlJobStatistics>

export const MlJobForecastStatistics = z.object({
  memory_bytes: MlJobStatistics.optional(),
  processing_time_ms: MlJobStatistics.optional(),
  records: MlJobStatistics.optional(),
  status: z.record(z.string(), long).optional(),
  total: long,
  forecasted_jobs: integer
}).meta({ id: 'MlJobForecastStatistics' })
export type MlJobForecastStatistics = z.infer<typeof MlJobForecastStatistics>

export const MlJobState = z.enum(['closing', 'closed', 'opened', 'failed', 'opening']).meta({ id: 'MlJobState' })
export type MlJobState = z.infer<typeof MlJobState>

export const MlMemoryStatus = z.enum(['ok', 'soft_limit', 'hard_limit']).meta({ id: 'MlMemoryStatus' })
export type MlMemoryStatus = z.infer<typeof MlMemoryStatus>

export const MlModelSizeStats = z.object({
  bucket_allocation_failures_count: long,
  job_id: Id,
  log_time: DateTime,
  memory_status: MlMemoryStatus,
  model_bytes: ByteSize,
  model_bytes_exceeded: ByteSize.optional(),
  model_bytes_memory_limit: ByteSize.optional(),
  output_memory_allocator_bytes: ByteSize.optional(),
  peak_model_bytes: ByteSize.optional(),
  assignment_memory_basis: z.string().optional(),
  result_type: z.string(),
  total_by_field_count: long,
  total_over_field_count: long,
  total_partition_field_count: long,
  categorization_status: MlCategorizationStatus,
  categorized_doc_count: integer,
  dead_category_count: integer,
  failed_category_count: integer,
  frequent_category_count: integer,
  rare_category_count: integer,
  total_category_count: integer,
  timestamp: long.optional()
}).meta({ id: 'MlModelSizeStats' })
export type MlModelSizeStats = z.infer<typeof MlModelSizeStats>

export const MlJobTimingStats = z.object({
  average_bucket_processing_time_ms: DurationValue.optional(),
  bucket_count: long,
  exponential_average_bucket_processing_time_ms: DurationValue.optional(),
  exponential_average_bucket_processing_time_per_hour_ms: DurationValue,
  job_id: Id,
  total_bucket_processing_time_ms: DurationValue,
  maximum_bucket_processing_time_ms: DurationValue.optional(),
  minimum_bucket_processing_time_ms: DurationValue.optional()
}).meta({ id: 'MlJobTimingStats' })
export type MlJobTimingStats = z.infer<typeof MlJobTimingStats>

export const MlJobStats = z.object({
  assignment_explanation: z.string().describe('For open anomaly detection jobs only, contains messages relating to the selection of a node to run the job.').optional(),
  data_counts: MlDataCounts.describe('An object that describes the quantity of input to the job and any related error counts. The `data_count` values are cumulative for the lifetime of a job. If a model snapshot is reverted or old results are deleted, the job counts are not reset.'),
  forecasts_stats: MlJobForecastStatistics.describe('An object that provides statistical information about forecasts belonging to this job. Some statistics are omitted if no forecasts have been made.'),
  job_id: z.string().describe('Identifier for the anomaly detection job.'),
  model_size_stats: MlModelSizeStats.describe('An object that provides information about the size and contents of the model.'),
  open_time: DateTime.describe('For open jobs only, the elapsed time for which the job has been open.').optional(),
  state: MlJobState.describe('The status of the anomaly detection job, which can be one of the following values: `closed`, `closing`, `failed`, `opened`, `opening`.'),
  timing_stats: MlJobTimingStats.describe('An object that provides statistical information about timing aspect of this job.'),
  deleting: z.boolean().describe('Indicates that the process of deleting the job is in progress but not yet completed. It is only reported when `true`.').optional()
}).meta({ id: 'MlJobStats' })
export type MlJobStats = z.infer<typeof MlJobStats>

/** Get anomaly detection job stats. */
export const MlGetJobStatsRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job. It can be a job identifier, a group name, a comma-separated list of jobs, or a wildcard expression. If you do not specify one of these options, the API returns information for all anomaly detection jobs.').optional().meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: 1. Contains wildcard expressions and there are no jobs that match. 2. Contains the _all string or no identifiers and there are no matches. 3. Contains wildcard expressions and there are only partial matches. If `true`, the API returns an empty `jobs` array when there are no matches and the subset of results when there are partial matches. If `false`, the API returns a `404` status code when there are no matches or only partial matches.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlGetJobStatsRequest' })
export type MlGetJobStatsRequest = z.infer<typeof MlGetJobStatsRequest>

export const MlGetJobStatsResponse = z.object({
  count: long,
  jobs: z.array(MlJobStats)
}).meta({ id: 'MlGetJobStatsResponse' })
export type MlGetJobStatsResponse = z.infer<typeof MlGetJobStatsResponse>
