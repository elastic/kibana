/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { ReindexDestination, ReindexSource } from './_global.reindex'
import { AcknowledgedResponseBase, DateTime, Duration, DurationValue, EpochTime, Field, HealthStatus, Id, IndexName, Indices, Metadata, Name, Names, RequestBase, VersionString, double, float, integer, long } from './_types'
import { AggregationsAggregationContainer, AggregationsDateHistogramAggregation, AggregationsGeoTileGridAggregation, AggregationsHistogramAggregation, AggregationsTermsAggregation } from './_types.aggregations'
import { MappingRuntimeFields } from './_types.mapping'
import { QueryDslQueryContainer } from './_types.query_dsl'
import { IndicesIndexState } from './indices'
import { MlTransformAuthorization } from './ml'

export const TransformDestination = z.object({
  index: IndexName.describe('The destination index for the transform. The mappings of the destination index are deduced based on the source fields when possible. If alternate mappings are required, use the create index API prior to starting the transform.').optional(),
  pipeline: z.string().describe('The unique identifier for an ingest pipeline.').optional()
}).meta({ id: 'TransformDestination' })
export type TransformDestination = z.infer<typeof TransformDestination>

export const TransformLatest = z.object({
  sort: Field.describe('Specifies the date field that is used to identify the latest documents.'),
  unique_key: z.array(Field).describe('Specifies an array of one or more fields that are used to group the data.')
}).meta({ id: 'TransformLatest' })
export type TransformLatest = z.infer<typeof TransformLatest>

const TransformPivotGroupByContainerExclusiveProps = z.union([z.object({ date_histogram: z.lazy(() => AggregationsDateHistogramAggregation) }), z.object({ geotile_grid: AggregationsGeoTileGridAggregation }), z.object({ histogram: z.lazy(() => AggregationsHistogramAggregation) }), z.object({ terms: z.lazy(() => AggregationsTermsAggregation) })])

export const TransformPivotGroupByContainer = TransformPivotGroupByContainerExclusiveProps.meta({ id: 'TransformPivotGroupByContainer' })
export type TransformPivotGroupByContainer = z.infer<typeof TransformPivotGroupByContainer>

export const TransformPivot = z.object({
  aggregations: z.record(z.string(), z.lazy(() => AggregationsAggregationContainer)).describe('Defines how to aggregate the grouped data. The following aggregations are currently supported: average, bucket script, bucket selector, cardinality, filter, geo bounds, geo centroid, geo line, max, median absolute deviation, min, missing, percentiles, rare terms, scripted metric, stats, sum, terms, top metrics, value count, weighted average.').optional(),
  aggs: z.record(z.string(), z.lazy(() => AggregationsAggregationContainer)).describe('Defines how to aggregate the grouped data. The following aggregations are currently supported: average, bucket script, bucket selector, cardinality, filter, geo bounds, geo centroid, geo line, max, median absolute deviation, min, missing, percentiles, rare terms, scripted metric, stats, sum, terms, top metrics, value count, weighted average.').optional(),
  group_by: z.record(z.string(), TransformPivotGroupByContainer).describe('Defines how to group the data. More than one grouping can be defined per pivot. The following groupings are currently supported: date histogram, geotile grid, histogram, terms.').optional()
}).meta({ id: 'TransformPivot' })
export type TransformPivot = z.infer<typeof TransformPivot>

export const TransformRetentionPolicy = z.object({
  field: Field.describe('The date field that is used to calculate the age of the document.'),
  max_age: Duration.describe('Specifies the maximum age of a document in the destination index. Documents that are older than the configured value are removed from the destination index.')
}).meta({ id: 'TransformRetentionPolicy' })
export type TransformRetentionPolicy = z.infer<typeof TransformRetentionPolicy>

const TransformRetentionPolicyContainerExclusiveProps = z.union([z.object({ time: TransformRetentionPolicy })])

export const TransformRetentionPolicyContainer = TransformRetentionPolicyContainerExclusiveProps.meta({ id: 'TransformRetentionPolicyContainer' })
export type TransformRetentionPolicyContainer = z.infer<typeof TransformRetentionPolicyContainer>

