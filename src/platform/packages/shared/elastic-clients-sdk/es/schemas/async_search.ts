/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { ScriptField, SearchFieldCollapse, SearchHighlight, SearchHitsMetadata, SearchPointInTimeReference, SearchProfile, SearchRescore, SearchSourceConfig, SearchSuggest, SearchSuggester, SearchTrackHits } from './_global.search'
import { AcknowledgedResponseBase, ClusterStatistics, DateTime, Duration, EpochTime, ErrorCause, ExpandWildcards, Field, Fields, Id, IndexName, Indices, RequestBase, Routing, ScrollId, SearchType, ShardStatistics, SlicedScroll, SortResults, SuggestMode, SuggestionName, double, integer, long } from './_types'
import { AggregationsAggregationContainer } from './_types.aggregations'
import { MappingRuntimeFields } from './_types.mapping'
import { KnnSearch, QueryDslFieldAndFormat, QueryDslOperator, QueryDslQueryContainer, Sort } from './_types.query_dsl'

export const AsyncSearchAsyncSearch = z.object({
  aggregations: z.any().describe('Partial aggregations results, coming from the shards that have already completed running the query.').optional(),
  _clusters: ClusterStatistics.optional(),
  fields: z.record(z.string(), z.any()).optional(),
  hits: z.lazy(() => SearchHitsMetadata),
  max_score: double.optional(),
  num_reduce_phases: long.describe('Indicates how many reductions of the results have been performed. If this number increases compared to the last retrieved results for a get asynch search request, you can expect additional results included in the search response.').optional(),
  profile: SearchProfile.optional(),
  pit_id: Id.optional(),
  _scroll_id: ScrollId.optional(),
  _shards: ShardStatistics.describe('Indicates how many shards have run the query. Note that in order for shard results to be included in the search response, they need to be reduced first.'),
  suggest: z.record(SuggestionName, z.array(SearchSuggest)).optional(),
  terminated_early: z.boolean().optional(),
  timed_out: z.boolean(),
  took: long
}).meta({ id: 'AsyncSearchAsyncSearch' })
export type AsyncSearchAsyncSearch = z.infer<typeof AsyncSearchAsyncSearch>

export const AsyncSearchAsyncSearchResponseBase = z.object({
  id: Id.optional(),
  is_partial: z.boolean().describe('When the query is no longer running, this property indicates whether the search failed or was successfully completed on all shards. While the query is running, `is_partial` is always set to `true`.'),
  is_running: z.boolean().describe('Indicates whether the search is still running or has completed. > info > If the search failed after some shards returned their results or the node that is coordinating the async search dies, results may be partial even though `is_running` is `false`.'),
  expiration_time: DateTime.describe('Indicates when the async search will expire.').optional(),
  expiration_time_in_millis: EpochTime,
  start_time: DateTime.optional(),
  start_time_in_millis: EpochTime,
  completion_time: DateTime.describe('Indicates when the async search completed. It is present only when the search has completed.').optional(),
  completion_time_in_millis: EpochTime.optional(),
  error: z.lazy(() => ErrorCause).optional()
}).meta({ id: 'AsyncSearchAsyncSearchResponseBase' })
export type AsyncSearchAsyncSearchResponseBase = z.infer<typeof AsyncSearchAsyncSearchResponseBase>

export const AsyncSearchAsyncSearchDocumentResponseBase = z.object({
  ...AsyncSearchAsyncSearchResponseBase.shape,
  response: AsyncSearchAsyncSearch
}).meta({ id: 'AsyncSearchAsyncSearchDocumentResponseBase' })
export type AsyncSearchAsyncSearchDocumentResponseBase = z.infer<typeof AsyncSearchAsyncSearchDocumentResponseBase>

