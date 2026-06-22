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

export const ExpandWildcard = z.enum(['all', 'open', 'closed', 'hidden', 'none']).meta({ id: 'ExpandWildcard' })
export type ExpandWildcard = z.infer<typeof ExpandWildcard>

export const ExpandWildcards = z.union([ExpandWildcard, z.array(ExpandWildcard)]).meta({ id: 'ExpandWildcards' })
export type ExpandWildcards = z.infer<typeof ExpandWildcards>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const IndicesShardStoresShardStoreAllocation = z.enum(['primary', 'replica', 'unused']).meta({ id: 'IndicesShardStoresShardStoreAllocation' })
export type IndicesShardStoresShardStoreAllocation = z.infer<typeof IndicesShardStoresShardStoreAllocation>

export const IndicesShardStoresShardStoreException = z.object({
  reason: z.string(),
  type: z.string()
}).meta({ id: 'IndicesShardStoresShardStoreException' })
export type IndicesShardStoresShardStoreException = z.infer<typeof IndicesShardStoresShardStoreException>

export const IndicesShardStoresShardStore = z.object({
  allocation: IndicesShardStoresShardStoreAllocation.describe('The status of the store copy, whether it is used as a primary, replica, or not used at all.'),
  allocation_id: Id.describe('The allocation ID of the store copy.').optional(),
  store_exception: IndicesShardStoresShardStoreException.describe('Any exception encountered while opening the shard index or from an earlier engine failure.').optional()
}).catchall(z.any()).meta({ id: 'IndicesShardStoresShardStore' })
export type IndicesShardStoresShardStore = z.infer<typeof IndicesShardStoresShardStore>

export const IndicesShardStoresShardStoreWrapper = z.object({
  stores: z.array(IndicesShardStoresShardStore)
}).meta({ id: 'IndicesShardStoresShardStoreWrapper' })
export type IndicesShardStoresShardStoreWrapper = z.infer<typeof IndicesShardStoresShardStoreWrapper>

export const IndicesShardStoresIndicesShardStores = z.object({
  shards: z.record(z.string(), IndicesShardStoresShardStoreWrapper)
}).meta({ id: 'IndicesShardStoresIndicesShardStores' })
export type IndicesShardStoresIndicesShardStores = z.infer<typeof IndicesShardStoresIndicesShardStores>

export const IndicesShardStoresShardStoreStatus = z.enum(['green', 'yellow', 'red', 'all']).meta({ id: 'IndicesShardStoresShardStoreStatus' })
export type IndicesShardStoresShardStoreStatus = z.infer<typeof IndicesShardStoresShardStoreStatus>

/**
 * Get index shard stores.
 *
 * Get store information about replica shards in one or more indices.
 * For data streams, the API retrieves store information for the stream's backing indices.
 *
 * The index shard stores API returns the following information:
 *
 * * The node on which each replica shard exists.
 * * The allocation ID for each replica shard.
 * * A unique ID for each replica shard.
 * * Any errors encountered while opening the shard index or from an earlier failure.
 *
 * By default, the API returns store information only for primary shards that are unassigned or have one or more unassigned replica shards.
 */
export const IndicesShardStoresRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('List of data streams, indices, and aliases used to limit the request.').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  status: z.union([IndicesShardStoresShardStoreStatus, z.array(IndicesShardStoresShardStoreStatus)]).describe('List of shard health statuses used to limit the request.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesShardStoresRequest' })
export type IndicesShardStoresRequest = z.infer<typeof IndicesShardStoresRequest>

export const IndicesShardStoresResponse = z.object({
  indices: z.record(IndexName, IndicesShardStoresIndicesShardStores)
}).meta({ id: 'IndicesShardStoresResponse' })
export type IndicesShardStoresResponse = z.infer<typeof IndicesShardStoresResponse>
