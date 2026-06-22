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

export interface ErrorCauseShape {
  type: string
  reason?: string | null | undefined
  stack_trace?: string | undefined
  caused_by?: ErrorCauseShape | undefined
  root_cause?: ErrorCauseShape[] | undefined
  suppressed?: ErrorCauseShape[] | undefined
}
/**
 * Cause and details about a request failure. This class defines the properties common to all error types.
 * Additional details are also provided, that depend on the error type.
 */
export const ErrorCause = z.looseObject({
  type: z.string().describe('The type of error'),
  reason: z.union([z.string(), z.null()]).describe('A human-readable explanation of the error, in English.').optional(),
  stack_trace: z.string().describe('The server stack trace. Present only if the `error_trace=true` parameter was sent with the request.').optional(),
  get caused_by () { return ErrorCause.optional() },
  get root_cause () { return ErrorCause.array().optional() },
  get suppressed () { return ErrorCause.array().optional() }
}).meta({ id: 'ErrorCause' })
export type ErrorCause = z.infer<typeof ErrorCause>

export const ExpandWildcard = z.enum(['all', 'open', 'closed', 'hidden', 'none']).meta({ id: 'ExpandWildcard' })
export type ExpandWildcard = z.infer<typeof ExpandWildcard>

export const ExpandWildcards = z.union([ExpandWildcard, z.array(ExpandWildcard)]).meta({ id: 'ExpandWildcards' })
export type ExpandWildcards = z.infer<typeof ExpandWildcards>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const ShardFailure = z.object({
  index: IndexName.optional(),
  _index: IndexName.optional(),
  node: z.string().optional(),
  _node: z.string().optional(),
  reason: z.lazy(() => ErrorCause),
  shard: integer.optional(),
  _shard: integer.optional(),
  status: z.string().optional(),
  primary: z.boolean().optional()
}).meta({ id: 'ShardFailure' })
export type ShardFailure = z.infer<typeof ShardFailure>

export const uint = z.number().meta({ id: 'uint' })
export type uint = z.infer<typeof uint>

export const ShardStatistics = z.object({
  failed: uint.describe('The number of shards the operation or search attempted to run on but failed.'),
  successful: uint.describe('The number of shards the operation or search succeeded on.'),
  total: uint.describe('The number of shards the operation or search will run on overall.'),
  failures: z.array(ShardFailure).optional(),
  skipped: uint.optional()
}).meta({ id: 'ShardStatistics' })
export type ShardStatistics = z.infer<typeof ShardStatistics>

export const ShardsOperationResponseBase = z.object({
  _shards: ShardStatistics.optional()
}).meta({ id: 'ShardsOperationResponseBase' })
export type ShardsOperationResponseBase = z.infer<typeof ShardsOperationResponseBase>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

/**
 * Force a merge.
 *
 * Perform the force merge operation on the shards of one or more indices.
 * For data streams, the API forces a merge on the shards of the stream's backing indices.
 *
 * Merging reduces the number of segments in each shard by merging some of them together and also frees up the space used by deleted documents.
 * Merging normally happens automatically, but sometimes it is useful to trigger a merge manually.
 *
 * WARNING: We recommend force merging only a read-only index (meaning the index is no longer receiving writes).
 * When documents are updated or deleted, the old version is not immediately removed but instead soft-deleted and marked with a "tombstone".
 * These soft-deleted documents are automatically cleaned up during regular segment merges.
 * But force merge can cause very large (greater than 5 GB) segments to be produced, which are not eligible for regular merges.
 * So the number of soft-deleted documents can then grow rapidly, resulting in higher disk usage and worse search performance.
 * If you regularly force merge an index receiving writes, this can also make snapshots more expensive, since the new documents can't be backed up incrementally.
 *
 * **Blocks during a force merge**
 *
 * Calls to this API block until the merge is complete (unless request contains `wait_for_completion=false`).
 * If the client connection is lost before completion then the force merge process will continue in the background.
 * Any new requests to force merge the same indices will also block until the ongoing force merge is complete.
 *
 * **Running force merge asynchronously**
 *
 * If the request contains `wait_for_completion=false`, Elasticsearch performs some preflight checks, launches the request, and returns a task you can use to get the status of the task.
 * However, you can not cancel this task as the force merge task is not cancelable.
 * Elasticsearch creates a record of this task as a document at `_tasks/<task_id>`.
 * When you are done with a task, you should delete the task document so Elasticsearch can reclaim the space.
 *
 * **Force merging multiple indices**
 *
 * You can force merge multiple indices with a single request by targeting:
 *
 * * One or more data streams that contain multiple backing indices
 * * Multiple indices
 * * One or more aliases
 * * All data streams and indices in a cluster
 *
 * Each targeted shard is force-merged separately using the force_merge threadpool.
 * By default each node only has a single `force_merge` thread which means that the shards on that node are force-merged one at a time.
 * If you expand the `force_merge` threadpool on a node then it will force merge its shards in parallel
 *
 * Force merge makes the storage for the shard being merged temporarily increase, as it may require free space up to triple its size in case `max_num_segments parameter` is set to `1`, to rewrite all segments into a new one.
 *
 * **Data streams and time-based indices**
 *
 * Force-merging is useful for managing a data stream's older backing indices and other time-based indices, particularly after a rollover.
 * In these cases, each index only receives indexing traffic for a certain period of time.
 * Once an index receive no more writes, its shards can be force-merged to a single segment.
 * This can be a good idea because single-segment shards can sometimes use simpler and more efficient data structures to perform searches.
 * For example:
 *
 * ```
 * POST /.ds-my-data-stream-2099.03.07-000001/_forcemerge?max_num_segments=1
 * ```
 */
export const IndicesForcemergeRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-separated list of index names; use `_all` or empty string to perform the operation on all indices').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Whether to expand wildcard expression to concrete indices that are open, closed or both.').optional().meta({ found_in: 'query' }),
  flush: z.boolean().describe('Specify whether the index should be flushed after performing the operation').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  max_num_segments: long.describe('The number of segments the index should be merged into (default: dynamic)').optional().meta({ found_in: 'query' }),
  only_expunge_deletes: z.boolean().describe('Specify whether the operation should only expunge deleted documents').optional().meta({ found_in: 'query' }),
  wait_for_completion: z.boolean().describe('Should the request wait until the force merge is completed').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesForcemergeRequest' })
export type IndicesForcemergeRequest = z.infer<typeof IndicesForcemergeRequest>

export const IndicesForcemergeForceMergeResponseBody = z.object({
  ...ShardsOperationResponseBase.shape,
  task: z.string().describe('task contains a task id returned when wait_for_completion=false, you can use the task_id to get the status of the task at _tasks/<task_id>').optional()
}).meta({ id: 'IndicesForcemergeForceMergeResponseBody' })
export type IndicesForcemergeForceMergeResponseBody = z.infer<typeof IndicesForcemergeForceMergeResponseBody>

export const IndicesForcemergeResponse = IndicesForcemergeForceMergeResponseBody.meta({ id: 'IndicesForcemergeResponse' })
export type IndicesForcemergeResponse = z.infer<typeof IndicesForcemergeResponse>