export const AsyncSearchAsyncSearchResponseException = z.object({
  is_partial: z.boolean(),
  is_running: z.boolean(),
  expiration_time: DateTime.optional(),
  expiration_time_in_millis: EpochTime,
  start_time: DateTime.optional(),
  start_time_in_millis: EpochTime,
  completion_time: DateTime.optional(),
  completion_time_in_millis: EpochTime.optional(),
  error: z.lazy(() => ErrorCause).optional(),
  response: AsyncSearchAsyncSearch.optional()
}).meta({ id: 'AsyncSearchAsyncSearchResponseException' })
export type AsyncSearchAsyncSearchResponseException = z.infer<typeof AsyncSearchAsyncSearchResponseException>

/**
 * Delete an async search.
 *
 * If the asynchronous search is still running, it is cancelled.
 * Otherwise, the saved search results are deleted.
 * If the Elasticsearch security features are enabled, the deletion of a specific async search is restricted to: the authenticated user that submitted the original search request; users that have the `cancel_task` cluster privilege.
 */
export const AsyncSearchDeleteRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('A unique identifier for the async search.').meta({ found_in: 'path' })
}).meta({ id: 'AsyncSearchDeleteRequest' })
export type AsyncSearchDeleteRequest = z.infer<typeof AsyncSearchDeleteRequest>

export const AsyncSearchDeleteResponse = AcknowledgedResponseBase.meta({ id: 'AsyncSearchDeleteResponse' })
export type AsyncSearchDeleteResponse = z.infer<typeof AsyncSearchDeleteResponse>

/**
 * Get async search results.
 *
 * Retrieve the results of a previously submitted asynchronous search request.
 * If the Elasticsearch security features are enabled, access to the results of a specific async search is restricted to the user or API key that submitted it.
 */
export const AsyncSearchGetRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('A unique identifier for the async search.').meta({ found_in: 'path' }),
  keep_alive: Duration.describe('The length of time that the async search should be available in the cluster. When not specified, the `keep_alive` set with the corresponding submit async request will be used. Otherwise, it is possible to override the value and extend the validity of the request. When this period expires, the search, if still running, is cancelled. If the search is completed, its saved results are deleted.').optional().meta({ found_in: 'query' }),
  typed_keys: z.boolean().describe('Specify whether aggregation and suggester names should be prefixed by their respective types in the response').optional().meta({ found_in: 'query' }),
  wait_for_completion_timeout: Duration.describe('Specifies to wait for the search to be completed up until the provided timeout. Final results will be returned if available before the timeout expires, otherwise the currently available results will be returned once the timeout expires. By default no timeout is set meaning that the currently available results will be returned without any additional wait.').optional().meta({ found_in: 'query' }),
  return_intermediate_results: z.boolean().describe('Specifies whether the response should contain intermediate results if the query is still running when the wait_for_completion_timeout expires or if no wait_for_completion_timeout is specified. If true and the search is still running, the search response will include any hits and partial aggregations that are available. If false and the search is still running, the search response will not include any hits (but possibly include total hits) nor will include any partial aggregations. When not specified, the intermediate results are returned for running queries.').optional().meta({ found_in: 'query' })
}).meta({ id: 'AsyncSearchGetRequest' })
export type AsyncSearchGetRequest = z.infer<typeof AsyncSearchGetRequest>

export const AsyncSearchGetResponse = AsyncSearchAsyncSearchDocumentResponseBase.meta({ id: 'AsyncSearchGetResponse' })
export type AsyncSearchGetResponse = z.infer<typeof AsyncSearchGetResponse>

/**
 * Get the async search status.
 *
 * Get the status of a previously submitted async search request given its identifier, without retrieving search results.
 * If the Elasticsearch security features are enabled, the access to the status of a specific async search is restricted to:
 *
 * * The user or API key that submitted the original async search request.
 * * Users that have the `monitor` cluster privilege or greater privileges.
 */
