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

export const AcknowledgedResponseBase = z.object({
  acknowledged: z.boolean().describe('For a successful response, this value is always true. On failure, an exception is returned instead.')
}).meta({ id: 'AcknowledgedResponseBase' })
export type AcknowledgedResponseBase = z.infer<typeof AcknowledgedResponseBase>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

/** Path to field or array of paths. Some API's support wildcards in the path to select multiple fields. */
export const Field = z.string().meta({ id: 'Field' })
export type Field = z.infer<typeof Field>

export const Fields = z.union([Field, z.array(Field)]).meta({ id: 'Fields' })
export type Fields = z.infer<typeof Fields>

export const HttpHeaders = z.record(z.string(), z.union([z.string(), z.array(z.string())])).meta({ id: 'HttpHeaders' })
export type HttpHeaders = z.infer<typeof HttpHeaders>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const TimeZone = z.string().meta({ id: 'TimeZone' })
export type TimeZone = z.infer<typeof TimeZone>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

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

/**
 * Create a rollup job.
 *
 * WARNING: From 8.15.0, calling this API in a cluster with no rollup usage will fail with a message about the deprecation and planned removal of rollup features. A cluster needs to contain either a rollup job or a rollup index in order for this API to be allowed to run.
 *
 * The rollup job configuration contains all the details about how the job should run, when it indexes documents, and what future queries will be able to run against the rollup index.
 *
 * There are three main sections to the job configuration: the logistical details about the job (for example, the cron schedule), the fields that are used for grouping, and what metrics to collect for each group.
 *
 * Jobs are created in a `STOPPED` state. You can start them with the start rollup jobs API.
 * @deprecated
 */
export const RollupPutJobRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the rollup job. This can be any alphanumeric string and uniquely identifies the data that is associated with the rollup job. The ID is persistent; it is stored with the rolled up data. If you create a job, let it run for a while, then delete the job, the data that the job rolled up is still be associated with this job ID. You cannot create a new job with the same ID since that could lead to problems with mismatched job configurations.').meta({ found_in: 'path' }),
  cron: z.string().describe('A cron string which defines the intervals when the rollup job should be executed. When the interval triggers, the indexer attempts to rollup the data in the index pattern. The cron pattern is unrelated to the time interval of the data being rolled up. For example, you may wish to create hourly rollups of your document but to only run the indexer on a daily basis at midnight, as defined by the cron. The cron pattern is defined just like a Watcher cron schedule.').meta({ found_in: 'body' }),
  groups: RollupGroupings.describe('Defines the grouping fields and aggregations that are defined for this rollup job. These fields will then be available later for aggregating into buckets. These aggs and fields can be used in any combination. Think of the groups configuration as defining a set of tools that can later be used in aggregations to partition the data. Unlike raw data, we have to think ahead to which fields and aggregations might be used. Rollups provide enough flexibility that you simply need to determine which fields are needed, not in what order they are needed.').meta({ found_in: 'body' }),
  index_pattern: z.string().describe('The index or index pattern to roll up. Supports wildcard-style patterns (`logstash-*`). The job attempts to rollup the entire index or index-pattern.').meta({ found_in: 'body' }),
  metrics: z.array(RollupFieldMetric).describe('Defines the metrics to collect for each grouping tuple. By default, only the doc_counts are collected for each group. To make rollup useful, you will often add metrics like averages, mins, maxes, etc. Metrics are defined on a per-field basis and for each field you configure which metric should be collected.').optional().meta({ found_in: 'body' }),
  page_size: integer.describe('The number of bucket results that are processed on each iteration of the rollup indexer. A larger value tends to execute faster, but requires more memory during processing. This value has no effect on how the data is rolled up; it is merely used for tweaking the speed or memory cost of the indexer.').meta({ found_in: 'body' }),
  rollup_index: IndexName.describe('The index that contains the rollup results. The index can be shared with other rollup jobs. The data is stored so that it doesn’t interfere with unrelated jobs.').meta({ found_in: 'body' }),
  timeout: Duration.describe('Time to wait for the request to complete.').optional().meta({ found_in: 'body' }),
  headers: HttpHeaders.optional().meta({ found_in: 'body' })
}).meta({ id: 'RollupPutJobRequest' })
export type RollupPutJobRequest = z.infer<typeof RollupPutJobRequest>

export const RollupPutJobResponse = AcknowledgedResponseBase.meta({ id: 'RollupPutJobResponse' })
export type RollupPutJobResponse = z.infer<typeof RollupPutJobResponse>
