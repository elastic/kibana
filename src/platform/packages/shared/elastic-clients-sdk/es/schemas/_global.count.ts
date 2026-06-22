/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { ExpandWildcards, Indices, RequestBase, Routing, ShardStatistics, double, long } from './_types'
import { QueryDslOperator, QueryDslQueryContainer } from './_types.query_dsl'

/**
 * Count search results.
 *
 * Get the number of documents matching a query.
 *
 * The query can be provided either by using a simple query string as a parameter, or by defining Query DSL within the request body.
 * The query is optional. When no query is provided, the API uses `match_all` to count all the documents.
 *
 * The count API supports multi-target syntax. You can run a single count API search across multiple data streams and indices.
 *
 * The operation is broadcast across all shards.
 * For each shard ID group, a replica is chosen and the search is run against it.
 * This means that replicas increase the scalability of the count.
 */
export const CountRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-separated list of data streams, indices, and aliases to search. It supports wildcards (`*`). To search all data streams and indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  analyzer: z.string().describe('The analyzer to use for the query string. This parameter can be used only when the `q` query string parameter is specified.').optional().meta({ found_in: 'query' }),
  analyze_wildcard: z.boolean().describe('If `true`, wildcard and prefix queries are analyzed. This parameter can be used only when the `q` query string parameter is specified.').optional().meta({ found_in: 'query' }),
  default_operator: z.lazy(() => QueryDslOperator).describe('The default operator for query string query: `and` or `or`. This parameter can be used only when the `q` query string parameter is specified.').optional().meta({ found_in: 'query' }),
  df: z.string().describe('The field to use as a default when no field prefix is given in the query string. This parameter can be used only when the `q` query string parameter is specified.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('The type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. It supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  ignore_throttled: z.boolean().describe('If `true`, concrete, expanded, or aliased indices are ignored when frozen.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  lenient: z.boolean().describe('If `true`, format-based query failures (such as providing text to a numeric field) in the query string will be ignored. This parameter can be used only when the `q` query string parameter is specified.').optional().meta({ found_in: 'query' }),
  min_score: double.describe('The minimum `_score` value that documents must have to be included in the result.').optional().meta({ found_in: 'query' }),
  preference: z.string().describe('The node or shard the operation should be performed on. By default, it is random.').optional().meta({ found_in: 'query' }),
  routing: Routing.describe('A custom value used to route operations to a specific shard.').optional().meta({ found_in: 'query' }),
  terminate_after: long.describe('The maximum number of documents to collect for each shard. If a query reaches this limit, Elasticsearch terminates the query early. Elasticsearch collects documents before sorting. IMPORTANT: Use with caution. Elasticsearch applies this parameter to each shard handling the request. When possible, let Elasticsearch perform early termination automatically. Avoid specifying this parameter for requests that target data streams with backing indices across multiple data tiers.').optional().meta({ found_in: 'query' }),
  q: z.string().describe('The query in Lucene query string syntax. This parameter cannot be used with a request body.').optional().meta({ found_in: 'query' }),
  query: z.lazy(() => QueryDslQueryContainer).describe('Defines the search query using Query DSL. A request body query cannot be used with the `q` query string parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'CountRequest' })
export type CountRequest = z.infer<typeof CountRequest>

export const CountResponse = z.object({
  count: long,
  _shards: ShardStatistics
}).meta({ id: 'CountResponse' })
export type CountResponse = z.infer<typeof CountResponse>
