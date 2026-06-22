/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { ScriptSource, SearchHitsMetadata, SearchProfile, SearchSuggest } from './_global.search'
import { AggregateName, ClusterStatistics, Duration, ExpandWildcards, Id, Indices, RequestBase, Routing, ScrollId, SearchType, ShardStatistics, SuggestionName, double, long } from './_types'
import { AggregationsAggregate } from './_types.aggregations'

/** Run a search with a search template. */
export const SearchTemplateRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-separated list of data streams, indices, and aliases to search. It supports wildcards (`*`).').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  ccs_minimize_roundtrips: z.boolean().describe('Indicates whether network round-trips should be minimized as part of cross-cluster search requests execution.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('The type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  ignore_throttled: z.boolean().describe('If `true`, specified concrete, expanded, or aliased indices are not included in the response when throttled.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  preference: z.string().describe('The node or shard the operation should be performed on. It is random by default.').optional().meta({ found_in: 'query' }),
  routing: Routing.describe('A custom value used to route operations to a specific shard.').optional().meta({ found_in: 'query' }),
  scroll: Duration.describe('Specifies how long a consistent view of the index should be maintained for scrolled search.').optional().meta({ found_in: 'query' }),
  search_type: SearchType.describe('The type of the search operation.').optional().meta({ found_in: 'query' }),
  rest_total_hits_as_int: z.boolean().describe('If `true`, `hits.total` is rendered as an integer in the response. If `false`, it is rendered as an object.').optional().meta({ found_in: 'query' }),
  typed_keys: z.boolean().describe('If `true`, the response prefixes aggregation and suggester names with their respective types.').optional().meta({ found_in: 'query' }),
  explain: z.boolean().describe('If `true`, returns detailed information about score calculation as part of each hit. If you specify both this and the `explain` query parameter, the API uses only the query parameter.').optional().meta({ found_in: 'body' }),
  id: Id.describe('The ID of the search template to use. If no `source` is specified, this parameter is required.').optional().meta({ found_in: 'body' }),
  params: z.record(z.string(), z.any()).describe('Key-value pairs used to replace Mustache variables in the template. The key is the variable name. The value is the variable value.').optional().meta({ found_in: 'body' }),
  profile: z.boolean().describe('If `true`, the query execution is profiled.').optional().meta({ found_in: 'body' }),
  source: z.lazy(() => ScriptSource).describe('An inline search template. Supports the same parameters as the search API\'s request body. It also supports Mustache variables. If no `id` is specified, this parameter is required.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SearchTemplateRequest' })
export type SearchTemplateRequest = z.infer<typeof SearchTemplateRequest>

export const SearchTemplateResponse = z.object({
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
}).meta({ id: 'SearchTemplateResponse' })
export type SearchTemplateResponse = z.infer<typeof SearchTemplateResponse>
