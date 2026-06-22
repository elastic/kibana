/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { SearchResponseBody, SearchSearchRequestBody } from './_global.search'
import { ErrorResponseBase, ExpandWildcards, Indices, ProjectRouting, RequestBase, Routing, SearchType, integer, long } from './_types'

export const MsearchMultiSearchItem = z.object({
  ...SearchResponseBody.shape,
  status: integer.optional()
}).meta({ id: 'MsearchMultiSearchItem' })
export type MsearchMultiSearchItem = z.infer<typeof MsearchMultiSearchItem>

export const MsearchResponseItem = z.union([MsearchMultiSearchItem, ErrorResponseBase]).meta({ id: 'MsearchResponseItem' })
export type MsearchResponseItem = z.infer<typeof MsearchResponseItem>

export const MsearchMultiSearchResult = z.object({
  took: long,
  responses: z.array(MsearchResponseItem)
}).meta({ id: 'MsearchMultiSearchResult' })
export type MsearchMultiSearchResult = z.infer<typeof MsearchMultiSearchResult>

/** Contains parameters used to limit or change the subsequent search body request. */
export const MsearchMultisearchHeader = z.object({
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional(),
  expand_wildcards: ExpandWildcards.optional(),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional(),
  index: Indices.optional(),
  preference: z.string().optional(),
  project_routing: ProjectRouting.optional(),
  request_cache: z.boolean().optional(),
  routing: Routing.optional(),
  search_type: SearchType.optional(),
  ccs_minimize_roundtrips: z.boolean().optional(),
  allow_partial_search_results: z.boolean().optional(),
  ignore_throttled: z.boolean().optional()
}).meta({ id: 'MsearchMultisearchHeader' })
export type MsearchMultisearchHeader = z.infer<typeof MsearchMultisearchHeader>

export const MsearchRequestItem = z.union([MsearchMultisearchHeader, z.lazy(() => SearchSearchRequestBody)]).meta({ id: 'MsearchRequestItem' })
export type MsearchRequestItem = z.infer<typeof MsearchRequestItem>

/**
 * Run multiple searches.
 *
 * The format of the request is similar to the bulk API format and makes use of the newline delimited JSON (NDJSON) format.
 * The structure is as follows:
 *
 * ```
 * header\n
 * body\n
 * header\n
 * body\n
 * ```
 *
 * This structure is specifically optimized to reduce parsing if a specific search ends up redirected to another node.
 *
 * IMPORTANT: The final line of data must end with a newline character `\n`.
 * Each newline character may be preceded by a carriage return `\r`.
 * When sending requests to this endpoint the `Content-Type` header should be set to `application/x-ndjson`.
 */
export const MsearchRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of data streams, indices, and index aliases to search.').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  ccs_minimize_roundtrips: z.boolean().describe('If true, network roundtrips between the coordinating node and remote clusters are minimized for cross-cluster search requests.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard expressions can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams.').optional().meta({ found_in: 'query' }),
  ignore_throttled: z.boolean().describe('If true, concrete, expanded or aliased indices are ignored when frozen.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  include_named_queries_score: z.boolean().describe('Indicates whether hit.matched_queries should be rendered as a map that includes the name of the matched query associated with its score (true) or as an array containing the name of the matched queries (false) This functionality reruns each named query on every hit in a search response. Typically, this adds a small overhead to a request. However, using computationally expensive named queries on a large number of hits may add significant overhead.').optional().meta({ found_in: 'query' }),
  max_concurrent_searches: integer.describe('Maximum number of concurrent searches the multi search API can execute. Defaults to `max(1, (# of data nodes * min(search thread pool size, 10)))`.').optional().meta({ found_in: 'query' }),
  max_concurrent_shard_requests: integer.describe('Maximum number of concurrent shard requests that each sub-search request executes per node.').optional().meta({ found_in: 'query' }),
  pre_filter_shard_size: long.describe('Defines a threshold that enforces a pre-filter roundtrip to prefilter search shards based on query rewriting if the number of shards the search request expands to exceeds the threshold. This filter roundtrip can limit the number of shards significantly if for instance a shard can not match any documents based on its rewrite method i.e., if date filters are mandatory to match but the shard bounds and the query are disjoint.').optional().meta({ found_in: 'query' }),
  rest_total_hits_as_int: z.boolean().describe('If true, hits.total are returned as an integer in the response. Defaults to false, which returns an object.').optional().meta({ found_in: 'query' }),
  routing: Routing.describe('Custom routing value used to route search operations to a specific shard.').optional().meta({ found_in: 'query' }),
  search_type: SearchType.describe('Indicates whether global term and document frequencies should be used when scoring returned documents.').optional().meta({ found_in: 'query' }),
  typed_keys: z.boolean().describe('Specifies whether aggregation and suggester names should be prefixed by their respective types in the response.').optional().meta({ found_in: 'query' }),
  searches: z.array(MsearchRequestItem).optional().meta({ found_in: 'body' })
}).meta({ id: 'MsearchRequest' })
export type MsearchRequest = z.infer<typeof MsearchRequest>

export const MsearchResponse = MsearchMultiSearchResult.meta({ id: 'MsearchResponse' })
export type MsearchResponse = z.infer<typeof MsearchResponse>
