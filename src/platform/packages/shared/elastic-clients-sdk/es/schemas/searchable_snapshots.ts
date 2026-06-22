/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { ByteSize, Duration, ExpandWildcards, IndexName, Indices, Name, NodeIds, RequestBase, ShardStatistics, integer, long } from './_types'

export const SearchableSnapshotsStatsLevel = z.enum(['cluster', 'indices', 'shards']).meta({ id: 'SearchableSnapshotsStatsLevel' })
export type SearchableSnapshotsStatsLevel = z.infer<typeof SearchableSnapshotsStatsLevel>

export const SearchableSnapshotsCacheStatsShared = z.object({
  reads: long,
  bytes_read_in_bytes: ByteSize,
  writes: long,
  bytes_written_in_bytes: ByteSize,
  evictions: long,
  num_regions: integer,
  size_in_bytes: ByteSize,
  region_size_in_bytes: ByteSize
}).meta({ id: 'SearchableSnapshotsCacheStatsShared' })
export type SearchableSnapshotsCacheStatsShared = z.infer<typeof SearchableSnapshotsCacheStatsShared>

export const SearchableSnapshotsCacheStatsNode = z.object({
  shared_cache: SearchableSnapshotsCacheStatsShared
}).meta({ id: 'SearchableSnapshotsCacheStatsNode' })
export type SearchableSnapshotsCacheStatsNode = z.infer<typeof SearchableSnapshotsCacheStatsNode>

/**
 * Get cache statistics.
 *
 * Get statistics about the shared cache for partially mounted indices.
 */
export const SearchableSnapshotsCacheStatsRequest = z.object({
  ...RequestBase.shape,
  node_id: NodeIds.describe('The names of the nodes in the cluster to target.').optional().meta({ found_in: 'path' })
}).meta({ id: 'SearchableSnapshotsCacheStatsRequest' })
export type SearchableSnapshotsCacheStatsRequest = z.infer<typeof SearchableSnapshotsCacheStatsRequest>

export const SearchableSnapshotsCacheStatsResponse = z.object({
  nodes: z.record(z.string(), SearchableSnapshotsCacheStatsNode)
}).meta({ id: 'SearchableSnapshotsCacheStatsResponse' })
export type SearchableSnapshotsCacheStatsResponse = z.infer<typeof SearchableSnapshotsCacheStatsResponse>

/**
 * Clear the cache.
 *
 * Clear indices and data streams from the shared cache for partially mounted indices.
 */
export const SearchableSnapshotsClearCacheRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-separated list of data streams, indices, and aliases to clear from the cache. It supports wildcards (`*`).').optional().meta({ found_in: 'path' }),
  expand_wildcards: ExpandWildcards.describe('Whether to expand wildcard expression to concrete indices that are open, closed or both').optional().meta({ found_in: 'query' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SearchableSnapshotsClearCacheRequest' })
export type SearchableSnapshotsClearCacheRequest = z.infer<typeof SearchableSnapshotsClearCacheRequest>

export const SearchableSnapshotsClearCacheResponse = z.any().meta({ id: 'SearchableSnapshotsClearCacheResponse' })
export type SearchableSnapshotsClearCacheResponse = z.infer<typeof SearchableSnapshotsClearCacheResponse>

export const SearchableSnapshotsMountMountedSnapshot = z.object({
  snapshot: Name,
  indices: Indices,
  shards: ShardStatistics
}).meta({ id: 'SearchableSnapshotsMountMountedSnapshot' })
export type SearchableSnapshotsMountMountedSnapshot = z.infer<typeof SearchableSnapshotsMountMountedSnapshot>

export const SearchableSnapshotsMountStorageOption = z.enum(['full_copy', 'shared_cache']).meta({ id: 'SearchableSnapshotsMountStorageOption' })
export type SearchableSnapshotsMountStorageOption = z.infer<typeof SearchableSnapshotsMountStorageOption>

/**
 * Mount a snapshot.
 *
 * Mount a snapshot as a searchable snapshot index.
 * Do not use this API for snapshots managed by index lifecycle management (ILM).
 * Manually mounting ILM-managed snapshots can interfere with ILM processes.
 */
export const SearchableSnapshotsMountRequest = z.object({
  ...RequestBase.shape,
  repository: Name.describe('The name of the repository containing the snapshot of the index to mount.').meta({ found_in: 'path' }),
  snapshot: Name.describe('The name of the snapshot of the index to mount.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for the master node. If the master node is not available before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' }),
  wait_for_completion: z.boolean().describe('If true, the request blocks until the operation is complete.').optional().meta({ found_in: 'query' }),
  storage: SearchableSnapshotsMountStorageOption.describe('The mount option for the searchable snapshot index. For further information on mount options, refer to: [Mount options](https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore/searchable-snapshots#searchable-snapshot-mount-storage-options)').optional().meta({ found_in: 'query' }),
  index: IndexName.describe('The name of the index contained in the snapshot whose data is to be mounted. If no `renamed_index` is specified, this name will also be used to create the new index.').meta({ found_in: 'body' }),
  renamed_index: IndexName.describe('The name of the index that will be created.').optional().meta({ found_in: 'body' }),
  index_settings: z.record(z.string(), z.any()).describe('The settings that should be added to the index when it is mounted.').optional().meta({ found_in: 'body' }),
  ignore_index_settings: z.array(z.string()).describe('The names of settings that should be removed from the index when it is mounted.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SearchableSnapshotsMountRequest' })
export type SearchableSnapshotsMountRequest = z.infer<typeof SearchableSnapshotsMountRequest>

export const SearchableSnapshotsMountResponse = z.object({
  snapshot: SearchableSnapshotsMountMountedSnapshot
}).meta({ id: 'SearchableSnapshotsMountResponse' })
export type SearchableSnapshotsMountResponse = z.infer<typeof SearchableSnapshotsMountResponse>

/** Get searchable snapshot statistics. */
export const SearchableSnapshotsStatsRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-separated list of data streams and indices to retrieve statistics for.').optional().meta({ found_in: 'path' }),
  level: SearchableSnapshotsStatsLevel.describe('Return stats aggregated at cluster, index or shard level').optional().meta({ found_in: 'query' })
}).meta({ id: 'SearchableSnapshotsStatsRequest' })
export type SearchableSnapshotsStatsRequest = z.infer<typeof SearchableSnapshotsStatsRequest>

export const SearchableSnapshotsStatsResponse = z.object({
  stats: z.any(),
  total: z.any()
}).meta({ id: 'SearchableSnapshotsStatsResponse' })
export type SearchableSnapshotsStatsResponse = z.infer<typeof SearchableSnapshotsStatsResponse>
