/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { SearchHitsMetadata, SearchSourceConfig } from './_global.search'
import { Field, Fields, Indices, QueryVector, RequestBase, Routing, ShardStatistics, double, integer, long } from './_types'
import { QueryDslFieldAndFormat, QueryDslQueryContainer } from './_types.query_dsl'

export const KnnSearchKnnSearchQuery = z.object({
  field: Field.describe('The name of the vector field to search against'),
  query_vector: QueryVector.describe('The query vector'),
  k: integer.describe('The final number of nearest neighbors to return as top hits'),
  num_candidates: integer.describe('The number of nearest neighbor candidates to consider per shard')
}).meta({ id: 'KnnSearchKnnSearchQuery' })
export type KnnSearchKnnSearchQuery = z.infer<typeof KnnSearchKnnSearchQuery>

/**
 * Run a knn search.
 *
 * NOTE: The kNN search API has been replaced by the `knn` option in the search API.
 * @deprecated The kNN search API has been replaced by the `knn` option in the search API.
 */
export const KnnSearchRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-separated list of index names to search; use `_all` or to perform the operation on all indices.').meta({ found_in: 'path' }),
  routing: Routing.describe('A comma-separated list of specific routing values.').optional().meta({ found_in: 'query' }),
  _source: z.lazy(() => SearchSourceConfig).describe('Indicates which source fields are returned for matching documents. These fields are returned in the `hits._source` property of the search response.').optional().meta({ found_in: 'body' }),
  docvalue_fields: z.array(z.lazy(() => QueryDslFieldAndFormat)).describe('The request returns doc values for field names matching these patterns in the `hits.fields` property of the response. It accepts wildcard (`*`) patterns.').optional().meta({ found_in: 'body' }),
  stored_fields: Fields.describe('A list of stored fields to return as part of a hit. If no fields are specified, no stored fields are included in the response. If this field is specified, the `_source` parameter defaults to `false`. You can pass `_source: true` to return both source fields and stored fields in the search response.').optional().meta({ found_in: 'body' }),
  fields: Fields.describe('The request returns values for field names matching these patterns in the `hits.fields` property of the response. It accepts wildcard (`*`) patterns.').optional().meta({ found_in: 'body' }),
  filter: z.union([z.lazy(() => QueryDslQueryContainer), z.array(z.lazy(() => QueryDslQueryContainer))]).describe('A query to filter the documents that can match. The kNN search will return the top `k` documents that also match this filter. The value can be a single query or a list of queries. If `filter` isn\'t provided, all documents are allowed to match.').optional().meta({ found_in: 'body' }),
  knn: KnnSearchKnnSearchQuery.describe('The kNN query to run.').meta({ found_in: 'body' })
}).meta({ id: 'KnnSearchRequest' })
export type KnnSearchRequest = z.infer<typeof KnnSearchRequest>

export const KnnSearchResponse = z.object({
  took: long.describe('The milliseconds it took Elasticsearch to run the request.'),
  timed_out: z.boolean().describe('If true, the request timed out before completion; returned results may be partial or empty.'),
  _shards: ShardStatistics.describe('A count of shards used for the request.'),
  hits: z.lazy(() => SearchHitsMetadata).describe('The returned documents and metadata.'),
  fields: z.record(z.string(), z.any()).describe('The field values for the documents. These fields must be specified in the request using the `fields` parameter.').optional(),
  max_score: double.describe('The highest returned document score. This value is null for requests that do not sort by score.').optional()
}).meta({ id: 'KnnSearchResponse' })
export type KnnSearchResponse = z.infer<typeof KnnSearchResponse>