export const AsyncSearchStatusRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('A unique identifier for the async search.').meta({ found_in: 'path' }),
  keep_alive: Duration.describe('The length of time that the async search needs to be available. Ongoing async searches and any saved search results are deleted after this period.').optional().meta({ found_in: 'query' })
}).meta({ id: 'AsyncSearchStatusRequest' })
export type AsyncSearchStatusRequest = z.infer<typeof AsyncSearchStatusRequest>

export const AsyncSearchStatusStatusResponseBase = z.object({
  ...AsyncSearchAsyncSearchResponseBase.shape,
  _shards: ShardStatistics.describe('The number of shards that have run the query so far.'),
  _clusters: ClusterStatistics.describe('Metadata about clusters involved in the cross-cluster search. It is not shown for local-only searches.').optional(),
  completion_status: integer.describe('If the async search completed, this field shows the status code of the search. For example, `200` indicates that the async search was successfully completed. `503` indicates that the async search was completed with an error.').optional()
}).meta({ id: 'AsyncSearchStatusStatusResponseBase' })
export type AsyncSearchStatusStatusResponseBase = z.infer<typeof AsyncSearchStatusStatusResponseBase>

export const AsyncSearchStatusResponse = AsyncSearchStatusStatusResponseBase.meta({ id: 'AsyncSearchStatusResponse' })
export type AsyncSearchStatusResponse = z.infer<typeof AsyncSearchStatusResponse>

/**
 * Run an async search.
 *
 * When the primary sort of the results is an indexed field, shards get sorted based on minimum and maximum value that they hold for that field. Partial results become available following the sort criteria that was requested.
 *
 * Warning: Asynchronous search does not support scroll or search requests that include only the suggest section.
 *
 * By default, Elasticsearch does not allow you to store an async search response larger than 10Mb and an attempt to do this results in an error.
 * The maximum allowed size for a stored async search response can be set by changing the `search.max_async_search_response_size` cluster level setting.
 */
