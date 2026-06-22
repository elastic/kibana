/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { SearchHitsMetadata } from './_global.search'
import { AcknowledgedResponseBase, Duration, DurationValue, Field, Fields, HttpHeaders, Id, Ids, IndexName, Indices, RequestBase, ShardStatistics, TaskFailure, TimeZone, integer, long } from './_types'
import { AggregationsAggregationContainer } from './_types.aggregations'
import { QueryDslQueryContainer } from './_types.query_dsl'

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
 * Delete a rollup job.
 *
 * A job must be stopped before it can be deleted.
 * If you attempt to delete a started job, an error occurs.
 * Similarly, if you attempt to delete a nonexistent job, an exception occurs.
 *
 * IMPORTANT: When you delete a job, you remove only the process that is actively monitoring and rolling up data.
 * The API does not delete any previously rolled up data.
 * This is by design; a user may wish to roll up a static data set.
 * Because the data set is static, after it has been fully rolled up there is no need to keep the indexing rollup job around (as there will be no new data).
 * Thus the job can be deleted, leaving behind the rolled up data for analysis.
 * If you wish to also remove the rollup data and the rollup index contains the data for only a single job, you can delete the whole rollup index.
 * If the rollup index stores data from several jobs, you must issue a delete-by-query that targets the rollup job's identifier in the rollup index. For example:
 *
 * ```
 * POST my_rollup_index/_delete_by_query
 * {
 *   "query": {
 *     "term": {
 *       "_rollup.id": "the_rollup_job_id"
 *     }
 *   }
 * }
 * ```
 * @deprecated
 */
export const RollupDeleteJobRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the job.').meta({ found_in: 'path' })
}).meta({ id: 'RollupDeleteJobRequest' })
export type RollupDeleteJobRequest = z.infer<typeof RollupDeleteJobRequest>

export const RollupDeleteJobResponse = z.object({
  acknowledged: z.boolean(),
  task_failures: z.array(TaskFailure).optional()
}).meta({ id: 'RollupDeleteJobResponse' })
export type RollupDeleteJobResponse = z.infer<typeof RollupDeleteJobResponse>

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

/**
 * Get the rollup job capabilities.
 *
 * Get the capabilities of any rollup jobs that have been configured for a specific index or index pattern.
 *
 * This API is useful because a rollup job is often configured to rollup only a subset of fields from the source index.
 * Furthermore, only certain aggregations can be configured for various fields, leading to a limited subset of functionality depending on that configuration.
 * This API enables you to inspect an index and determine:
 *
 * 1. Does this index have associated rollup data somewhere in the cluster?
 * 2. If yes to the first question, what fields were rolled up, what aggregations can be performed, and where does the data live?
 * @deprecated
 */
export const RollupGetRollupCapsRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Index, indices or index-pattern to return rollup capabilities for. `_all` may be used to fetch rollup capabilities from all jobs.').optional().meta({ found_in: 'path' })
}).meta({ id: 'RollupGetRollupCapsRequest' })
export type RollupGetRollupCapsRequest = z.infer<typeof RollupGetRollupCapsRequest>

export const RollupGetRollupCapsRollupFieldSummary = z.object({
  agg: z.string(),
  calendar_interval: Duration.optional(),
  time_zone: TimeZone.optional()
}).meta({ id: 'RollupGetRollupCapsRollupFieldSummary' })
export type RollupGetRollupCapsRollupFieldSummary = z.infer<typeof RollupGetRollupCapsRollupFieldSummary>

export const RollupGetRollupCapsRollupCapabilitySummary = z.object({
  fields: z.record(Field, z.array(RollupGetRollupCapsRollupFieldSummary)),
  index_pattern: z.string(),
  job_id: z.string(),
  rollup_index: z.string()
}).meta({ id: 'RollupGetRollupCapsRollupCapabilitySummary' })
export type RollupGetRollupCapsRollupCapabilitySummary = z.infer<typeof RollupGetRollupCapsRollupCapabilitySummary>