/** The source of the data for the transform. */
export const TransformSettings = z.object({
  align_checkpoints: z.boolean().describe('Specifies whether the transform checkpoint ranges should be optimized for performance. Such optimization can align checkpoint ranges with the date histogram interval when date histogram is specified as a group source in the transform config. As a result, less document updates in the destination index will be performed thus improving overall performance.').optional(),
  dates_as_epoch_millis: z.boolean().describe('Defines if dates in the ouput should be written as ISO formatted string or as millis since epoch. epoch_millis was the default for transforms created before version 7.11. For compatible output set this value to `true`.').optional(),
  deduce_mappings: z.boolean().describe('Specifies whether the transform should deduce the destination index mappings from the transform configuration.').optional(),
  docs_per_second: float.describe('Specifies a limit on the number of input documents per second. This setting throttles the transform by adding a wait time between search requests. The default value is null, which disables throttling.').optional(),
  max_page_search_size: integer.describe('Defines the initial page size to use for the composite aggregation for each checkpoint. If circuit breaker exceptions occur, the page size is dynamically adjusted to a lower value. The minimum value is `10` and the maximum is `65,536`. The default value is `500` for `pivot` transforms and `5000` for `latest` transforms.').optional(),
  use_point_in_time: z.boolean().describe('Specifies whether the transform checkpoint will use the Point In Time API while searching over the source index. In general, Point In Time is an optimization that will reduce pressure on the source index by reducing the amount of refreshes and merges, but it can be expensive if a large number of Point In Times are opened and closed for a given index. The benefits and impact depend on the data being searched, the ingest rate into the source index, and the amount of other consumers searching the same source index.').optional(),
  num_failure_retries: integer.describe('Defines the number of retries on a recoverable failure before the transform task is marked as `failed`. The minimum value is `0` and the maximum is `100`, where `-1` indicates that the transform retries indefinitely. If unset, the cluster-level setting `num_transform_failure_retries` is used. This setting cannot be specified when `unattended` is `true`, because unattended transforms always retry indefinitely.').optional(),
  unattended: z.boolean().describe('If `true`, the transform runs in unattended mode. In unattended mode, the transform retries indefinitely in case of an error which means the transform never fails. Setting the number of retries other than infinite fails in validation.').optional()
}).meta({ id: 'TransformSettings' })
export type TransformSettings = z.infer<typeof TransformSettings>

export const TransformSource = z.object({
  index: Indices.describe('The source indices for the transform. It can be a single index, an index pattern (for example, `"my-index-*""`), an array of indices (for example, `["my-index-000001", "my-index-000002"]`), or an array of index patterns (for example, `["my-index-*", "my-other-index-*"]`. For remote indices use the syntax `"remote_name:index_name"`. If any indices are in remote clusters then the master node and at least one transform node must have the `remote_cluster_client` node role.'),
  query: z.lazy(() => QueryDslQueryContainer).describe('A query clause that retrieves a subset of data from the source index.').optional(),
  runtime_mappings: z.lazy(() => MappingRuntimeFields).describe('Definitions of search-time runtime fields that can be used by the transform. For search runtime fields all data nodes, including remote nodes, must be 7.12 or later.').optional()
}).meta({ id: 'TransformSource' })
export type TransformSource = z.infer<typeof TransformSource>

export const TransformTimeSync = z.object({
  delay: Duration.describe('The time delay between the current time and the latest input data time.').optional(),
  field: Field.describe('The date field that is used to identify new documents in the source. In general, it’s a good idea to use a field that contains the ingest timestamp. If you use a different field, you might need to set the delay such that it accounts for data transmission delays.')
}).meta({ id: 'TransformTimeSync' })
export type TransformTimeSync = z.infer<typeof TransformTimeSync>

const TransformSyncContainerExclusiveProps = z.union([z.object({ time: TransformTimeSync })])

export const TransformSyncContainer = TransformSyncContainerExclusiveProps.meta({ id: 'TransformSyncContainer' })
export type TransformSyncContainer = z.infer<typeof TransformSyncContainer>

/** Delete a transform. */
export const TransformDeleteTransformRequest = z.object({
  ...RequestBase.shape,
  transform_id: Id.describe('Identifier for the transform.').meta({ found_in: 'path' }),
  force: z.boolean().describe('If this value is false, the transform must be stopped before it can be deleted. If true, the transform is deleted regardless of its current state.').optional().meta({ found_in: 'query' }),
  delete_dest_index: z.boolean().describe('If this value is true, the destination index is deleted together with the transform. If false, the destination index will not be deleted').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'TransformDeleteTransformRequest' })
export type TransformDeleteTransformRequest = z.infer<typeof TransformDeleteTransformRequest>

export const TransformDeleteTransformResponse = AcknowledgedResponseBase.meta({ id: 'TransformDeleteTransformResponse' })
export type TransformDeleteTransformResponse = z.infer<typeof TransformDeleteTransformResponse>

/**
 * Get node stats.
 *
 * Get per-node information about transform usage.
 */
