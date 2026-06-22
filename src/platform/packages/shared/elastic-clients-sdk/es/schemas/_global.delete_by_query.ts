/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { BulkIndexByScrollFailure, Conflicts, Duration, DurationValue, ExpandWildcards, Indices, ReindexStatus, RequestBase, Retries, Routing, SearchType, SlicedScroll, Slices, TaskId, WaitForActiveShards, float, integer, long } from './_types'
import { QueryDslOperator, QueryDslQueryContainer, Sort } from './_types.query_dsl'

/**
 * Delete documents.
 *
 * Deletes documents that match the specified query.
 *
 * If the Elasticsearch security features are enabled, you must have the following index privileges for the target data stream, index, or alias:
 *
 * * `read`
 * * `delete` or `write`
 *
 * You can specify the query criteria in the request URI or the request body using the same syntax as the search API.
 * When you submit a delete by query request, Elasticsearch gets a snapshot of the data stream or index when it begins processing the request and deletes matching documents using internal versioning.
 * If a document changes between the time that the snapshot is taken and the delete operation is processed, it results in a version conflict and the delete operation fails.
 *
 * NOTE: Documents with a version equal to 0 cannot be deleted using delete by query because internal versioning does not support 0 as a valid version number.
 *
 * While processing a delete by query request, Elasticsearch performs multiple search requests sequentially to find all of the matching documents to delete.
 * A bulk delete request is performed for each batch of matching documents.
 * If a search or bulk request is rejected, the requests are retried up to 10 times, with exponential back off.
 * If the maximum retry limit is reached, processing halts and all failed requests are returned in the response.
 * Any delete requests that completed successfully still stick, they are not rolled back.
 *
 * You can opt to count version conflicts instead of halting and returning by setting `conflicts` to `proceed`.
 * Note that if you opt to count version conflicts the operation could attempt to delete more documents from the source than `max_docs` until it has successfully deleted `max_docs documents`, or it has gone through every document in the source query.
 *
 * **Throttling delete requests**
 *
 * To control the rate at which delete by query issues batches of delete operations, you can set `requests_per_second` to any positive decimal number.
 * This pads each batch with a wait time to throttle the rate.
 * Set `requests_per_second` to `-1` to disable throttling.
 *
 * Throttling uses a wait time between batches so that the internal scroll requests can be given a timeout that takes the request padding into account.
 * The padding time is the difference between the batch size divided by the `requests_per_second` and the time spent writing.
 * By default the batch size is `1000`, so if `requests_per_second` is set to `500`:
 *
 * ```
 * target_time = 1000 / 500 per second = 2 seconds
 * wait_time = target_time - write_time = 2 seconds - .5 seconds = 1.5 seconds
 * ```
 *
 * Since the batch is issued as a single `_bulk` request, large batch sizes cause Elasticsearch to create many requests and wait before starting the next set.
 * This is "bursty" instead of "smooth".
 *
 * **Slicing**
 *
 * Delete by query supports sliced scroll to parallelize the delete process.
 * This can improve efficiency and provide a convenient way to break the request down into smaller parts.
 *
 * Setting `slices` to `auto` lets Elasticsearch choose the number of slices to use.
 * This setting will use one slice per shard, up to a certain limit.
 * If there are multiple source data streams or indices, it will choose the number of slices based on the index or backing index with the smallest number of shards.
 * Adding slices to the delete by query operation creates sub-requests which means it has some quirks:
 *
 * * You can see these requests in the tasks APIs. These sub-requests are "child" tasks of the task for the request with slices.
 * * Fetching the status of the task for the request with slices only contains the status of completed slices.
 * * These sub-requests are individually addressable for things like cancellation and rethrottling.
 * * Rethrottling the request with `slices` will rethrottle the unfinished sub-request proportionally.
 * * Canceling the request with `slices` will cancel each sub-request.
 * * Due to the nature of `slices` each sub-request won't get a perfectly even portion of the documents. All documents will be addressed, but some slices may be larger than others. Expect larger slices to have a more even distribution.
 * * Parameters like `requests_per_second` and `max_docs` on a request with `slices` are distributed proportionally to each sub-request. Combine that with the earlier point about distribution being uneven and you should conclude that using `max_docs` with `slices` might not result in exactly `max_docs` documents being deleted.
 * * Each sub-request gets a slightly different snapshot of the source data stream or index though these are all taken at approximately the same time.
 *
 * If you're slicing manually or otherwise tuning automatic slicing, keep in mind that:
 *
 * * Query performance is most efficient when the number of slices is equal to the number of shards in the index or backing index. If that number is large (for example, 500), choose a lower number as too many `slices` hurts performance. Setting `slices` higher than the number of shards generally does not improve efficiency and adds overhead.
 * * Delete performance scales linearly across available resources with the number of slices.
 *
 * Whether query or delete performance dominates the runtime depends on the documents being reindexed and cluster resources.
 *
 * **Cancel a delete by query operation**
 *
 * Any delete by query can be canceled using the task cancel API. For example:
 *
 * ```
 * POST _tasks/r1A2WoRbTwKZ516z6NEs5A:36619/_cancel
 * ```
 *
 * The task ID can be found by using the get tasks API.
 *
 * Cancellation should happen quickly but might take a few seconds.
 * The get task status API will continue to list the delete by query task until this task checks that it has been cancelled and terminates itself.
 */