export const RollupGetRollupCapsRollupCapabilities = z.object({
  rollup_jobs: z.array(RollupGetRollupCapsRollupCapabilitySummary).describe('There can be multiple, independent jobs configured for a single index or index pattern. Each of these jobs may have different configurations, so the API returns a list of all the various configurations available.')
}).meta({ id: 'RollupGetRollupCapsRollupCapabilities' })
export type RollupGetRollupCapsRollupCapabilities = z.infer<typeof RollupGetRollupCapsRollupCapabilities>

export const RollupGetRollupCapsResponse = z.record(IndexName, RollupGetRollupCapsRollupCapabilities).meta({ id: 'RollupGetRollupCapsResponse' })
export type RollupGetRollupCapsResponse = z.infer<typeof RollupGetRollupCapsResponse>

export const RollupGetRollupIndexCapsRollupJobSummaryField = z.object({
  agg: z.string(),
  time_zone: TimeZone.optional(),
  calendar_interval: Duration.optional()
}).meta({ id: 'RollupGetRollupIndexCapsRollupJobSummaryField' })
export type RollupGetRollupIndexCapsRollupJobSummaryField = z.infer<typeof RollupGetRollupIndexCapsRollupJobSummaryField>

export const RollupGetRollupIndexCapsRollupJobSummary = z.object({
  fields: z.record(Field, z.array(RollupGetRollupIndexCapsRollupJobSummaryField)),
  index_pattern: z.string(),
  job_id: Id,
  rollup_index: IndexName
}).meta({ id: 'RollupGetRollupIndexCapsRollupJobSummary' })
export type RollupGetRollupIndexCapsRollupJobSummary = z.infer<typeof RollupGetRollupIndexCapsRollupJobSummary>

export const RollupGetRollupIndexCapsIndexCapabilities = z.object({
  rollup_jobs: z.array(RollupGetRollupIndexCapsRollupJobSummary)
}).meta({ id: 'RollupGetRollupIndexCapsIndexCapabilities' })
export type RollupGetRollupIndexCapsIndexCapabilities = z.infer<typeof RollupGetRollupIndexCapsIndexCapabilities>

/**
 * Get the rollup index capabilities.
 *
 * Get the rollup capabilities of all jobs inside of a rollup index.
 * A single rollup index may store the data for multiple rollup jobs and may have a variety of capabilities depending on those jobs. This API enables you to determine:
 *
 * * What jobs are stored in an index (or indices specified via a pattern)?
 * * What target indices were rolled up, what fields were used in those rollups, and what aggregations can be performed on each job?
 * @deprecated
 */
export const RollupGetRollupIndexCapsRequest = z.object({
  ...RequestBase.shape,
  index: Ids.describe('Data stream or index to check for rollup capabilities. Wildcard (`*`) expressions are supported.').meta({ found_in: 'path' })
}).meta({ id: 'RollupGetRollupIndexCapsRequest' })
export type RollupGetRollupIndexCapsRequest = z.infer<typeof RollupGetRollupIndexCapsRequest>

export const RollupGetRollupIndexCapsResponse = z.record(IndexName, RollupGetRollupIndexCapsIndexCapabilities).meta({ id: 'RollupGetRollupIndexCapsResponse' })
export type RollupGetRollupIndexCapsResponse = z.infer<typeof RollupGetRollupIndexCapsResponse>

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

/**
 * Search rolled-up data.
 *
 * The rollup search endpoint is needed because, internally, rolled-up documents utilize a different document structure than the original data.
 * It rewrites standard Query DSL into a format that matches the rollup documents then takes the response and rewrites it back to what a client would expect given the original query.
 *
 * The request body supports a subset of features from the regular search API.
 * The following functionality is not available:
 *
 * `size`: Because rollups work on pre-aggregated data, no search hits can be returned and so size must be set to zero or omitted entirely.
 * `highlighter`, `suggestors`, `post_filter`, `profile`, `explain`: These are similarly disallowed.
 *
 * For more detailed examples of using the rollup search API, including querying rolled-up data only or combining rolled-up and live data, refer to the External documentation.
 * @deprecated
 */
