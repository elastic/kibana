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

export const IndicesReloadSearchAnalyzersReloadDetails = z.object({
  index: z.string(),
  reloaded_analyzers: z.array(z.string()),
  reloaded_node_ids: z.array(z.string())
}).meta({ id: 'IndicesReloadSearchAnalyzersReloadDetails' })
export type IndicesReloadSearchAnalyzersReloadDetails = z.infer<typeof IndicesReloadSearchAnalyzersReloadDetails>

export const IndicesReloadSearchAnalyzersReloadResult = z.object({
  reload_details: z.array(IndicesReloadSearchAnalyzersReloadDetails),
  _shards: ShardStatistics
}).meta({ id: 'IndicesReloadSearchAnalyzersReloadResult' })
export type IndicesReloadSearchAnalyzersReloadResult = z.infer<typeof IndicesReloadSearchAnalyzersReloadResult>

/**
 * Reload search analyzers.
 *
 * Reload an index's search analyzers and their resources.
 * For data streams, the API reloads search analyzers and resources for the stream's backing indices.
 *
 * IMPORTANT: After reloading the search analyzers you should clear the request cache to make sure it doesn't contain responses derived from the previous versions of the analyzer.
 *
 * You can use the reload search analyzers API to pick up changes to synonym files used in the `synonym_graph` or `synonym` token filter of a search analyzer.
 * To be eligible, the token filter must have an `updateable` flag of `true` and only be used in search analyzers.
 *
 * NOTE: This API does not perform a reload for each shard of an index.
 * Instead, it performs a reload for each node containing index shards.
 * As a result, the total shard count returned by the API can differ from the number of index shards.
 * Because reloading affects every node with an index shard, it is important to update the synonym file on every data node in the cluster--including nodes that don't contain a shard replica--before using this API.
 * This ensures the synonym file is updated everywhere in the cluster in case shards are relocated in the future.
 */
export const IndicesReloadSearchAnalyzersRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-separated list of index names to reload analyzers for').meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Whether to expand wildcard expression to concrete indices that are open, closed or both.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  resource: z.string().describe('Changed resource to reload analyzers from if applicable').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesReloadSearchAnalyzersRequest' })
export type IndicesReloadSearchAnalyzersRequest = z.infer<typeof IndicesReloadSearchAnalyzersRequest>

export const IndicesReloadSearchAnalyzersResponse = IndicesReloadSearchAnalyzersReloadResult.meta({ id: 'IndicesReloadSearchAnalyzersResponse' })
export type IndicesReloadSearchAnalyzersResponse = z.infer<typeof IndicesReloadSearchAnalyzersResponse>