export const DeleteByQueryRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-separated list of data streams, indices, and aliases to search. It supports wildcards (`*`). To search all data streams or indices, omit this parameter or use `*` or `_all`.').meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  analyzer: z.string().describe('Analyzer to use for the query string. This parameter can be used only when the `q` query string parameter is specified.').optional().meta({ found_in: 'query' }),
  analyze_wildcard: z.boolean().describe('If `true`, wildcard and prefix queries are analyzed. This parameter can be used only when the `q` query string parameter is specified.').optional().meta({ found_in: 'query' }),
  conflicts: Conflicts.describe('What to do if delete by query hits version conflicts: `abort` or `proceed`.').optional().meta({ found_in: 'query' }),
  default_operator: z.lazy(() => QueryDslOperator).describe('The default operator for query string query: `and` or `or`. This parameter can be used only when the `q` query string parameter is specified.').optional().meta({ found_in: 'query' }),
  df: z.string().describe('The field to use as default where no field prefix is given in the query string. This parameter can be used only when the `q` query string parameter is specified.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('The type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. It supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  from: long.describe('Skips the specified number of documents.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  lenient: z.boolean().describe('If `true`, format-based query failures (such as providing text to a numeric field) in the query string will be ignored. This parameter can be used only when the `q` query string parameter is specified.').optional().meta({ found_in: 'query' }),
  preference: z.string().describe('The node or shard the operation should be performed on. It is random by default.').optional().meta({ found_in: 'query' }),
  refresh: z.boolean().describe('If `true`, Elasticsearch refreshes all shards involved in the delete by query after the request completes. This is different than the delete API\'s `refresh` parameter, which causes just the shard that received the delete request to be refreshed. Unlike the delete API, it does not support `wait_for`.').optional().meta({ found_in: 'query' }),
  request_cache: z.boolean().describe('If `true`, the request cache is used for this request. Defaults to the index-level setting.').optional().meta({ found_in: 'query' }),
  requests_per_second: float.describe('The throttle for this request in sub-requests per second.').optional().meta({ found_in: 'query' }),
  routing: Routing.describe('A custom value used to route operations to a specific shard.').optional().meta({ found_in: 'query' }),
  q: z.string().describe('A query in the Lucene query string syntax.').optional().meta({ found_in: 'query' }),
  scroll: Duration.describe('The period to retain the search context for scrolling.').optional().meta({ found_in: 'query' }),
  scroll_size: long.describe('The size of the scroll request that powers the operation.').optional().meta({ found_in: 'query' }),
  search_timeout: Duration.describe('The explicit timeout for each search request. It defaults to no timeout.').optional().meta({ found_in: 'query' }),
  search_type: SearchType.describe('The type of the search operation. Available options include `query_then_fetch` and `dfs_query_then_fetch`.').optional().meta({ found_in: 'query' }),
  slices: Slices.describe('The number of slices this task should be divided into.').optional().meta({ found_in: 'query' }),
  stats: z.array(z.string()).describe('The specific `tag` of the request for logging and statistical purposes.').optional().meta({ found_in: 'query' }),
  terminate_after: long.describe('The maximum number of documents to collect for each shard. If a query reaches this limit, Elasticsearch terminates the query early. Elasticsearch collects documents before sorting. Use with caution. Elasticsearch applies this parameter to each shard handling the request. When possible, let Elasticsearch perform early termination automatically. Avoid specifying this parameter for requests that target data streams with backing indices across multiple data tiers.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period each deletion request waits for active shards.').optional().meta({ found_in: 'query' }),
  version: z.boolean().describe('If `true`, returns the document version as part of a hit.').optional().meta({ found_in: 'query' }),
  wait_for_active_shards: WaitForActiveShards.describe('The number of shard copies that must be active before proceeding with the operation. Set to `all` or any positive integer up to the total number of shards in the index (`number_of_replicas+1`). The `timeout` value controls how long each write request waits for unavailable shards to become available.').optional().meta({ found_in: 'query' }),
  wait_for_completion: z.boolean().describe('If `true`, the request blocks until the operation is complete. If `false`, Elasticsearch performs some preflight checks, launches the request, and returns a task you can use to cancel or get the status of the task. Elasticsearch creates a record of this task as a document at `.tasks/task/{taskId}`. When you are done with a task, you should delete the task document so Elasticsearch can reclaim the space.').optional().meta({ found_in: 'query' }),
  max_docs: long.describe('The maximum number of documents to delete.').optional().meta({ found_in: 'body' }),
  query: z.lazy(() => QueryDslQueryContainer).describe('The documents to delete specified with Query DSL.').optional().meta({ found_in: 'body' }),
  slice: SlicedScroll.describe('Slice the request manually using the provided slice ID and total number of slices.').optional().meta({ found_in: 'body' }),
  sort: z.lazy(() => Sort).describe('A sort object that specifies the order of deleted documents.').optional().meta({ found_in: 'body' })
}).meta({ id: 'DeleteByQueryRequest' })
export type DeleteByQueryRequest = z.infer<typeof DeleteByQueryRequest>

