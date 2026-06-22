/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { MsearchRequestItem, MsearchResponseItem } from './_global.msearch'
import { ScriptField, SearchFieldCollapse, SearchHighlight, SearchHitsMetadata, SearchPointInTimeReference, SearchProfile, SearchRescore, SearchSourceConfig, SearchSuggest, SearchSuggester, SearchTrackHits } from './_global.search'
import { AggregateName, ClusterStatistics, Duration, ExpandWildcards, Field, Fields, Id, IndexAlias, IndexName, RequestBase, Routing, ScrollId, SearchType, ShardStatistics, SlicedScroll, SortResults, SuggestMode, SuggestionName, double, integer, long } from './_types'
import { AggregationsAggregate, AggregationsAggregationContainer } from './_types.aggregations'
import { MappingRuntimeFields } from './_types.mapping'
import { QueryDslFieldAndFormat, QueryDslOperator, QueryDslQueryContainer, Sort } from './_types.query_dsl'

export const FleetCheckpoint = long.meta({ id: 'FleetCheckpoint' })
export type FleetCheckpoint = z.infer<typeof FleetCheckpoint>

/** Deletes a secret stored by Fleet. */
export const FleetDeleteSecretRequest = z.object({
  ...RequestBase.shape,
  id: z.string().describe('The ID of the secret').meta({ found_in: 'path' })
}).meta({ id: 'FleetDeleteSecretRequest' })
export type FleetDeleteSecretRequest = z.infer<typeof FleetDeleteSecretRequest>

export const FleetDeleteSecretResponse = z.object({
  deleted: z.boolean()
}).meta({ id: 'FleetDeleteSecretResponse' })
export type FleetDeleteSecretResponse = z.infer<typeof FleetDeleteSecretResponse>

/** Retrieves a secret stored by Fleet. */
export const FleetGetSecretRequest = z.object({
  ...RequestBase.shape,
  id: z.string().describe('The ID of the secret').meta({ found_in: 'path' })
}).meta({ id: 'FleetGetSecretRequest' })
export type FleetGetSecretRequest = z.infer<typeof FleetGetSecretRequest>

export const FleetGetSecretResponse = z.object({
  id: z.string(),
  value: z.string()
}).meta({ id: 'FleetGetSecretResponse' })
export type FleetGetSecretResponse = z.infer<typeof FleetGetSecretResponse>

/**
 * Get global checkpoints.
 *
 * Get the current global checkpoints for an index.
 * This API is designed for internal use by the Fleet server project.
 */