export const TransformGetNodeStatsRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'TransformGetNodeStatsRequest' })
export type TransformGetNodeStatsRequest = z.infer<typeof TransformGetNodeStatsRequest>

export const TransformGetNodeStatsTransformSchedulerStats = z.object({
  registered_transform_count: integer,
  peek_transform: z.string().optional()
}).meta({ id: 'TransformGetNodeStatsTransformSchedulerStats' })
export type TransformGetNodeStatsTransformSchedulerStats = z.infer<typeof TransformGetNodeStatsTransformSchedulerStats>

export const TransformGetNodeStatsTransformNodeStats = z.object({
  scheduler: TransformGetNodeStatsTransformSchedulerStats
}).meta({ id: 'TransformGetNodeStatsTransformNodeStats' })
export type TransformGetNodeStatsTransformNodeStats = z.infer<typeof TransformGetNodeStatsTransformNodeStats>

export const TransformGetNodeStatsTransformNodeFullStats = z.object({
  total: TransformGetNodeStatsTransformNodeStats
}).catchall(z.any()).meta({ id: 'TransformGetNodeStatsTransformNodeFullStats' })
export type TransformGetNodeStatsTransformNodeFullStats = z.infer<typeof TransformGetNodeStatsTransformNodeFullStats>

export const TransformGetNodeStatsResponse = TransformGetNodeStatsTransformNodeFullStats.meta({ id: 'TransformGetNodeStatsResponse' })
export type TransformGetNodeStatsResponse = z.infer<typeof TransformGetNodeStatsResponse>

/**
 * Get transforms.
 *
 * Get configuration information for transforms.
 */
export const TransformGetTransformRequest = z.object({
  ...RequestBase.shape,
  transform_id: Names.describe('Identifier for the transform. It can be a transform identifier or a wildcard expression. You can get information for all transforms by using `_all`, by specifying `*` as the `<transform_id>`, or by omitting the `<transform_id>`.').optional().meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: 1. Contains wildcard expressions and there are no transforms that match. 2. Contains the _all string or no identifiers and there are no matches. 3. Contains wildcard expressions and there are only partial matches. If this parameter is false, the request returns a 404 status code when there are no matches or only partial matches.').optional().meta({ found_in: 'query' }),
  from: integer.describe('Skips the specified number of transforms.').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies the maximum number of transforms to obtain.').optional().meta({ found_in: 'query' }),
  exclude_generated: z.boolean().describe('Excludes fields that were automatically added when creating the transform. This allows the configuration to be in an acceptable format to be retrieved and then added to another cluster.').optional().meta({ found_in: 'query' })
}).meta({ id: 'TransformGetTransformRequest' })
export type TransformGetTransformRequest = z.infer<typeof TransformGetTransformRequest>

export const TransformGetTransformTransformSummary = z.object({
  authorization: MlTransformAuthorization.describe('The security privileges that the transform uses to run its queries. If Elastic Stack security features were disabled at the time of the most recent update to the transform, this property is omitted.').optional(),
  create_time: EpochTime.describe('The time the transform was created.').optional(),
  create_time_string: DateTime.optional(),
  description: z.string().describe('Free text description of the transform.').optional(),
  dest: ReindexDestination.describe('The destination for the transform.'),
  frequency: Duration.optional(),
  id: Id,
  latest: TransformLatest.optional(),
  pivot: TransformPivot.describe('The pivot method transforms the data by aggregating and grouping it.').optional(),
  retention_policy: TransformRetentionPolicyContainer.optional(),
  settings: TransformSettings.describe('Defines optional transform settings.').optional(),
  source: TransformSource.describe('The source of the data for the transform.'),
  sync: TransformSyncContainer.describe('Defines the properties transforms require to run continuously.').optional(),
  version: VersionString.describe('The version of Elasticsearch that existed on the node when the transform was created.').optional(),
  _meta: Metadata.optional()
}).meta({ id: 'TransformGetTransformTransformSummary' })
export type TransformGetTransformTransformSummary = z.infer<typeof TransformGetTransformTransformSummary>

export const TransformGetTransformResponse = z.object({
  count: long,
  transforms: z.array(TransformGetTransformTransformSummary)
}).meta({ id: 'TransformGetTransformResponse' })
export type TransformGetTransformResponse = z.infer<typeof TransformGetTransformResponse>

export const TransformGetTransformStatsTransformProgress = z.object({
  docs_indexed: long,
  docs_processed: long,
  docs_remaining: long.optional(),
  percent_complete: double.optional(),
  total_docs: long.optional()
}).meta({ id: 'TransformGetTransformStatsTransformProgress' })
export type TransformGetTransformStatsTransformProgress = z.infer<typeof TransformGetTransformStatsTransformProgress>