export const RollupRollupSearchRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-separated list of data streams and indices used to limit the request. This parameter has the following rules: * At least one data stream, index, or wildcard expression must be specified. This target can include a rollup or non-rollup index. For data streams, the stream\'s backing indices can only serve as non-rollup indices. Omitting the parameter or using `_all` are not permitted. * Multiple non-rollup indices may be specified. * Only one rollup index may be specified. If more than one are supplied, an exception occurs. * Wildcard expressions (`*`) may be used. If they match more than one rollup index, an exception occurs. However, you can use an expression to match multiple non-rollup indices or data streams.').meta({ found_in: 'path' }),
  rest_total_hits_as_int: z.boolean().describe('Indicates whether hits.total should be rendered as an integer or an object in the rest search response').optional().meta({ found_in: 'query' }),
  typed_keys: z.boolean().describe('Specify whether aggregation and suggester names should be prefixed by their respective types in the response').optional().meta({ found_in: 'query' }),
  aggregations: z.record(z.string(), z.lazy(() => AggregationsAggregationContainer)).describe('Specifies aggregations.').optional().meta({ found_in: 'body' }),
  aggs: z.record(z.string(), z.lazy(() => AggregationsAggregationContainer)).describe('Specifies aggregations.').optional(),
  query: z.lazy(() => QueryDslQueryContainer).describe('Specifies a DSL query that is subject to some limitations.').optional().meta({ found_in: 'body' }),
  size: integer.describe('Must be zero if set, as rollups work on pre-aggregated data.').optional().meta({ found_in: 'body' })
}).meta({ id: 'RollupRollupSearchRequest' })
export type RollupRollupSearchRequest = z.infer<typeof RollupRollupSearchRequest>

export const RollupRollupSearchResponse = z.object({
  took: long,
  timed_out: z.boolean(),
  terminated_early: z.boolean().optional(),
  _shards: ShardStatistics,
  hits: z.lazy(() => SearchHitsMetadata),
  aggregations: z.any().optional()
}).meta({ id: 'RollupRollupSearchResponse' })
export type RollupRollupSearchResponse = z.infer<typeof RollupRollupSearchResponse>

/**
 * Start rollup jobs.
 *
 * If you try to start a job that does not exist, an exception occurs.
 * If you try to start a job that is already started, nothing happens.
 * @deprecated
 */
export const RollupStartJobRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the rollup job.').meta({ found_in: 'path' })
}).meta({ id: 'RollupStartJobRequest' })
export type RollupStartJobRequest = z.infer<typeof RollupStartJobRequest>

export const RollupStartJobResponse = z.object({
  started: z.boolean()
}).meta({ id: 'RollupStartJobResponse' })
export type RollupStartJobResponse = z.infer<typeof RollupStartJobResponse>

/**
 * Stop rollup jobs.
 *
 * If you try to stop a job that does not exist, an exception occurs.
 * If you try to stop a job that is already stopped, nothing happens.
 *
 * Since only a stopped job can be deleted, it can be useful to block the API until the indexer has fully stopped.
 * This is accomplished with the `wait_for_completion` query parameter, and optionally a timeout. For example:
 *
 * ```
 * POST _rollup/job/sensor/_stop?wait_for_completion=true&timeout=10s
 * ```
 * The parameter blocks the API call from returning until either the job has moved to STOPPED or the specified time has elapsed.
 * If the specified time elapses without the job moving to STOPPED, a timeout exception occurs.
 * @deprecated
 */
export const RollupStopJobRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the rollup job.').meta({ found_in: 'path' }),
  timeout: Duration.describe('If `wait_for_completion` is `true`, the API blocks for (at maximum) the specified duration while waiting for the job to stop. If more than `timeout` time has passed, the API throws a timeout exception. NOTE: Even if a timeout occurs, the stop request is still processing and eventually moves the job to STOPPED. The timeout simply means the API call itself timed out while waiting for the status change.').optional().meta({ found_in: 'query' }),
  wait_for_completion: z.boolean().describe('If set to `true`, causes the API to block until the indexer state completely stops. If set to `false`, the API returns immediately and the indexer is stopped asynchronously in the background.').optional().meta({ found_in: 'query' })
}).meta({ id: 'RollupStopJobRequest' })
export type RollupStopJobRequest = z.infer<typeof RollupStopJobRequest>

export const RollupStopJobResponse = z.object({
  stopped: z.boolean()
}).meta({ id: 'RollupStopJobResponse' })
export type RollupStopJobResponse = z.infer<typeof RollupStopJobResponse>
