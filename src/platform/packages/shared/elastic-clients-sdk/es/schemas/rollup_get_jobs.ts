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

/** Path to field or array of paths. Some API's support wildcards in the path to select multiple fields. */
export const Field = z.string().meta({ id: 'Field' })
export type Field = z.infer<typeof Field>

export const Fields = z.union([Field, z.array(Field)]).meta({ id: 'Fields' })
export type Fields = z.infer<typeof Fields>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const TimeZone = z.string().meta({ id: 'TimeZone' })
export type TimeZone = z.infer<typeof TimeZone>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const RollupDateHistogramGrouping = z.object({
  delay: Duration.describe('How long to wait before rolling up new documents. By default, the indexer attempts to roll up all data that is available. However, it is not uncommon for data to arrive out of order. The indexer is unable to deal with data that arrives after a time-span has been rolled up. You need to specify a delay that matches the longest period of time you expect out-of-order data to arrive.').optional(),
  field: Field.describe('The date field that is to be rolled up.'),
  format: z.string().optional(),
  interval: Duration.optional(),
  calendar_interval: Duration.describe('The interval of time buckets to be generated when rolling up.').optional(),
  fixed_interval: Duration.describe('The interval of time buckets to be generated when rolling up.').optional(),
  time_zone: TimeZone.describe('Defines what `time_zone` the rollup documents are stored as. Unlike raw data, which can shift timezones on the fly, rolled documents have to be stored with a specific timezone. By default, rollup documents are stored in `UTC`.').optional()
}).meta({ id: 'RollupDateHistogramGrouping' })
export type RollupDateHistogramGrouping = z.infer<typeof RollupDateHistogramGrouping>

export const RollupMetric = z.enum(['min', 'max', 'sum', 'avg', 'value_count']).meta({ id: 'RollupMetric' })
export type RollupMetric = z.infer<typeof RollupMetric>

export const RollupFieldMetric = z.object({
  field: Field.describe('The field to collect metrics for. This must be a numeric of some kind.'),
  metrics: z.array(RollupMetric).describe('An array of metrics to collect for the field. At least one metric must be configured.')
}).meta({ id: 'RollupFieldMetric' })
export type RollupFieldMetric = z.infer<typeof RollupFieldMetric>

export const RollupHistogramGrouping = z.object({
  fields: Fields.describe('The set of fields that you wish to build histograms for. All fields specified must be some kind of numeric. Order does not matter.'),
  interval: long.describe('The interval of histogram buckets to be generated when rolling up. For example, a value of `5` creates buckets that are five units wide (`0-5`, `5-10`, etc). Note that only one interval can be specified in the histogram group, meaning that all fields being grouped via the histogram must share the same interval.')
}).meta({ id: 'RollupHistogramGrouping' })
export type RollupHistogramGrouping = z.infer<typeof RollupHistogramGrouping>

export const RollupTermsGrouping = z.object({
  fields: Fields.describe('The set of fields that you wish to collect terms for. This array can contain fields that are both keyword and numerics. Order does not matter.')
}).meta({ id: 'RollupTermsGrouping' })
export type RollupTermsGrouping = z.infer<typeof RollupTermsGrouping>

export const RollupGroupings = z.object({
  date_histogram: RollupDateHistogramGrouping.describe('A date histogram group aggregates a date field into time-based buckets. This group is mandatory; you currently cannot roll up documents without a timestamp and a `date_histogram` group.').optional(),
  histogram: RollupHistogramGrouping.describe('The histogram group aggregates one or more numeric fields into numeric histogram intervals.').optional(),
  terms: RollupTermsGrouping.describe('The terms group can be used on keyword or numeric fields to allow bucketing via the terms aggregation at a later point. The indexer enumerates and stores all values of a field for each time-period. This can be potentially costly for high-cardinality groups such as IP addresses, especially if the time-bucket is particularly sparse.').optional()
}).meta({ id: 'RollupGroupings' })
export type RollupGroupings = z.infer<typeof RollupGroupings>

export const RollupGetJobsIndexingJobState = z.enum(['started', 'indexing', 'stopping', 'stopped', 'aborting']).meta({ id: 'RollupGetJobsIndexingJobState' })
export type RollupGetJobsIndexingJobState = z.infer<typeof RollupGetJobsIndexingJobState>

/**
 * Get rollup job information.
 *
 * Get the configuration, stats, and status of rollup jobs.
 *
 * NOTE: This API returns only active (both `STARTED` and `STOPPED`) jobs.
 * If a job was created, ran for a while, then was deleted, the API does not return any details about it.
 * For details about a historical rollup job, the rollup capabilities API may be more useful.
 * @deprecated
 */
export const RollupGetJobsRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the rollup job. If it is `_all` or omitted, the API returns all rollup jobs.').optional().meta({ found_in: 'path' })
}).meta({ id: 'RollupGetJobsRequest' })
export type RollupGetJobsRequest = z.infer<typeof RollupGetJobsRequest>

export const RollupGetJobsRollupJobConfiguration = z.object({
  cron: z.string(),
  groups: RollupGroupings,
  id: Id,
  index_pattern: z.string(),
  metrics: z.array(RollupFieldMetric),
  page_size: long,
  rollup_index: IndexName,
  timeout: Duration
}).meta({ id: 'RollupGetJobsRollupJobConfiguration' })
export type RollupGetJobsRollupJobConfiguration = z.infer<typeof RollupGetJobsRollupJobConfiguration>

export const RollupGetJobsRollupJobStats = z.object({
  documents_processed: long,
  index_failures: long,
  index_time_in_ms: DurationValue,
  index_total: long,
  pages_processed: long,
  rollups_indexed: long,
  search_failures: long,
  search_time_in_ms: DurationValue,
  search_total: long,
  trigger_count: long,
  processing_time_in_ms: DurationValue,
  processing_total: long
}).meta({ id: 'RollupGetJobsRollupJobStats' })
export type RollupGetJobsRollupJobStats = z.infer<typeof RollupGetJobsRollupJobStats>

export const RollupGetJobsRollupJobStatus = z.object({
  current_position: z.record(z.string(), z.any()).optional(),
  job_state: RollupGetJobsIndexingJobState,
  upgraded_doc_id: z.boolean().optional()
}).meta({ id: 'RollupGetJobsRollupJobStatus' })
export type RollupGetJobsRollupJobStatus = z.infer<typeof RollupGetJobsRollupJobStatus>

export const RollupGetJobsRollupJob = z.object({
  config: RollupGetJobsRollupJobConfiguration.describe('The rollup job configuration.'),
  stats: RollupGetJobsRollupJobStats.describe('Transient statistics about the rollup job, such as how many documents have been processed and how many rollup summary docs have been indexed. These stats are not persisted. If a node is restarted, these stats are reset.'),
  status: RollupGetJobsRollupJobStatus.describe('The current status of the indexer for the rollup job.')
}).meta({ id: 'RollupGetJobsRollupJob' })
export type RollupGetJobsRollupJob = z.infer<typeof RollupGetJobsRollupJob>

export const RollupGetJobsResponse = z.object({
  jobs: z.array(RollupGetJobsRollupJob)
}).meta({ id: 'RollupGetJobsResponse' })
export type RollupGetJobsResponse = z.infer<typeof RollupGetJobsResponse>