export const TransformGetTransformStatsCheckpointStats = z.object({
  checkpoint: long,
  checkpoint_progress: TransformGetTransformStatsTransformProgress.optional(),
  timestamp: DateTime.optional(),
  timestamp_millis: EpochTime.optional(),
  time_upper_bound: DateTime.optional(),
  time_upper_bound_millis: EpochTime.optional()
}).meta({ id: 'TransformGetTransformStatsCheckpointStats' })
export type TransformGetTransformStatsCheckpointStats = z.infer<typeof TransformGetTransformStatsCheckpointStats>

export const TransformGetTransformStatsCheckpointing = z.object({
  changes_last_detected_at: long.optional(),
  changes_last_detected_at_string: DateTime.optional(),
  last: TransformGetTransformStatsCheckpointStats,
  next: TransformGetTransformStatsCheckpointStats.optional(),
  operations_behind: long.optional(),
  last_search_time: long.optional(),
  last_search_time_string: DateTime.optional()
}).meta({ id: 'TransformGetTransformStatsCheckpointing' })
export type TransformGetTransformStatsCheckpointing = z.infer<typeof TransformGetTransformStatsCheckpointing>

/**
 * Get transform stats.
 *
 * Get usage information for transforms.
 */
export const TransformGetTransformStatsRequest = z.object({
  ...RequestBase.shape,
  transform_id: Names.describe('Identifier for the transform. It can be a transform identifier or a wildcard expression. You can get information for all transforms by using `_all`, by specifying `*` as the `<transform_id>`, or by omitting the `<transform_id>`.').meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: 1. Contains wildcard expressions and there are no transforms that match. 2. Contains the _all string or no identifiers and there are no matches. 3. Contains wildcard expressions and there are only partial matches. If this parameter is false, the request returns a 404 status code when there are no matches or only partial matches.').optional().meta({ found_in: 'query' }),
  from: long.describe('Skips the specified number of transforms.').optional().meta({ found_in: 'query' }),
  size: long.describe('Specifies the maximum number of transforms to obtain.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Controls the time to wait for the stats').optional().meta({ found_in: 'query' })
}).meta({ id: 'TransformGetTransformStatsRequest' })
export type TransformGetTransformStatsRequest = z.infer<typeof TransformGetTransformStatsRequest>

export const TransformGetTransformStatsTransformHealthIssue = z.object({
  type: z.string().describe('The type of the issue'),
  issue: z.string().describe('A description of the issue'),
  details: z.string().describe('Details about the issue').optional(),
  count: integer.describe('Number of times this issue has occurred since it started'),
  first_occurrence: EpochTime.describe('The timestamp this issue occurred for for the first time').optional(),
  first_occurence_string: DateTime.optional()
}).meta({ id: 'TransformGetTransformStatsTransformHealthIssue' })
export type TransformGetTransformStatsTransformHealthIssue = z.infer<typeof TransformGetTransformStatsTransformHealthIssue>

export const TransformGetTransformStatsTransformStatsHealth = z.object({
  status: HealthStatus,
  issues: z.array(TransformGetTransformStatsTransformHealthIssue).describe('If a non-healthy status is returned, contains a list of issues of the transform.').optional()
}).meta({ id: 'TransformGetTransformStatsTransformStatsHealth' })
export type TransformGetTransformStatsTransformStatsHealth = z.infer<typeof TransformGetTransformStatsTransformStatsHealth>

export const TransformGetTransformStatsTransformIndexerStats = z.object({
  delete_time_in_ms: EpochTime.optional(),
  documents_indexed: long,
  documents_deleted: long.optional(),
  documents_processed: long,
  exponential_avg_checkpoint_duration_ms: DurationValue,
  exponential_avg_documents_indexed: double,
  exponential_avg_documents_processed: double,
  index_failures: long,
  index_time_in_ms: DurationValue,
  index_total: long,
  pages_processed: long,
  processing_time_in_ms: DurationValue,
  processing_total: long,
  search_failures: long,
  search_time_in_ms: DurationValue,
  search_total: long,
  trigger_count: long
}).meta({ id: 'TransformGetTransformStatsTransformIndexerStats' })
export type TransformGetTransformStatsTransformIndexerStats = z.infer<typeof TransformGetTransformStatsTransformIndexerStats>

