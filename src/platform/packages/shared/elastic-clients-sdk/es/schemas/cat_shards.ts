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

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const CatCatShardColumn = z.union([z.enum(['completion.size', 'cs', 'completionSize', 'dataset.size', 'dense_vector.value_count', 'dvc', 'denseVectorCount', 'docs', 'd', 'dc', 'fielddata.evictions', 'fe', 'fielddataEvictions', 'fielddata.memory_size', 'fm', 'fielddataMemory', 'flush.total', 'ft', 'flushTotal', 'flush.total_time', 'ftt', 'flushTotalTime', 'get.current', 'gc', 'getCurrent', 'get.exists_time', 'geti', 'getExistsTime', 'get.exists_total', 'geto', 'getExistsTotal', 'get.missing_time', 'gmti', 'getMissingTime', 'get.missing_total', 'gmto', 'getMissingTotal', 'get.time', 'gti', 'getTime', 'get.total', 'gto', 'getTotal', 'id', 'index', 'i', 'idx', 'indexing.delete_current', 'idc', 'indexingDeleteCurrent', 'indexing.delete_time', 'idti', 'indexingDeleteTime', 'indexing.delete_total', 'idto', 'indexingDeleteTotal', 'indexing.index_current', 'iic', 'indexingIndexCurrent', 'indexing.index_failed_due_to_version_conflict', 'iifvc', 'indexingIndexFailedDueToVersionConflict', 'indexing.index_failed', 'iif', 'indexingIndexFailed', 'indexing.index_time', 'iiti', 'indexingIndexTime', 'indexing.index_total', 'iito', 'indexingIndexTotal', 'ip', 'merges.current', 'mc', 'mergesCurrent', 'merges.current_docs', 'mcd', 'mergesCurrentDocs', 'merges.current_size', 'mcs', 'mergesCurrentSize', 'merges.total', 'mt', 'mergesTotal', 'merges.total_docs', 'mtd', 'mergesTotalDocs', 'merges.total_size', 'mts', 'mergesTotalSize', 'merges.total_time', 'mtt', 'mergesTotalTime', 'node', 'n', 'prirep', 'p', 'pr', 'primaryOrReplica', 'query_cache.evictions', 'qce', 'queryCacheEvictions', 'query_cache.memory_size', 'qcm', 'queryCacheMemory', 'recoverysource.type', 'rs', 'refresh.time', 'rti', 'refreshTime', 'refresh.total', 'rto', 'refreshTotal', 'search.fetch_current', 'sfc', 'searchFetchCurrent', 'search.fetch_time', 'sfti', 'searchFetchTime', 'search.fetch_total', 'sfto', 'searchFetchTotal', 'search.open_contexts', 'so', 'searchOpenContexts', 'search.query_current', 'sqc', 'searchQueryCurrent', 'search.query_time', 'sqti', 'searchQueryTime', 'search.query_total', 'sqto', 'searchQueryTotal', 'search.scroll_current', 'scc', 'searchScrollCurrent', 'search.scroll_time', 'scti', 'searchScrollTime', 'search.scroll_total', 'scto', 'searchScrollTotal', 'segments.count', 'sc', 'segmentsCount', 'segments.fixed_bitset_memory', 'sfbm', 'fixedBitsetMemory', 'segments.index_writer_memory', 'siwm', 'segmentsIndexWriterMemory', 'segments.memory', 'sm', 'segmentsMemory', 'segments.version_map_memory', 'svmm', 'segmentsVersionMapMemory', 'seq_no.global_checkpoint', 'sqg', 'globalCheckpoint', 'seq_no.local_checkpoint', 'sql', 'localCheckpoint', 'seq_no.max', 'sqm', 'maxSeqNo', 'shard', 's', 'sh', 'dsparse_vector.value_count', 'svc', 'sparseVectorCount', 'state', 'st', 'store', 'sto', 'suggest.current', 'suc', 'suggestCurrent', 'suggest.time', 'suti', 'suggestTime', 'suggest.total', 'suto', 'suggestTotal', 'sync_id', 'unassigned.at', 'ua', 'unassigned.details', 'ud', 'unassigned.for', 'uf', 'unassigned.reason', 'ur']), z.string()]).meta({ id: 'CatCatShardColumn' })
export type CatCatShardColumn = z.infer<typeof CatCatShardColumn>