export const FleetGlobalCheckpointsRequest = z.object({
  ...RequestBase.shape,
  index: z.union([IndexName, IndexAlias]).describe('A single index or index alias that resolves to a single index.').meta({ found_in: 'path' }),
  wait_for_advance: z.boolean().describe('A boolean value which controls whether to wait (until the timeout) for the global checkpoints to advance past the provided `checkpoints`.').optional().meta({ found_in: 'query' }),
  wait_for_index: z.boolean().describe('A boolean value which controls whether to wait (until the timeout) for the target index to exist and all primary shards be active. Can only be true when `wait_for_advance` is true.').optional().meta({ found_in: 'query' }),
  checkpoints: z.array(FleetCheckpoint).describe('A comma separated list of previous global checkpoints. When used in combination with `wait_for_advance`, the API will only return once the global checkpoints advances past the checkpoints. Providing an empty list will cause Elasticsearch to immediately return the current global checkpoints.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a global checkpoints to advance past `checkpoints`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'FleetGlobalCheckpointsRequest' })
export type FleetGlobalCheckpointsRequest = z.infer<typeof FleetGlobalCheckpointsRequest>

export const FleetGlobalCheckpointsResponse = z.object({
  global_checkpoints: z.array(FleetCheckpoint),
  timed_out: z.boolean()
}).meta({ id: 'FleetGlobalCheckpointsResponse' })
export type FleetGlobalCheckpointsResponse = z.infer<typeof FleetGlobalCheckpointsResponse>

/**
 * Run multiple Fleet searches.
 *
 * Run several Fleet searches with a single API request.
 * The API follows the same structure as the multi search API.
 * However, similar to the Fleet search API, it supports the `wait_for_checkpoints` parameter.
 */
export const FleetMsearchRequest = z.object({
  ...RequestBase.shape,
  index: z.union([IndexName, IndexAlias]).describe('A single target to search. If the target is an index alias, it must resolve to a single index.').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  ccs_minimize_roundtrips: z.boolean().describe('If true, network roundtrips between the coordinating node and remote clusters are minimized for cross-cluster search requests.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard expressions can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams.').optional().meta({ found_in: 'query' }),
  ignore_throttled: z.boolean().describe('If true, concrete, expanded or aliased indices are ignored when frozen.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  max_concurrent_searches: integer.describe('Maximum number of concurrent searches the multi search API can execute.').optional().meta({ found_in: 'query' }),
  max_concurrent_shard_requests: integer.describe('Maximum number of concurrent shard requests that each sub-search request executes per node.').optional().meta({ found_in: 'query' }),
  pre_filter_shard_size: long.describe('Defines a threshold that enforces a pre-filter roundtrip to prefilter search shards based on query rewriting if the number of shards the search request expands to exceeds the threshold. This filter roundtrip can limit the number of shards significantly if for instance a shard can not match any documents based on its rewrite method i.e., if date filters are mandatory to match but the shard bounds and the query are disjoint.').optional().meta({ found_in: 'query' }),
  search_type: SearchType.describe('Indicates whether global term and document frequencies should be used when scoring returned documents.').optional().meta({ found_in: 'query' }),
  rest_total_hits_as_int: z.boolean().describe('If true, hits.total are returned as an integer in the response. Defaults to false, which returns an object.').optional().meta({ found_in: 'query' }),
  typed_keys: z.boolean().describe('Specifies whether aggregation and suggester names should be prefixed by their respective types in the response.').optional().meta({ found_in: 'query' }),
  wait_for_checkpoints: z.array(FleetCheckpoint).describe('A comma separated list of checkpoints. When configured, the search API will only be executed on a shard after the relevant checkpoint has become visible for search. Defaults to an empty list which will cause Elasticsearch to immediately execute the search.').optional().meta({ found_in: 'query' }),
  allow_partial_search_results: z.boolean().describe('If true, returns partial results if there are shard request timeouts or shard failures. If false, returns an error with no partial results. Defaults to the configured cluster setting `search.default_allow_partial_results`, which is true by default.').optional().meta({ found_in: 'query' }),
  searches: z.array(MsearchRequestItem).optional().meta({ found_in: 'body' })
}).meta({ id: 'FleetMsearchRequest' })
export type FleetMsearchRequest = z.infer<typeof FleetMsearchRequest>

export const FleetMsearchResponse = z.object({
  docs: z.array(MsearchResponseItem)
}).meta({ id: 'FleetMsearchResponse' })
export type FleetMsearchResponse = z.infer<typeof FleetMsearchResponse>

/** Creates a secret stored by Fleet. */
export const FleetPostSecretRequest = z.object({
  ...RequestBase.shape,
  value: z.string().meta({ found_in: 'body' })
}).meta({ id: 'FleetPostSecretRequest' })
export type FleetPostSecretRequest = z.infer<typeof FleetPostSecretRequest>

export const FleetPostSecretResponse = z.object({
  id: z.string()
}).meta({ id: 'FleetPostSecretResponse' })
export type FleetPostSecretResponse = z.infer<typeof FleetPostSecretResponse>

/**
 * Run a Fleet search.
 *
 * The purpose of the Fleet search API is to provide an API where the search will be run only
 * after the provided checkpoint has been processed and is visible for searches inside of Elasticsearch.
 */
export const FleetSearchRequest = z.object({
  ...RequestBase.shape,
  index: z.union([IndexName, IndexAlias]).describe('A single target to search. If the target is an index alias, it must resolve to a single index.').meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  analyzer: z.string().optional().meta({ found_in: 'query' }),
  analyze_wildcard: z.boolean().optional().meta({ found_in: 'query' }),
  batched_reduce_size: long.optional().meta({ found_in: 'query' }),
  ccs_minimize_roundtrips: z.boolean().optional().meta({ found_in: 'query' }),
  default_operator: z.lazy(() => QueryDslOperator).optional().meta({ found_in: 'query' }),
  df: z.string().optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.optional().meta({ found_in: 'query' }),
  ignore_throttled: z.boolean().optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  lenient: z.boolean().optional().meta({ found_in: 'query' }),
  max_concurrent_shard_requests: integer.optional().meta({ found_in: 'query' }),
  preference: z.string().optional().meta({ found_in: 'query' }),
  pre_filter_shard_size: long.optional().meta({ found_in: 'query' }),
  request_cache: z.boolean().optional().meta({ found_in: 'query' }),
  routing: Routing.optional().meta({ found_in: 'query' }),
  scroll: Duration.optional().meta({ found_in: 'query' }),
  search_type: SearchType.optional().meta({ found_in: 'query' }),
  suggest_field: Field.describe('Specifies which field to use for suggestions.').optional().meta({ found_in: 'query' }),
  suggest_mode: SuggestMode.optional().meta({ found_in: 'query' }),
  suggest_size: long.optional().meta({ found_in: 'query' }),
  suggest_text: z.string().describe('The source text for which the suggestions should be returned.').optional().meta({ found_in: 'query' }),
  typed_keys: z.boolean().optional().meta({ found_in: 'query' }),
  rest_total_hits_as_int: z.boolean().optional().meta({ found_in: 'query' }),
  _source_excludes: Fields.optional().meta({ found_in: 'query' }),
  _source_includes: Fields.optional().meta({ found_in: 'query' }),
  q: z.string().optional().meta({ found_in: 'query' }),
  wait_for_checkpoints: z.array(FleetCheckpoint).describe('A comma separated list of checkpoints. When configured, the search API will only be executed on a shard after the relevant checkpoint has become visible for search. Defaults to an empty list which will cause Elasticsearch to immediately execute the search.').optional().meta({ found_in: 'query' }),
  allow_partial_search_results: z.boolean().describe('If true, returns partial results if there are shard request timeouts or shard failures. If false, returns an error with no partial results. Defaults to the configured cluster setting `search.default_allow_partial_results`, which is true by default.').optional().meta({ found_in: 'query' }),
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
}).meta({ id: 'FleetSearchRequest' })
export type FleetSearchRequest = z.infer<typeof FleetSearchRequest>

export const FleetSearchResponse = z.object({
  took: long,
  timed_out: z.boolean(),
  _shards: ShardStatistics,
  hits: z.lazy(() => SearchHitsMetadata),
  aggregations: z.record(AggregateName, AggregationsAggregate).optional(),
  _clusters: ClusterStatistics.optional(),
  fields: z.record(z.string(), z.any()).optional(),
  max_score: double.optional(),
  num_reduce_phases: long.optional(),
  profile: SearchProfile.optional(),
  pit_id: Id.optional(),
  _scroll_id: ScrollId.optional(),
  suggest: z.record(SuggestionName, z.array(SearchSuggest)).optional(),
  terminated_early: z.boolean().optional()
}).meta({ id: 'FleetSearchResponse' })
export type FleetSearchResponse = z.infer<typeof FleetSearchResponse>