export const TransformGetTransformStatsTransformStats = z.object({
  checkpointing: TransformGetTransformStatsCheckpointing,
  health: TransformGetTransformStatsTransformStatsHealth.optional(),
  id: Id,
  reason: z.string().optional(),
  state: z.string(),
  stats: TransformGetTransformStatsTransformIndexerStats
}).meta({ id: 'TransformGetTransformStatsTransformStats' })
export type TransformGetTransformStatsTransformStats = z.infer<typeof TransformGetTransformStatsTransformStats>

export const TransformGetTransformStatsResponse = z.object({
  count: long,
  transforms: z.array(TransformGetTransformStatsTransformStats)
}).meta({ id: 'TransformGetTransformStatsResponse' })
export type TransformGetTransformStatsResponse = z.infer<typeof TransformGetTransformStatsResponse>

/**
 * Preview a transform.
 *
 * Generates a preview of the results that you will get when you create a transform with the same configuration.
 *
 * It returns a maximum of 100 results. The calculations are based on all the current data in the source index. It also
 * generates a list of mappings and settings for the destination index. These values are determined based on the field
 * types of the source index and the transform aggregations.
 */
export const TransformPreviewTransformRequest = z.object({
  ...RequestBase.shape,
  transform_id: Id.describe('Identifier for the transform to preview. If you specify this path parameter, you cannot provide transform configuration details in the request body.').optional().meta({ found_in: 'path' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  dest: TransformDestination.describe('The destination for the transform.').optional().meta({ found_in: 'body' }),
  description: z.string().describe('Free text description of the transform.').optional().meta({ found_in: 'body' }),
  frequency: Duration.describe('The interval between checks for changes in the source indices when the transform is running continuously. Also determines the retry interval in the event of transient failures while the transform is searching or indexing. The minimum value is 1s and the maximum is 1h.').optional().meta({ found_in: 'body' }),
  pivot: TransformPivot.describe('The pivot method transforms the data by aggregating and grouping it. These objects define the group by fields and the aggregation to reduce the data.').optional().meta({ found_in: 'body' }),
  source: TransformSource.describe('The source of the data for the transform.').optional().meta({ found_in: 'body' }),
  settings: TransformSettings.describe('Defines optional transform settings.').optional().meta({ found_in: 'body' }),
  sync: TransformSyncContainer.describe('Defines the properties transforms require to run continuously.').optional().meta({ found_in: 'body' }),
  retention_policy: TransformRetentionPolicyContainer.describe('Defines a retention policy for the transform. Data that meets the defined criteria is deleted from the destination index.').optional().meta({ found_in: 'body' }),
  latest: TransformLatest.describe('The latest method transforms the data by finding the latest document for each unique key.').optional().meta({ found_in: 'body' })
}).meta({ id: 'TransformPreviewTransformRequest' })
export type TransformPreviewTransformRequest = z.infer<typeof TransformPreviewTransformRequest>

export const TransformPreviewTransformResponse = z.object({
  generated_dest_index: IndicesIndexState,
  preview: z.array(z.any())
}).meta({ id: 'TransformPreviewTransformResponse' })
export type TransformPreviewTransformResponse = z.infer<typeof TransformPreviewTransformResponse>

/**
 * Create a transform.
 *
 * Creates a transform.
 *
 * A transform copies data from source indices, transforms it, and persists it into an entity-centric destination index. You can also think of the destination index as a two-dimensional tabular data structure (known as
 * a data frame). The ID for each document in the data frame is generated from a hash of the entity, so there is a
 * unique row per entity.
 *
 * You must choose either the latest or pivot method for your transform; you cannot use both in a single transform. If
 * you choose to use the pivot method for your transform, the entities are defined by the set of `group_by` fields in
 * the pivot object. If you choose to use the latest method, the entities are defined by the `unique_key` field values
 * in the latest object.
 *
 * You must have `create_index`, `index`, and `read` privileges on the destination index and `read` and
 * `view_index_metadata` privileges on the source indices. When Elasticsearch security features are enabled, the
 * transform remembers which roles the user that created it had at the time of creation and uses those same roles. If
 * those roles do not have the required privileges on the source and destination indices, the transform fails when it
 * attempts unauthorized operations.
 *
 * NOTE: You must use Kibana or this API to create a transform. Do not add a transform directly into any
 * `.transform-internal*` indices using the Elasticsearch index API. If Elasticsearch security features are enabled, do
 * not give users any privileges on `.transform-internal*` indices. If you used transforms prior to 7.5, also do not
 * give users any privileges on `.data-frame-internal*` indices.
 */
export const TransformPutTransformRequest = z.object({
  ...RequestBase.shape,
  transform_id: Id.describe('Identifier for the transform. This identifier can contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It has a 64 character limit and must start and end with alphanumeric characters.').meta({ found_in: 'path' }),
  defer_validation: z.boolean().describe('When the transform is created, a series of validations occur to ensure its success. For example, there is a check for the existence of the source indices and a check that the destination index is not part of the source index pattern. You can use this parameter to skip the checks, for example when the source index does not exist until after the transform is created. The validations are always run when you start the transform, however, with the exception of privilege checks.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  dest: TransformDestination.describe('The destination for the transform.').meta({ found_in: 'body' }),
  description: z.string().describe('Free text description of the transform.').optional().meta({ found_in: 'body' }),
  frequency: Duration.describe('The interval between checks for changes in the source indices when the transform is running continuously. Also determines the retry interval in the event of transient failures while the transform is searching or indexing. The minimum value is `1s` and the maximum is `1h`.').optional().meta({ found_in: 'body' }),
  latest: TransformLatest.describe('The latest method transforms the data by finding the latest document for each unique key.').optional().meta({ found_in: 'body' }),
  _meta: Metadata.describe('Defines optional transform metadata.').optional().meta({ found_in: 'body' }),
  pivot: TransformPivot.describe('The pivot method transforms the data by aggregating and grouping it. These objects define the group by fields and the aggregation to reduce the data.').optional().meta({ found_in: 'body' }),
  retention_policy: TransformRetentionPolicyContainer.describe('Defines a retention policy for the transform. Data that meets the defined criteria is deleted from the destination index.').optional().meta({ found_in: 'body' }),
  settings: TransformSettings.describe('Defines optional transform settings.').optional().meta({ found_in: 'body' }),
  source: TransformSource.describe('The source of the data for the transform.').meta({ found_in: 'body' }),
  sync: TransformSyncContainer.describe('Defines the properties transforms require to run continuously.').optional().meta({ found_in: 'body' })
}).meta({ id: 'TransformPutTransformRequest' })
export type TransformPutTransformRequest = z.infer<typeof TransformPutTransformRequest>

export const TransformPutTransformResponse = AcknowledgedResponseBase.meta({ id: 'TransformPutTransformResponse' })
export type TransformPutTransformResponse = z.infer<typeof TransformPutTransformResponse>

/**
 * Reset a transform.
 *
 * Before you can reset it, you must stop it; alternatively, use the `force` query parameter.
 * If the destination index was created by the transform, it is deleted.
 */
export const TransformResetTransformRequest = z.object({
  ...RequestBase.shape,
  transform_id: Id.describe('Identifier for the transform. This identifier can contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It has a 64 character limit and must start and end with alphanumeric characters.').meta({ found_in: 'path' }),
  force: z.boolean().describe('If this value is `true`, the transform is reset regardless of its current state. If it\'s `false`, the transform must be stopped before it can be reset.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'TransformResetTransformRequest' })
export type TransformResetTransformRequest = z.infer<typeof TransformResetTransformRequest>

export const TransformResetTransformResponse = AcknowledgedResponseBase.meta({ id: 'TransformResetTransformResponse' })
export type TransformResetTransformResponse = z.infer<typeof TransformResetTransformResponse>

/**
 * Schedule a transform to start now.
 *
 * Instantly run a transform to process data.
 * If you run this API, the transform will process the new data instantly,
 * without waiting for the configured frequency interval. After the API is called,
 * the transform will be processed again at `now + frequency` unless the API
 * is called again in the meantime.
 */
export const TransformScheduleNowTransformRequest = z.object({
  ...RequestBase.shape,
  transform_id: Id.describe('Identifier for the transform.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Controls the time to wait for the scheduling to take place').optional().meta({ found_in: 'query' }),
  defer: z.boolean().describe('When true, defers the scheduling by the transform\'s configured sync delay instead of triggering immediately. The transform will process new data after the delay elapses rather than right away.').optional().meta({ found_in: 'query' })
}).meta({ id: 'TransformScheduleNowTransformRequest' })
export type TransformScheduleNowTransformRequest = z.infer<typeof TransformScheduleNowTransformRequest>

export const TransformScheduleNowTransformResponse = AcknowledgedResponseBase.meta({ id: 'TransformScheduleNowTransformResponse' })
export type TransformScheduleNowTransformResponse = z.infer<typeof TransformScheduleNowTransformResponse>

/**
 * Set upgrade_mode for transform indices.
 *
 * Sets a cluster wide upgrade_mode setting that prepares transform
 * indices for an upgrade.
 * When upgrading your cluster, in some circumstances you must restart your
 * nodes and reindex your transform indices. In those circumstances,
 * there must be no transforms running. You can close the transforms,
 * do the upgrade, then open all the transforms again. Alternatively,
 * you can use this API to temporarily halt tasks associated with the transforms
 * and prevent new transforms from opening. You can also use this API
 * during upgrades that do not require you to reindex your transform
 * indices, though stopping transforms is not a requirement in that case.
 * You can see the current value for the upgrade_mode setting by using the get
 * transform info API.
 */
export const TransformSetUpgradeModeRequest = z.object({
  ...RequestBase.shape,
  enabled: z.boolean().describe('When `true`, it enables `upgrade_mode` which temporarily halts all transform tasks and prohibits new transform tasks from starting.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The time to wait for the request to be completed.').optional().meta({ found_in: 'query' })
}).meta({ id: 'TransformSetUpgradeModeRequest' })
export type TransformSetUpgradeModeRequest = z.infer<typeof TransformSetUpgradeModeRequest>

export const TransformSetUpgradeModeResponse = AcknowledgedResponseBase.meta({ id: 'TransformSetUpgradeModeResponse' })
export type TransformSetUpgradeModeResponse = z.infer<typeof TransformSetUpgradeModeResponse>

/**
 * Start a transform.
 *
 * When you start a transform, it creates the destination index if it does not already exist. The `number_of_shards` is
 * set to `1` and the `auto_expand_replicas` is set to `0-1`. If it is a pivot transform, it deduces the mapping
 * definitions for the destination index from the source indices and the transform aggregations. If fields in the
 * destination index are derived from scripts (as in the case of `scripted_metric` or `bucket_script` aggregations),
 * the transform uses dynamic mappings unless an index template exists. If it is a latest transform, it does not deduce
 * mapping definitions; it uses dynamic mappings. To use explicit mappings, create the destination index before you
 * start the transform. Alternatively, you can create an index template, though it does not affect the deduced mappings
 * in a pivot transform.
 *
 * When the transform starts, a series of validations occur to ensure its success. If you deferred validation when you
 * created the transform, they occur when you start the transform—with the exception of privilege checks. When
 * Elasticsearch security features are enabled, the transform remembers which roles the user that created it had at the
 * time of creation and uses those same roles. If those roles do not have the required privileges on the source and
 * destination indices, the transform fails when it attempts unauthorized operations.
 */
export const TransformStartTransformRequest = z.object({
  ...RequestBase.shape,
  transform_id: Id.describe('Identifier for the transform.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  from: z.string().describe('Restricts the set of transformed entities to those changed after this time. Relative times like now-30d are supported. Only applicable for continuous transforms.').optional().meta({ found_in: 'query' })
}).meta({ id: 'TransformStartTransformRequest' })
export type TransformStartTransformRequest = z.infer<typeof TransformStartTransformRequest>

export const TransformStartTransformResponse = AcknowledgedResponseBase.meta({ id: 'TransformStartTransformResponse' })
export type TransformStartTransformResponse = z.infer<typeof TransformStartTransformResponse>

/**
 * Stop transforms.
 *
 * Stops one or more transforms.
 */
export const TransformStopTransformRequest = z.object({
  ...RequestBase.shape,
  transform_id: Name.describe('Identifier for the transform. To stop multiple transforms, use a comma-separated list or a wildcard expression. To stop all transforms, use `_all` or `*` as the identifier.').meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: contains wildcard expressions and there are no transforms that match; contains the `_all` string or no identifiers and there are no matches; contains wildcard expressions and there are only partial matches. If it is true, the API returns a successful acknowledgement message when there are no matches. When there are only partial matches, the API stops the appropriate transforms. If it is false, the request returns a 404 status code when there are no matches or only partial matches.').optional().meta({ found_in: 'query' }),
  force: z.boolean().describe('If it is true, the API forcefully stops the transforms.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response when `wait_for_completion` is `true`. If no response is received before the timeout expires, the request returns a timeout exception. However, the request continues processing and eventually moves the transform to a STOPPED state.').optional().meta({ found_in: 'query' }),
  wait_for_checkpoint: z.boolean().describe('If it is true, the transform does not completely stop until the current checkpoint is completed. If it is false, the transform stops as soon as possible.').optional().meta({ found_in: 'query' }),
  wait_for_completion: z.boolean().describe('If it is true, the API blocks until the indexer state completely stops. If it is false, the API returns immediately and the indexer is stopped asynchronously in the background.').optional().meta({ found_in: 'query' })
}).meta({ id: 'TransformStopTransformRequest' })
export type TransformStopTransformRequest = z.infer<typeof TransformStopTransformRequest>

export const TransformStopTransformResponse = AcknowledgedResponseBase.meta({ id: 'TransformStopTransformResponse' })
export type TransformStopTransformResponse = z.infer<typeof TransformStopTransformResponse>

/**
 * Update a transform.
 *
 * Updates certain properties of a transform.
 *
 * All updated properties except `description` do not take effect until after the transform starts the next checkpoint,
 * thus there is data consistency in each checkpoint. To use this API, you must have `read` and `view_index_metadata`
 * privileges for the source indices. You must also have `index` and `read` privileges for the destination index. When
 * Elasticsearch security features are enabled, the transform remembers which roles the user who updated it had at the
 * time of update and runs with those privileges.
 */
export const TransformUpdateTransformRequest = z.object({
  ...RequestBase.shape,
  transform_id: Id.describe('Identifier for the transform.').meta({ found_in: 'path' }),
  defer_validation: z.boolean().describe('When true, deferrable validations are not run. This behavior may be desired if the source index does not exist until after the transform is created.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  dest: TransformDestination.describe('The destination for the transform.').optional().meta({ found_in: 'body' }),
  description: z.string().describe('Free text description of the transform.').optional().meta({ found_in: 'body' }),
  frequency: Duration.describe('The interval between checks for changes in the source indices when the transform is running continuously. Also determines the retry interval in the event of transient failures while the transform is searching or indexing. The minimum value is 1s and the maximum is 1h.').optional().meta({ found_in: 'body' }),
  _meta: Metadata.describe('Defines optional transform metadata.').optional().meta({ found_in: 'body' }),
  source: TransformSource.describe('The source of the data for the transform.').optional().meta({ found_in: 'body' }),
  settings: TransformSettings.describe('Defines optional transform settings.').optional().meta({ found_in: 'body' }),
  sync: TransformSyncContainer.describe('Defines the properties transforms require to run continuously.').optional().meta({ found_in: 'body' }),
  retention_policy: z.union([TransformRetentionPolicyContainer, z.null()]).describe('Defines a retention policy for the transform. Data that meets the defined criteria is deleted from the destination index.').optional().meta({ found_in: 'body' })
}).meta({ id: 'TransformUpdateTransformRequest' })
export type TransformUpdateTransformRequest = z.infer<typeof TransformUpdateTransformRequest>

export const TransformUpdateTransformResponse = z.object({
  authorization: MlTransformAuthorization.optional(),
  create_time: long,
  description: z.string(),
  dest: ReindexDestination,
  frequency: Duration.optional(),
  id: Id,
  latest: TransformLatest.optional(),
  pivot: TransformPivot.optional(),
  retention_policy: TransformRetentionPolicyContainer.optional(),
  settings: TransformSettings,
  source: ReindexSource,
  sync: TransformSyncContainer.optional(),
  version: VersionString,
  _meta: Metadata.optional()
}).meta({ id: 'TransformUpdateTransformResponse' })
export type TransformUpdateTransformResponse = z.infer<typeof TransformUpdateTransformResponse>

/**
 * Upgrade all transforms.
 *
 * Transforms are compatible across minor versions and between supported major versions.
 * However, over time, the format of transform configuration information may change.
 * This API identifies transforms that have a legacy configuration format and upgrades them to the latest version.
 * It also cleans up the internal data structures that store the transform state and checkpoints.
 * The upgrade does not affect the source and destination indices.
 * The upgrade also does not affect the roles that transforms use when Elasticsearch security features are enabled; the role used to read source data and write to the destination index remains unchanged.
 *
 * If a transform upgrade step fails, the upgrade stops and an error is returned about the underlying issue.
 * Resolve the issue then re-run the process again.
 * A summary is returned when the upgrade is finished.
 *
 * To ensure continuous transforms remain running during a major version upgrade of the cluster – for example, from 7.16 to 8.0 – it is recommended to upgrade transforms before upgrading the cluster.
 * You may want to perform a recent cluster backup prior to the upgrade.
 */
export const TransformUpgradeTransformsRequest = z.object({
  ...RequestBase.shape,
  dry_run: z.boolean().describe('When true, the request checks for updates but does not run them.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'TransformUpgradeTransformsRequest' })
export type TransformUpgradeTransformsRequest = z.infer<typeof TransformUpgradeTransformsRequest>

export const TransformUpgradeTransformsResponse = z.object({
  needs_update: integer.describe('The number of transforms that need to be upgraded.'),
  no_action: integer.describe('The number of transforms that don’t require upgrading.'),
  updated: integer.describe('The number of transforms that have been upgraded.')
}).meta({ id: 'TransformUpgradeTransformsResponse' })
export type TransformUpgradeTransformsResponse = z.infer<typeof TransformUpgradeTransformsResponse>