export const CatCatShardColumns = z.union([CatCatShardColumn, z.array(CatCatShardColumn)]).meta({ id: 'CatCatShardColumns' })
export type CatCatShardColumns = z.infer<typeof CatCatShardColumns>

/**
 * Get shard information.
 *
 * Get information about the shards in a cluster.
 * For data streams, the API returns information about the backing indices.
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications.
 */
export const CatShardsRequest = z.object({
  ...CatCatRequestBase.shape,
  index: Indices.describe('A comma-separated list of data streams, indices, and aliases used to limit the request. Supports wildcards (`*`). To target all data streams and indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  h: CatCatShardColumns.describe('List of columns to appear in the response. Supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('A comma-separated list of column names or aliases that determines the sort order. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatShardsRequest' })
export type CatShardsRequest = z.infer<typeof CatShardsRequest>

export const CatShardsShardsRecord = z.object({
  index: z.string().describe('The index name.').optional(),
  i: z.string().describe('The index name.').optional(),
  idx: z.string().describe('The index name.').optional(),
  shard: z.string().describe('The shard name.').optional(),
  s: z.string().describe('The shard name.').optional(),
  sh: z.string().describe('The shard name.').optional(),
  prirep: z.string().describe('The shard type: `primary` or `replica`.').optional(),
  p: z.string().describe('The shard type: `primary` or `replica`.').optional(),
  pr: z.string().describe('The shard type: `primary` or `replica`.').optional(),
  primaryOrReplica: z.string().describe('The shard type: `primary` or `replica`.').optional(),
  state: z.string().describe('The shard state. Returned values include: `INITIALIZING`: The shard is recovering from a peer shard or gateway. `RELOCATING`: The shard is relocating. `STARTED`: The shard has started. `UNASSIGNED`: The shard is not assigned to any node.').optional(),
  st: z.string().describe('The shard state. Returned values include: `INITIALIZING`: The shard is recovering from a peer shard or gateway. `RELOCATING`: The shard is relocating. `STARTED`: The shard has started. `UNASSIGNED`: The shard is not assigned to any node.').optional(),
  docs: z.union([z.string(), z.null()]).describe('The number of documents in the shard.').optional(),
  d: z.union([z.string(), z.null()]).describe('The number of documents in the shard.').optional(),
  dc: z.union([z.string(), z.null()]).describe('The number of documents in the shard.').optional(),
  store: z.union([z.string(), z.null()]).describe('The disk space used by the shard.').optional(),
  sto: z.union([z.string(), z.null()]).describe('The disk space used by the shard.').optional(),
  dataset: z.union([z.string(), z.null()]).describe('total size of dataset (including the cache for partially mounted indices)').optional(),
  ip: z.union([z.string(), z.null()]).describe('The IP address of the node.').optional(),
  id: z.string().describe('The unique identifier for the node.').optional(),
  node: z.union([z.string(), z.null()]).describe('The name of node.').optional(),
  n: z.union([z.string(), z.null()]).describe('The name of node.').optional(),
  sync_id: z.string().describe('The sync identifier.').optional(),
  'unassigned.reason': z.string().describe('The reason for the last change to the state of an unassigned shard. It does not explain why the shard is currently unassigned; use the cluster allocation explain API for that information. Returned values include: `ALLOCATION_FAILED`: Unassigned as a result of a failed allocation of the shard. `CLUSTER_RECOVERED`: Unassigned as a result of a full cluster recovery. `DANGLING_INDEX_IMPORTED`: Unassigned as a result of importing a dangling index. `EXISTING_INDEX_RESTORED`: Unassigned as a result of restoring into a closed index. `FORCED_EMPTY_PRIMARY`: The shard’s allocation was last modified by forcing an empty primary using the cluster reroute API. `INDEX_CLOSED`: Unassigned because the index was closed. `INDEX_CREATED`: Unassigned as a result of an API creation of an index. `INDEX_REOPENED`: Unassigned as a result of opening a closed index. `MANUAL_ALLOCATION`: The shard’s allocation was last modified by the cluster reroute API. `NEW_INDEX_RESTORED`: Unassigned as a result of restoring into a new index. `NODE_LEFT`: Unassigned as a result of the node hosting it leaving the cluster. `NODE_RESTARTING`: Similar to `NODE_LEFT`, except that the node was registered as restarting using the node shutdown API. `PRIMARY_FAILED`: The shard was initializing as a replica, but the primary shard failed before the initialization completed. `REALLOCATED_REPLICA`: A better replica location is identified and causes the existing replica allocation to be cancelled. `REINITIALIZED`: When a shard moves from started back to initializing. `REPLICA_ADDED`: Unassigned as a result of explicit addition of a replica. `REROUTE_CANCELLED`: Unassigned as a result of explicit cancel reroute command.').optional(),
  ur: z.string().describe('The reason for the last change to the state of an unassigned shard. It does not explain why the shard is currently unassigned; use the cluster allocation explain API for that information. Returned values include: `ALLOCATION_FAILED`: Unassigned as a result of a failed allocation of the shard. `CLUSTER_RECOVERED`: Unassigned as a result of a full cluster recovery. `DANGLING_INDEX_IMPORTED`: Unassigned as a result of importing a dangling index. `EXISTING_INDEX_RESTORED`: Unassigned as a result of restoring into a closed index. `FORCED_EMPTY_PRIMARY`: The shard’s allocation was last modified by forcing an empty primary using the cluster reroute API. `INDEX_CLOSED`: Unassigned because the index was closed. `INDEX_CREATED`: Unassigned as a result of an API creation of an index. `INDEX_REOPENED`: Unassigned as a result of opening a closed index. `MANUAL_ALLOCATION`: The shard’s allocation was last modified by the cluster reroute API. `NEW_INDEX_RESTORED`: Unassigned as a result of restoring into a new index. `NODE_LEFT`: Unassigned as a result of the node hosting it leaving the cluster. `NODE_RESTARTING`: Similar to `NODE_LEFT`, except that the node was registered as restarting using the node shutdown API. `PRIMARY_FAILED`: The shard was initializing as a replica, but the primary shard failed before the initialization completed. `REALLOCATED_REPLICA`: A better replica location is identified and causes the existing replica allocation to be cancelled. `REINITIALIZED`: When a shard moves from started back to initializing. `REPLICA_ADDED`: Unassigned as a result of explicit addition of a replica. `REROUTE_CANCELLED`: Unassigned as a result of explicit cancel reroute command.').optional(),
  'unassigned.at': z.string().describe('The time at which the shard became unassigned in Coordinated Universal Time (UTC).').optional(),
  ua: z.string().describe('The time at which the shard became unassigned in Coordinated Universal Time (UTC).').optional(),
  'unassigned.for': z.string().describe('The time at which the shard was requested to be unassigned in Coordinated Universal Time (UTC).').optional(),
  uf: z.string().describe('The time at which the shard was requested to be unassigned in Coordinated Universal Time (UTC).').optional(),
  'unassigned.details': z.string().describe('Additional details as to why the shard became unassigned. It does not explain why the shard is not assigned; use the cluster allocation explain API for that information.').optional(),
  ud: z.string().describe('Additional details as to why the shard became unassigned. It does not explain why the shard is not assigned; use the cluster allocation explain API for that information.').optional(),
  'recoverysource.type': z.string().describe('The type of recovery source.').optional(),
  rs: z.string().describe('The type of recovery source.').optional(),
  'completion.size': z.string().describe('The size of completion.').optional(),
  cs: z.string().describe('The size of completion.').optional(),
  completionSize: z.string().describe('The size of completion.').optional(),
  'fielddata.memory_size': z.string().describe('The used fielddata cache memory.').optional(),
  fm: z.string().describe('The used fielddata cache memory.').optional(),
  fielddataMemory: z.string().describe('The used fielddata cache memory.').optional(),
  'fielddata.evictions': z.string().describe('The fielddata cache evictions.').optional(),
  fe: z.string().describe('The fielddata cache evictions.').optional(),
  fielddataEvictions: z.string().describe('The fielddata cache evictions.').optional(),
  'query_cache.memory_size': z.string().describe('The used query cache memory.').optional(),
  qcm: z.string().describe('The used query cache memory.').optional(),
  queryCacheMemory: z.string().describe('The used query cache memory.').optional(),
  'query_cache.evictions': z.string().describe('The query cache evictions.').optional(),
  qce: z.string().describe('The query cache evictions.').optional(),
  queryCacheEvictions: z.string().describe('The query cache evictions.').optional(),
  'flush.total': z.string().describe('The number of flushes.').optional(),
  ft: z.string().describe('The number of flushes.').optional(),
  flushTotal: z.string().describe('The number of flushes.').optional(),
  'flush.total_time': z.string().describe('The time spent in flush.').optional(),
  ftt: z.string().describe('The time spent in flush.').optional(),
  flushTotalTime: z.string().describe('The time spent in flush.').optional(),
  'get.current': z.string().describe('The number of current get operations.').optional(),
  gc: z.string().describe('The number of current get operations.').optional(),
  getCurrent: z.string().describe('The number of current get operations.').optional(),
  'get.time': z.string().describe('The time spent in get operations.').optional(),
  gti: z.string().describe('The time spent in get operations.').optional(),
  getTime: z.string().describe('The time spent in get operations.').optional(),
  'get.total': z.string().describe('The number of get operations.').optional(),
  gto: z.string().describe('The number of get operations.').optional(),
  getTotal: z.string().describe('The number of get operations.').optional(),
  'get.exists_time': z.string().describe('The time spent in successful get operations.').optional(),
  geti: z.string().describe('The time spent in successful get operations.').optional(),
  getExistsTime: z.string().describe('The time spent in successful get operations.').optional(),
  'get.exists_total': z.string().describe('The number of successful get operations.').optional(),
  geto: z.string().describe('The number of successful get operations.').optional(),
  getExistsTotal: z.string().describe('The number of successful get operations.').optional(),
  'get.missing_time': z.string().describe('The time spent in failed get operations.').optional(),
  gmti: z.string().describe('The time spent in failed get operations.').optional(),
  getMissingTime: z.string().describe('The time spent in failed get operations.').optional(),
  'get.missing_total': z.string().describe('The number of failed get operations.').optional(),
  gmto: z.string().describe('The number of failed get operations.').optional(),
  getMissingTotal: z.string().describe('The number of failed get operations.').optional(),
  'indexing.delete_current': z.string().describe('The number of current deletion operations.').optional(),
  idc: z.string().describe('The number of current deletion operations.').optional(),
  indexingDeleteCurrent: z.string().describe('The number of current deletion operations.').optional(),
  'indexing.delete_time': z.string().describe('The time spent in deletion operations.').optional(),
  idti: z.string().describe('The time spent in deletion operations.').optional(),
  indexingDeleteTime: z.string().describe('The time spent in deletion operations.').optional(),
  'indexing.delete_total': z.string().describe('The number of delete operations.').optional(),
  idto: z.string().describe('The number of delete operations.').optional(),
  indexingDeleteTotal: z.string().describe('The number of delete operations.').optional(),
  'indexing.index_current': z.string().describe('The number of current indexing operations.').optional(),
  iic: z.string().describe('The number of current indexing operations.').optional(),
  indexingIndexCurrent: z.string().describe('The number of current indexing operations.').optional(),
  'indexing.index_time': z.string().describe('The time spent in indexing operations.').optional(),
  iiti: z.string().describe('The time spent in indexing operations.').optional(),
  indexingIndexTime: z.string().describe('The time spent in indexing operations.').optional(),
  'indexing.index_total': z.string().describe('The number of indexing operations.').optional(),
  iito: z.string().describe('The number of indexing operations.').optional(),
  indexingIndexTotal: z.string().describe('The number of indexing operations.').optional(),
  'indexing.index_failed': z.string().describe('The number of failed indexing operations.').optional(),
  iif: z.string().describe('The number of failed indexing operations.').optional(),
  indexingIndexFailed: z.string().describe('The number of failed indexing operations.').optional(),
  'merges.current': z.string().describe('The number of current merge operations.').optional(),
  mc: z.string().describe('The number of current merge operations.').optional(),
  mergesCurrent: z.string().describe('The number of current merge operations.').optional(),
  'merges.current_docs': z.string().describe('The number of current merging documents.').optional(),
  mcd: z.string().describe('The number of current merging documents.').optional(),
  mergesCurrentDocs: z.string().describe('The number of current merging documents.').optional(),
  'merges.current_size': z.string().describe('The size of current merge operations.').optional(),
  mcs: z.string().describe('The size of current merge operations.').optional(),
  mergesCurrentSize: z.string().describe('The size of current merge operations.').optional(),
  'merges.total': z.string().describe('The number of completed merge operations.').optional(),
  mt: z.string().describe('The number of completed merge operations.').optional(),
  mergesTotal: z.string().describe('The number of completed merge operations.').optional(),
  'merges.total_docs': z.string().describe('The nuber of merged documents.').optional(),
  mtd: z.string().describe('The nuber of merged documents.').optional(),
  mergesTotalDocs: z.string().describe('The nuber of merged documents.').optional(),
  'merges.total_size': z.string().describe('The size of current merges.').optional(),
  mts: z.string().describe('The size of current merges.').optional(),
  mergesTotalSize: z.string().describe('The size of current merges.').optional(),
  'merges.total_time': z.string().describe('The time spent merging documents.').optional(),
  mtt: z.string().describe('The time spent merging documents.').optional(),
  mergesTotalTime: z.string().describe('The time spent merging documents.').optional(),
  'refresh.total': z.string().describe('The total number of refreshes.').optional(),
  'refresh.time': z.string().describe('The time spent in refreshes.').optional(),
  'refresh.external_total': z.string().describe('The total nunber of external refreshes.').optional(),
  rto: z.string().describe('The total nunber of external refreshes.').optional(),
  refreshTotal: z.string().describe('The total nunber of external refreshes.').optional(),
  'refresh.external_time': z.string().describe('The time spent in external refreshes.').optional(),
  rti: z.string().describe('The time spent in external refreshes.').optional(),
  refreshTime: z.string().describe('The time spent in external refreshes.').optional(),
  'refresh.listeners': z.string().describe('The number of pending refresh listeners.').optional(),
  rli: z.string().describe('The number of pending refresh listeners.').optional(),
  refreshListeners: z.string().describe('The number of pending refresh listeners.').optional(),
  'search.fetch_current': z.string().describe('The current fetch phase operations.').optional(),
  sfc: z.string().describe('The current fetch phase operations.').optional(),
  searchFetchCurrent: z.string().describe('The current fetch phase operations.').optional(),
  'search.fetch_time': z.string().describe('The time spent in fetch phase.').optional(),
  sfti: z.string().describe('The time spent in fetch phase.').optional(),
  searchFetchTime: z.string().describe('The time spent in fetch phase.').optional(),
  'search.fetch_total': z.string().describe('The total number of fetch operations.').optional(),
  sfto: z.string().describe('The total number of fetch operations.').optional(),
  searchFetchTotal: z.string().describe('The total number of fetch operations.').optional(),
  'search.open_contexts': z.string().describe('The number of open search contexts.').optional(),
  so: z.string().describe('The number of open search contexts.').optional(),
  searchOpenContexts: z.string().describe('The number of open search contexts.').optional(),
  'search.query_current': z.string().describe('The current query phase operations.').optional(),
  sqc: z.string().describe('The current query phase operations.').optional(),
  searchQueryCurrent: z.string().describe('The current query phase operations.').optional(),
  'search.query_time': z.string().describe('The time spent in query phase.').optional(),
  sqti: z.string().describe('The time spent in query phase.').optional(),
  searchQueryTime: z.string().describe('The time spent in query phase.').optional(),
  'search.query_total': z.string().describe('The total number of query phase operations.').optional(),
  sqto: z.string().describe('The total number of query phase operations.').optional(),
  searchQueryTotal: z.string().describe('The total number of query phase operations.').optional(),
  'search.scroll_current': z.string().describe('The open scroll contexts.').optional(),
  scc: z.string().describe('The open scroll contexts.').optional(),
  searchScrollCurrent: z.string().describe('The open scroll contexts.').optional(),
  'search.scroll_time': z.string().describe('The time scroll contexts were held open.').optional(),
  scti: z.string().describe('The time scroll contexts were held open.').optional(),
  searchScrollTime: z.string().describe('The time scroll contexts were held open.').optional(),
  'search.scroll_total': z.string().describe('The number of completed scroll contexts.').optional(),
  scto: z.string().describe('The number of completed scroll contexts.').optional(),
  searchScrollTotal: z.string().describe('The number of completed scroll contexts.').optional(),
  'segments.count': z.string().describe('The number of segments.').optional(),
  sc: z.string().describe('The number of segments.').optional(),
  segmentsCount: z.string().describe('The number of segments.').optional(),
  'segments.memory': z.string().describe('The memory used by segments.').optional(),
  sm: z.string().describe('The memory used by segments.').optional(),
  segmentsMemory: z.string().describe('The memory used by segments.').optional(),
  'segments.index_writer_memory': z.string().describe('The memory used by the index writer.').optional(),
  siwm: z.string().describe('The memory used by the index writer.').optional(),
  segmentsIndexWriterMemory: z.string().describe('The memory used by the index writer.').optional(),
  'segments.version_map_memory': z.string().describe('The memory used by the version map.').optional(),
  svmm: z.string().describe('The memory used by the version map.').optional(),
  segmentsVersionMapMemory: z.string().describe('The memory used by the version map.').optional(),
  'segments.fixed_bitset_memory': z.string().describe('The memory used by fixed bit sets for nested object field types and export type filters for types referred in `_parent` fields.').optional(),
  sfbm: z.string().describe('The memory used by fixed bit sets for nested object field types and export type filters for types referred in `_parent` fields.').optional(),
  fixedBitsetMemory: z.string().describe('The memory used by fixed bit sets for nested object field types and export type filters for types referred in `_parent` fields.').optional(),
  'seq_no.max': z.string().describe('The maximum sequence number.').optional(),
  sqm: z.string().describe('The maximum sequence number.').optional(),
  maxSeqNo: z.string().describe('The maximum sequence number.').optional(),
  'seq_no.local_checkpoint': z.string().describe('The local checkpoint.').optional(),
  sql: z.string().describe('The local checkpoint.').optional(),
  localCheckpoint: z.string().describe('The local checkpoint.').optional(),
  'seq_no.global_checkpoint': z.string().describe('The global checkpoint.').optional(),
  sqg: z.string().describe('The global checkpoint.').optional(),
  globalCheckpoint: z.string().describe('The global checkpoint.').optional(),
  'warmer.current': z.string().describe('The number of current warmer operations.').optional(),
  wc: z.string().describe('The number of current warmer operations.').optional(),
  warmerCurrent: z.string().describe('The number of current warmer operations.').optional(),
  'warmer.total': z.string().describe('The total number of warmer operations.').optional(),
  wto: z.string().describe('The total number of warmer operations.').optional(),
  warmerTotal: z.string().describe('The total number of warmer operations.').optional(),
  'warmer.total_time': z.string().describe('The time spent in warmer operations.').optional(),
  wtt: z.string().describe('The time spent in warmer operations.').optional(),
  warmerTotalTime: z.string().describe('The time spent in warmer operations.').optional(),
  'path.data': z.string().describe('The shard data path.').optional(),
  pd: z.string().describe('The shard data path.').optional(),
  dataPath: z.string().describe('The shard data path.').optional(),
  'path.state': z.string().describe('The shard state path.').optional(),
  ps: z.string().describe('The shard state path.').optional(),
  statsPath: z.string().describe('The shard state path.').optional(),
  'bulk.total_operations': z.string().describe('The number of bulk shard operations.').optional(),
  bto: z.string().describe('The number of bulk shard operations.').optional(),
  bulkTotalOperations: z.string().describe('The number of bulk shard operations.').optional(),
  'bulk.total_time': z.string().describe('The time spent in shard bulk operations.').optional(),
  btti: z.string().describe('The time spent in shard bulk operations.').optional(),
  bulkTotalTime: z.string().describe('The time spent in shard bulk operations.').optional(),
  'bulk.total_size_in_bytes': z.string().describe('The total size in bytes of shard bulk operations.').optional(),
  btsi: z.string().describe('The total size in bytes of shard bulk operations.').optional(),
  bulkTotalSizeInBytes: z.string().describe('The total size in bytes of shard bulk operations.').optional(),
  'bulk.avg_time': z.string().describe('The average time spent in shard bulk operations.').optional(),
  bati: z.string().describe('The average time spent in shard bulk operations.').optional(),
  bulkAvgTime: z.string().describe('The average time spent in shard bulk operations.').optional(),
  'bulk.avg_size_in_bytes': z.string().describe('The average size in bytes of shard bulk operations.').optional(),
  basi: z.string().describe('The average size in bytes of shard bulk operations.').optional(),
  bulkAvgSizeInBytes: z.string().describe('The average size in bytes of shard bulk operations.').optional()
}).meta({ id: 'CatShardsShardsRecord' })
export type CatShardsShardsRecord = z.infer<typeof CatShardsShardsRecord>

export const CatShardsResponse = z.array(CatShardsShardsRecord).meta({ id: 'CatShardsResponse' })
export type CatShardsResponse = z.infer<typeof CatShardsResponse>