export const AsyncSearchSubmitRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-separated list of index names to search; use `_all` or empty string to perform the operation on all indices').optional().meta({ found_in: 'path' }),
  wait_for_completion_timeout: Duration.describe('Blocks and waits until the search is completed up to a certain timeout. When the async search completes within the timeout, the response won’t include the ID as the results are not stored in the cluster.').optional().meta({ found_in: 'query' }),
  keep_alive: Duration.describe('Specifies how long the async search needs to be available. Ongoing async searches and any saved search results are deleted after this period.').optional().meta({ found_in: 'query' }),
  keep_on_completion: z.boolean().describe('If `true`, results are stored for later retrieval when the search completes within the `wait_for_completion_timeout`.').optional().meta({ found_in: 'query' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  allow_partial_search_results: z.boolean().describe('Indicate if an error should be returned if there is a partial search failure or timeout').optional().meta({ found_in: 'query' }),
  analyzer: z.string().describe('The analyzer to use for the query string').optional().meta({ found_in: 'query' }),
  analyze_wildcard: z.boolean().describe('Specify whether wildcard and prefix queries should be analyzed').optional().meta({ found_in: 'query' }),
  batched_reduce_size: long.describe('Affects how often partial results become available, which happens whenever shard results are reduced. A partial reduction is performed every time the coordinating node has received a certain number of new shard responses (5 by default).').optional().meta({ found_in: 'query' }),
  ccs_minimize_roundtrips: z.boolean().describe('The default value is the only supported value.').optional().meta({ found_in: 'query' }),
  default_operator: z.lazy(() => QueryDslOperator).describe('The default operator for query string query (AND or OR)').optional().meta({ found_in: 'query' }),
  df: z.string().describe('The field to use as default where no field prefix is given in the query string').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Whether to expand wildcard expression to concrete indices that are open, closed or both').optional().meta({ found_in: 'query' }),
  ignore_throttled: z.boolean().describe('Whether specified concrete, expanded or aliased indices should be ignored when throttled').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  lenient: z.boolean().describe('Specify whether format-based query failures (such as providing text to a numeric field) should be ignored').optional().meta({ found_in: 'query' }),
  max_concurrent_shard_requests: integer.describe('The number of concurrent shard requests per node this search executes concurrently. This value should be used to limit the impact of the search on the cluster in order to limit the number of concurrent shard requests').optional().meta({ found_in: 'query' }),
  preference: z.string().describe('Specify the node or shard the operation should be performed on').optional().meta({ found_in: 'query' }),
  request_cache: z.boolean().describe('Specify if request cache should be used for this request or not, defaults to true').optional().meta({ found_in: 'query' }),
  routing: Routing.describe('A comma-separated list of specific routing values').optional().meta({ found_in: 'query' }),
  search_type: SearchType.describe('Search operation type').optional().meta({ found_in: 'query' }),
  suggest_field: Field.describe('Specifies which field to use for suggestions.').optional().meta({ found_in: 'query' }),
  suggest_mode: SuggestMode.describe('Specify suggest mode').optional().meta({ found_in: 'query' }),
  suggest_size: long.describe('How many suggestions to return in response').optional().meta({ found_in: 'query' }),
  suggest_text: z.string().describe('The source text for which the suggestions should be returned.').optional().meta({ found_in: 'query' }),
  typed_keys: z.boolean().describe('Specify whether aggregation and suggester names should be prefixed by their respective types in the response').optional().meta({ found_in: 'query' }),
  rest_total_hits_as_int: z.boolean().describe('Indicates whether hits.total should be rendered as an integer or an object in the rest search response').optional().meta({ found_in: 'query' }),
  _source_excludes: Fields.describe('A list of fields to exclude from the returned _source field').optional().meta({ found_in: 'query' }),
  _source_includes: Fields.describe('A list of fields to extract and return from the _source field').optional().meta({ found_in: 'query' }),
  q: z.string().describe('Query in the Lucene query string syntax').optional().meta({ found_in: 'query' }),
  aggregations: z.record(z.string(), z.lazy(() => AggregationsAggregationContainer)).optional().meta({ found_in: 'body' }),
  aggs: z.record(z.string(), z.lazy(() => AggregationsAggregationContainer)).optional(),
  collapse: z.lazy(() => SearchFieldCollapse).optional().meta({ found_in: 'body' }),
  explain: z.boolean().describe('If true, returns detailed information about score computation as part of a hit.').optional().meta({ found_in: 'body' }),
  ext: z.record(z.string(), z.any()).describe('Configuration of search extensions defined by Elasticsearch plugins.').optional().meta({ found_in: 'body' }),
  from: integer.describe('Starting document offset. By default, you cannot page through more than 10,000 hits using the from and size parameters. To page through more hits, use the search_after parameter.').optional().meta({ found_in: 'body' }),
  highlight: z.lazy(() => SearchHighlight).optional().meta({ found_in: 'body' }),
  track_total_hits: SearchTrackHits.describe('Number of hits matching the query to count accurately. If true, the exact number of hits is returned at the cost of some performance. If false, the response does not include the total number of hits matching the query. Defaults to 10,000 hits.').optional().meta({ found_in: 'body' }),
  indices_boost: z.array(z.record(IndexName, double)).describe('Boosts the _score of documents from specified indices.').optional().meta({ found_in: 'body' }),
  docvalue_fields: z.array(z.lazy(() => QueryDslFieldAndFormat)).describe('Array of wildcard (*) patterns. The request returns doc values for field names matching these patterns in the hits.fields property of the response.').optional().meta({ found_in: 'body' }),
  knn: z.union([z.lazy(() => KnnSearch), z.array(z.lazy(() => KnnSearch))]).describe('Defines the approximate kNN search to run.').optional().meta({ found_in: 'body' }),
  min_score: double.describe('Minimum _score for matching documents. Documents with a lower _score are not included in search results and results collected by aggregations.').optional().meta({ found_in: 'body' }),
  post_filter: z.lazy(() => QueryDslQueryContainer).optional().meta({ found_in: 'body' }),
  profile: z.boolean().optional().meta({ found_in: 'body' }),
  query: z.lazy(() => QueryDslQueryContainer).describe('Defines the search definition using the Query DSL.').optional().meta({ found_in: 'body' }),
  rescore: z.union([z.lazy(() => SearchRescore), z.array(z.lazy(() => SearchRescore))]).optional().meta({ found_in: 'body' }),
  script_fields: z.record(z.string(), z.lazy(() => ScriptField)).describe('Retrieve a script evaluation (based on different fields) for each hit.').optional().meta({ found_in: 'body' }),
  search_after: SortResults.optional().meta({ found_in: 'body' }),
  size: integer.describe('The number of hits to return. By default, you cannot page through more than 10,000 hits using the from and size parameters. To page through more hits, use the search_after parameter.').optional().meta({ found_in: 'body' }),
  slice: SlicedScroll.optional().meta({ found_in: 'body' }),
  sort: z.lazy(() => Sort).optional().meta({ found_in: 'body' }),
  _source: z.lazy(() => SearchSourceConfig).describe('Indicates which source fields are returned for matching documents. These fields are returned in the hits._source property of the search response.').optional().meta({ found_in: 'body' }),
  fields: z.array(z.lazy(() => QueryDslFieldAndFormat)).describe('Array of wildcard (*) patterns. The request returns values for field names matching these patterns in the hits.fields property of the response.').optional().meta({ found_in: 'body' }),
  suggest: SearchSuggester.optional().meta({ found_in: 'body' }),
  terminate_after: long.describe('Maximum number of documents to collect for each shard. If a query reaches this limit, Elasticsearch terminates the query early. Elasticsearch collects documents before sorting. Defaults to 0, which does not terminate query execution early.').optional().meta({ found_in: 'body' }),
  timeout: z.string().describe('Specifies the period of time to wait for a response from each shard. If no response is received before the timeout expires, the request fails and returns an error. Defaults to no timeout.').optional().meta({ found_in: 'body' }),
  track_scores: z.boolean().describe('If true, calculate and return document scores, even if the scores are not used for sorting.').optional().meta({ found_in: 'body' }),
  version: z.boolean().describe('If true, returns document version as part of a hit.').optional().meta({ found_in: 'body' }),
  seq_no_primary_term: z.boolean().describe('If true, returns sequence number and primary term of the last modification of each hit. See Optimistic concurrency control.').optional().meta({ found_in: 'body' }),
  stored_fields: Fields.describe('List of stored fields to return as part of a hit. If no fields are specified, no stored fields are included in the response. If this field is specified, the _source parameter defaults to false. You can pass _source: true to return both source fields and stored fields in the search response.').optional().meta({ found_in: 'body' }),
  pit: SearchPointInTimeReference.describe('Limits the search to a point in time (PIT). If you provide a PIT, you cannot specify an <index> in the request path.').optional().meta({ found_in: 'body' }),
  runtime_mappings: z.lazy(() => MappingRuntimeFields).describe('Defines one or more runtime fields in the search request. These fields take precedence over mapped fields with the same name.').optional().meta({ found_in: 'body' }),
  stats: z.array(z.string()).describe('Stats groups to associate with the search. Each group maintains a statistics aggregation for its associated searches. You can retrieve these stats using the indices stats API.').optional().meta({ found_in: 'body' })
}).meta({ id: 'AsyncSearchSubmitRequest' })
export type AsyncSearchSubmitRequest = z.infer<typeof AsyncSearchSubmitRequest>

export const AsyncSearchSubmitResponse = AsyncSearchAsyncSearchDocumentResponseBase.meta({ id: 'AsyncSearchSubmitResponse' })
export type AsyncSearchSubmitResponse = z.infer<typeof AsyncSearchSubmitResponse>