export const DeleteByQueryResponse = z.object({
  batches: long.describe('The number of scroll responses pulled back by the delete by query.').optional(),
  deleted: long.describe('The number of documents that were successfully deleted.').optional(),
  failures: z.array(BulkIndexByScrollFailure).describe('An array of failures if there were any unrecoverable errors during the process. If this array is not empty, the request ended abnormally because of those failures. Delete by query is implemented using batches and any failures cause the entire process to end but all failures in the current batch are collected into the array. You can use the `conflicts` option to prevent reindex from ending on version conflicts.').optional(),
  noops: long.describe('This field is always equal to zero for delete by query. It exists only so that delete by query, update by query, and reindex APIs return responses with the same structure.').optional(),
  requests_per_second: float.describe('The number of requests per second effectively run during the delete by query.').optional(),
  retries: Retries.describe('The number of retries attempted by delete by query. `bulk` is the number of bulk actions retried. `search` is the number of search actions retried.').optional(),
  slice_id: integer.optional(),
  slices: z.array(ReindexStatus).describe('Status of each slice if the delete by query was sliced').optional(),
  task: TaskId.optional(),
  throttled: Duration.optional(),
  throttled_millis: DurationValue.describe('The number of milliseconds the request slept to conform to `requests_per_second`.').optional(),
  throttled_until: Duration.optional(),
  throttled_until_millis: DurationValue.describe('This field should always be equal to zero in a `_delete_by_query` response. It has meaning only when using the task API, where it indicates the next time (in milliseconds since epoch) a throttled request will be run again in order to conform to `requests_per_second`.').optional(),
  timed_out: z.boolean().describe('If `true`, some requests run during the delete by query operation timed out.').optional(),
  took: DurationValue.describe('The number of milliseconds from start to end of the whole operation.').optional(),
  total: long.describe('The number of documents that were successfully processed.').optional(),
  version_conflicts: long.describe('The number of version conflicts that the delete by query hit.').optional()
}).meta({ id: 'DeleteByQueryResponse' })
export type DeleteByQueryResponse = z.infer<typeof DeleteByQueryResponse>
