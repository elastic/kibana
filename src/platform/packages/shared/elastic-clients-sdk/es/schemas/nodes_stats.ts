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

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

export const ByteSize = z.union([long, z.string()]).meta({ id: 'ByteSize' })
export type ByteSize = z.infer<typeof ByteSize>

export const BulkStats = z.object({
  total_operations: long,
  total_time: Duration.optional(),
  total_time_in_millis: DurationValue,
  total_size: ByteSize.optional(),
  total_size_in_bytes: long,
  avg_time: Duration.optional(),
  avg_time_in_millis: DurationValue,
  avg_size: ByteSize.optional(),
  avg_size_in_bytes: long
}).meta({ id: 'BulkStats' })
export type BulkStats = z.infer<typeof BulkStats>

export const CommonStatsFlag = z.enum(['_all', 'store', 'indexing', 'get', 'search', 'merge', 'flush', 'refresh', 'query_cache', 'fielddata', 'docs', 'warmer', 'completion', 'segments', 'translog', 'request_cache', 'recovery', 'bulk', 'shard_stats', 'mappings', 'dense_vector', 'sparse_vector']).meta({ id: 'CommonStatsFlag' })
export type CommonStatsFlag = z.infer<typeof CommonStatsFlag>

export const CommonStatsFlags = z.union([CommonStatsFlag, z.array(CommonStatsFlag)]).meta({ id: 'CommonStatsFlags' })
export type CommonStatsFlags = z.infer<typeof CommonStatsFlags>

/** Path to field or array of paths. Some API's support wildcards in the path to select multiple fields. */
export const Field = z.string().meta({ id: 'Field' })
export type Field = z.infer<typeof Field>

export const FieldSizeUsage = z.object({
  size: ByteSize.optional(),
  size_in_bytes: long
}).meta({ id: 'FieldSizeUsage' })
export type FieldSizeUsage = z.infer<typeof FieldSizeUsage>

export const CompletionStats = z.object({
  size_in_bytes: long.describe('Total amount, in bytes, of memory used for completion across all shards assigned to selected nodes.'),
  size: ByteSize.describe('Total amount of memory used for completion across all shards assigned to selected nodes.').optional(),
  fields: z.record(Field, FieldSizeUsage).optional()
}).meta({ id: 'CompletionStats' })
export type CompletionStats = z.infer<typeof CompletionStats>

export const DocStats = z.object({
  count: long.describe('Total number of non-deleted documents across all primary shards assigned to selected nodes. This number is based on documents in Lucene segments and may include documents from nested fields.'),
  deleted: long.describe('Total number of deleted documents across all primary shards assigned to selected nodes. This number is based on documents in Lucene segments. Elasticsearch reclaims the disk space of deleted Lucene documents when a segment is merged.').optional(),
  total_size_in_bytes: long.describe('Returns the total size in bytes of all documents in this stats. This value may be more reliable than store_stats.size_in_bytes in estimating the index size.'),
  total_size: ByteSize.describe('Human readable total_size_in_bytes').optional()
}).meta({ id: 'DocStats' })
export type DocStats = z.infer<typeof DocStats>

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

export const FieldMemoryUsage = z.object({
  memory_size: ByteSize.optional(),
  memory_size_in_bytes: long
}).meta({ id: 'FieldMemoryUsage' })
export type FieldMemoryUsage = z.infer<typeof FieldMemoryUsage>

/** Time unit for milliseconds */
export const UnitMillis = long.meta({ id: 'UnitMillis' })
export type UnitMillis = z.infer<typeof UnitMillis>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const GlobalOrdinalFieldStats = z.object({
  build_time_in_millis: UnitMillis,
  build_time: z.string().optional(),
  shard_max_value_count: long
}).meta({ id: 'GlobalOrdinalFieldStats' })
export type GlobalOrdinalFieldStats = z.infer<typeof GlobalOrdinalFieldStats>

export const GlobalOrdinalsStats = z.object({
  build_time_in_millis: UnitMillis,
  build_time: z.string().optional(),
  fields: z.record(Name, GlobalOrdinalFieldStats).optional()
}).meta({ id: 'GlobalOrdinalsStats' })
export type GlobalOrdinalsStats = z.infer<typeof GlobalOrdinalsStats>

export const FielddataStats = z.object({
  evictions: long.optional(),
  memory_size: ByteSize.optional(),
  memory_size_in_bytes: long,
  fields: z.record(Field, FieldMemoryUsage).optional(),
  global_ordinals: GlobalOrdinalsStats
}).meta({ id: 'FielddataStats' })
export type FielddataStats = z.infer<typeof FielddataStats>

export const Fields = z.union([Field, z.array(Field)]).meta({ id: 'Fields' })
export type Fields = z.infer<typeof Fields>

export const FlushStats = z.object({
  periodic: long,
  total: long,
  total_time: Duration.optional(),
  total_time_in_millis: DurationValue
}).meta({ id: 'FlushStats' })
export type FlushStats = z.infer<typeof FlushStats>

export const GetStats = z.object({
  current: long,
  exists_time: Duration.optional(),
  exists_time_in_millis: DurationValue,
  exists_total: long,
  missing_time: Duration.optional(),
  missing_time_in_millis: DurationValue,
  missing_total: long,
  time: Duration.optional(),
  time_in_millis: DurationValue,
  total: long
}).meta({ id: 'GetStats' })
export type GetStats = z.infer<typeof GetStats>

export const HealthStatus = z.enum(['green', 'GREEN', 'yellow', 'YELLOW', 'red', 'RED', 'unknown', 'unavailable']).meta({ id: 'HealthStatus' })
export type HealthStatus = z.infer<typeof HealthStatus>

export const Host = z.string().meta({ id: 'Host' })
export type Host = z.infer<typeof Host>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const double = z.number().meta({ id: 'double' })
export type double = z.infer<typeof double>

export interface IndexingStatsShape {
  index_current: long
  delete_current: long
  delete_time?: Duration | undefined
  delete_time_in_millis: DurationValue
  delete_total: long
  is_throttled: boolean
  noop_update_total: long
  throttle_time?: Duration | undefined
  throttle_time_in_millis: DurationValue
  index_time?: Duration | undefined
  index_time_in_millis: DurationValue
  index_total: long
  index_failed: long
  types?: Record<string, IndexingStatsShape> | undefined
  write_load?: double | undefined
  recent_write_load?: double | undefined
  peak_write_load?: double | undefined
}
export const IndexingStats = z.object({
  index_current: long,
  delete_current: long,
  delete_time: Duration.optional(),
  delete_time_in_millis: DurationValue,
  delete_total: long,
  is_throttled: z.boolean(),
  noop_update_total: long,
  throttle_time: Duration.optional(),
  throttle_time_in_millis: DurationValue,
  index_time: Duration.optional(),
  index_time_in_millis: DurationValue,
  index_total: long,
  index_failed: long,
  get types (): z.ZodOptional<z.ZodRecord<z.ZodString, typeof IndexingStats>> { return z.record(z.string(), IndexingStats).optional() },
  write_load: double.optional(),
  recent_write_load: double.optional(),
  peak_write_load: double.optional()
}).meta({ id: 'IndexingStats' })
export type IndexingStats = z.infer<typeof IndexingStats>

export const Ip = z.string().meta({ id: 'Ip' })
export type Ip = z.infer<typeof Ip>

export const MergesStats = z.object({
  current: long,
  current_docs: long,
  current_size: z.string().optional(),
  current_size_in_bytes: long,
  total: long,
  total_auto_throttle: z.string().optional(),
  total_auto_throttle_in_bytes: long,
  total_docs: long,
  total_size: z.string().optional(),
  total_size_in_bytes: long,
  total_stopped_time: Duration.optional(),
  total_stopped_time_in_millis: DurationValue,
  total_throttled_time: Duration.optional(),
  total_throttled_time_in_millis: DurationValue,
  total_time: Duration.optional(),
  total_time_in_millis: DurationValue
}).meta({ id: 'MergesStats' })
export type MergesStats = z.infer<typeof MergesStats>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const NodeIds = z.union([NodeId, z.array(NodeId)]).meta({ id: 'NodeIds' })
export type NodeIds = z.infer<typeof NodeIds>

export const NodeRole = z.enum(['master', 'data', 'data_cold', 'data_content', 'data_frozen', 'data_hot', 'data_warm', 'client', 'ingest', 'ml', 'voting_only', 'transform', 'remote_cluster_client', 'coordinating_only']).meta({ id: 'NodeRole' })
export type NodeRole = z.infer<typeof NodeRole>

export const NodeRoles = z.array(NodeRole).meta({ id: 'NodeRoles' })
export type NodeRoles = z.infer<typeof NodeRoles>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

/** Contains statistics about the number of nodes selected by the request. */
export const NodeStatistics = z.object({
  failures: z.array(z.lazy(() => ErrorCause)).optional(),
  total: integer.describe('Total number of nodes selected by the request.'),
  successful: integer.describe('Number of nodes that responded successfully to the request.'),
  failed: integer.describe('Number of nodes that rejected the request or failed to respond. If this value is not 0, a reason for the rejection or failure is included in the response.')
}).meta({ id: 'NodeStatistics' })
export type NodeStatistics = z.infer<typeof NodeStatistics>

export const NodeStatsLevel = z.enum(['node', 'indices', 'shards']).meta({ id: 'NodeStatsLevel' })
export type NodeStatsLevel = z.infer<typeof NodeStatsLevel>

export const QueryCacheStats = z.object({
  cache_count: long.describe('Total number of entries added to the query cache across all shards assigned to selected nodes. This number includes current and evicted entries.'),
  cache_size: long.describe('Total number of entries currently in the query cache across all shards assigned to selected nodes.'),
  evictions: long.describe('Total number of query cache evictions across all shards assigned to selected nodes.'),
  hit_count: long.describe('Total count of query cache hits across all shards assigned to selected nodes.'),
  memory_size: ByteSize.describe('Total amount of memory used for the query cache across all shards assigned to selected nodes.').optional(),
  memory_size_in_bytes: long.describe('Total amount, in bytes, of memory used for the query cache across all shards assigned to selected nodes.'),
  miss_count: long.describe('Total count of query cache misses across all shards assigned to selected nodes.'),
  total_count: long.describe('Total count of hits and misses in the query cache across all shards assigned to selected nodes.')
}).meta({ id: 'QueryCacheStats' })
export type QueryCacheStats = z.infer<typeof QueryCacheStats>

export const RecoveryStats = z.object({
  current_as_source: long,
  current_as_target: long,
  throttle_time: Duration.optional(),
  throttle_time_in_millis: DurationValue
}).meta({ id: 'RecoveryStats' })
export type RecoveryStats = z.infer<typeof RecoveryStats>

export const RefreshStats = z.object({
  external_total: long,
  external_total_time_in_millis: DurationValue,
  listeners: long,
  total: long,
  total_time: Duration.optional(),
  total_time_in_millis: DurationValue
}).meta({ id: 'RefreshStats' })
export type RefreshStats = z.infer<typeof RefreshStats>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const RequestCacheStats = z.object({
  evictions: long,
  hit_count: long,
  memory_size: z.string().optional(),
  memory_size_in_bytes: long,
  miss_count: long
}).meta({ id: 'RequestCacheStats' })
export type RequestCacheStats = z.infer<typeof RequestCacheStats>

export interface SearchStatsShape {
  fetch_current: long
  fetch_time?: Duration | undefined
  fetch_time_in_millis: DurationValue
  fetch_total: long
  open_contexts?: long | undefined
  query_current: long
  query_time?: Duration | undefined
  query_time_in_millis: DurationValue
  query_total: long
  scroll_current: long
  scroll_time?: Duration | undefined
  scroll_time_in_millis: DurationValue
  scroll_total: long
  suggest_current: long
  suggest_time?: Duration | undefined
  suggest_time_in_millis: DurationValue
  suggest_total: long
  recent_search_load?: double | undefined
  groups?: Record<string, SearchStatsShape> | undefined
}
export const SearchStats = z.object({
  fetch_current: long,
  fetch_time: Duration.optional(),
  fetch_time_in_millis: DurationValue,
  fetch_total: long,
  open_contexts: long.optional(),
  query_current: long,
  query_time: Duration.optional(),
  query_time_in_millis: DurationValue,
  query_total: long,
  scroll_current: long,
  scroll_time: Duration.optional(),
  scroll_time_in_millis: DurationValue,
  scroll_total: long,
  suggest_current: long,
  suggest_time: Duration.optional(),
  suggest_time_in_millis: DurationValue,
  suggest_total: long,
  recent_search_load: double.optional(),
  get groups (): z.ZodOptional<z.ZodRecord<z.ZodString, typeof SearchStats>> { return z.record(z.string(), SearchStats).optional() }
}).meta({ id: 'SearchStats' })
export type SearchStats = z.infer<typeof SearchStats>

export const IndicesStatsShardFileSizeInfo = z.object({
  description: z.string(),
  size_in_bytes: long,
  min_size_in_bytes: long.optional(),
  max_size_in_bytes: long.optional(),
  average_size_in_bytes: long.optional(),
  count: long.optional()
}).meta({ id: 'IndicesStatsShardFileSizeInfo' })
export type IndicesStatsShardFileSizeInfo = z.infer<typeof IndicesStatsShardFileSizeInfo>

export const SegmentsStats = z.object({
  count: integer.describe('Total number of segments across all shards assigned to selected nodes.'),
  doc_values_memory: ByteSize.describe('Total amount of memory used for doc values across all shards assigned to selected nodes.').optional(),
  doc_values_memory_in_bytes: long.describe('Total amount, in bytes, of memory used for doc values across all shards assigned to selected nodes.'),
  file_sizes: z.record(z.string(), IndicesStatsShardFileSizeInfo).describe('This object is not populated by the cluster stats API. To get information on segment files, use the node stats API.'),
  fixed_bit_set: ByteSize.describe('Total amount of memory used by fixed bit sets across all shards assigned to selected nodes. Fixed bit sets are used for nested object field types and type filters for join fields.').optional(),
  fixed_bit_set_memory_in_bytes: long.describe('Total amount of memory, in bytes, used by fixed bit sets across all shards assigned to selected nodes.'),
  index_writer_memory: ByteSize.describe('Total amount of memory used by all index writers across all shards assigned to selected nodes.').optional(),
  index_writer_memory_in_bytes: long.describe('Total amount, in bytes, of memory used by all index writers across all shards assigned to selected nodes.'),
  max_unsafe_auto_id_timestamp: long.describe('Unix timestamp, in milliseconds, of the most recently retried indexing request.'),
  memory: ByteSize.describe('Total amount of memory used for segments across all shards assigned to selected nodes.').optional(),
  memory_in_bytes: long.describe('Total amount, in bytes, of memory used for segments across all shards assigned to selected nodes.'),
  norms_memory: ByteSize.describe('Total amount of memory used for normalization factors across all shards assigned to selected nodes.').optional(),
  norms_memory_in_bytes: long.describe('Total amount, in bytes, of memory used for normalization factors across all shards assigned to selected nodes.'),
  points_memory: ByteSize.describe('Total amount of memory used for points across all shards assigned to selected nodes.').optional(),
  points_memory_in_bytes: long.describe('Total amount, in bytes, of memory used for points across all shards assigned to selected nodes.'),
  stored_fields_memory_in_bytes: long.describe('Total amount, in bytes, of memory used for stored fields across all shards assigned to selected nodes.'),
  stored_fields_memory: ByteSize.describe('Total amount of memory used for stored fields across all shards assigned to selected nodes.').optional(),
  terms_memory_in_bytes: long.describe('Total amount, in bytes, of memory used for terms across all shards assigned to selected nodes.'),
  terms_memory: ByteSize.describe('Total amount of memory used for terms across all shards assigned to selected nodes.').optional(),
  term_vectors_memory: ByteSize.describe('Total amount of memory used for term vectors across all shards assigned to selected nodes.').optional(),
  term_vectors_memory_in_bytes: long.describe('Total amount, in bytes, of memory used for term vectors across all shards assigned to selected nodes.'),
  version_map_memory: ByteSize.describe('Total amount of memory used by all version maps across all shards assigned to selected nodes.').optional(),
  version_map_memory_in_bytes: long.describe('Total amount, in bytes, of memory used by all version maps across all shards assigned to selected nodes.')
}).meta({ id: 'SegmentsStats' })
export type SegmentsStats = z.infer<typeof SegmentsStats>

export const SequenceNumber = long.meta({ id: 'SequenceNumber' })
export type SequenceNumber = z.infer<typeof SequenceNumber>

export const StoreStats = z.object({
  size: ByteSize.describe('Total size of all shards assigned to selected nodes.').optional(),
  size_in_bytes: long.describe('Total size, in bytes, of all shards assigned to selected nodes.'),
  reserved: ByteSize.describe('A prediction of how much larger the shard stores will eventually grow due to ongoing peer recoveries, restoring snapshots, and similar activities.').optional(),
  reserved_in_bytes: long.describe('A prediction, in bytes, of how much larger the shard stores will eventually grow due to ongoing peer recoveries, restoring snapshots, and similar activities.'),
  total_data_set_size: ByteSize.describe('Total data set size of all shards assigned to selected nodes. This includes the size of shards not stored fully on the nodes, such as the cache for partially mounted indices.').optional(),
  total_data_set_size_in_bytes: long.describe('Total data set size, in bytes, of all shards assigned to selected nodes. This includes the size of shards not stored fully on the nodes, such as the cache for partially mounted indices.').optional()
}).meta({ id: 'StoreStats' })
export type StoreStats = z.infer<typeof StoreStats>

export const TranslogStats = z.object({
  earliest_last_modified_age: long,
  operations: long,
  size: z.string().optional(),
  size_in_bytes: long,
  uncommitted_operations: integer,
  uncommitted_size: z.string().optional(),
  uncommitted_size_in_bytes: long
}).meta({ id: 'TranslogStats' })
export type TranslogStats = z.infer<typeof TranslogStats>

export const TransportAddress = z.string().meta({ id: 'TransportAddress' })
export type TransportAddress = z.infer<typeof TransportAddress>

export const Uuid = z.string().meta({ id: 'Uuid' })
export type Uuid = z.infer<typeof Uuid>

export const VersionNumber = long.meta({ id: 'VersionNumber' })
export type VersionNumber = z.infer<typeof VersionNumber>

export const WarmerStats = z.object({
  current: long,
  total: long,
  total_time: Duration.optional(),
  total_time_in_millis: DurationValue
}).meta({ id: 'WarmerStats' })
export type WarmerStats = z.infer<typeof WarmerStats>

export const float = z.number().meta({ id: 'float' })
export type float = z.infer<typeof float>

export const IndicesStatsIndexMetadataState = z.enum(['open', 'close']).meta({ id: 'IndicesStatsIndexMetadataState' })
export type IndicesStatsIndexMetadataState = z.infer<typeof IndicesStatsIndexMetadataState>

export const IndicesStatsShardCommit = z.object({
  generation: integer,
  id: Id,
  num_docs: long,
  user_data: z.record(z.string(), z.string())
}).meta({ id: 'IndicesStatsShardCommit' })
export type IndicesStatsShardCommit = z.infer<typeof IndicesStatsShardCommit>

export const IndicesStatsMappingStats = z.object({
  total_count: long,
  total_estimated_overhead: ByteSize.optional(),
  total_estimated_overhead_in_bytes: long
}).meta({ id: 'IndicesStatsMappingStats' })
export type IndicesStatsMappingStats = z.infer<typeof IndicesStatsMappingStats>

export const IndicesStatsShardPath = z.object({
  data_path: z.string(),
  is_custom_data_path: z.boolean(),
  state_path: z.string()
}).meta({ id: 'IndicesStatsShardPath' })
export type IndicesStatsShardPath = z.infer<typeof IndicesStatsShardPath>

export const IndicesStatsShardQueryCache = z.object({
  cache_count: long,
  cache_size: long,
  evictions: long,
  hit_count: long,
  memory_size_in_bytes: long,
  miss_count: long,
  total_count: long
}).meta({ id: 'IndicesStatsShardQueryCache' })
export type IndicesStatsShardQueryCache = z.infer<typeof IndicesStatsShardQueryCache>

export const IndicesStatsShardLease = z.object({
  id: Id,
  retaining_seq_no: SequenceNumber,
  timestamp: long,
  source: z.string()
}).meta({ id: 'IndicesStatsShardLease' })
export type IndicesStatsShardLease = z.infer<typeof IndicesStatsShardLease>

export const IndicesStatsShardRetentionLeases = z.object({
  primary_term: long,
  version: VersionNumber,
  leases: z.array(IndicesStatsShardLease)
}).meta({ id: 'IndicesStatsShardRetentionLeases' })
export type IndicesStatsShardRetentionLeases = z.infer<typeof IndicesStatsShardRetentionLeases>

export const IndicesStatsShardRoutingState = z.enum(['UNASSIGNED', 'INITIALIZING', 'STARTED', 'RELOCATING']).meta({ id: 'IndicesStatsShardRoutingState' })
export type IndicesStatsShardRoutingState = z.infer<typeof IndicesStatsShardRoutingState>

export const IndicesStatsShardRouting = z.object({
  node: z.string(),
  primary: z.boolean(),
  relocating_node: z.union([z.string(), z.null()]).optional(),
  state: IndicesStatsShardRoutingState
}).meta({ id: 'IndicesStatsShardRouting' })
export type IndicesStatsShardRouting = z.infer<typeof IndicesStatsShardRouting>

export const IndicesStatsShardSequenceNumber = z.object({
  global_checkpoint: long,
  local_checkpoint: long,
  max_seq_no: SequenceNumber
}).meta({ id: 'IndicesStatsShardSequenceNumber' })
export type IndicesStatsShardSequenceNumber = z.infer<typeof IndicesStatsShardSequenceNumber>

export const IndicesStatsShardsTotalStats = z.object({
  total_count: long
}).meta({ id: 'IndicesStatsShardsTotalStats' })
export type IndicesStatsShardsTotalStats = z.infer<typeof IndicesStatsShardsTotalStats>

export interface IndicesStatsShardStatsShape {
  commit?: IndicesStatsShardCommit | undefined
  completion?: CompletionStats | undefined
  docs?: DocStats | undefined
  fielddata?: FielddataStats | undefined
  flush?: FlushStats | undefined
  get?: GetStats | undefined
  indexing?: IndexingStatsShape | undefined
  mappings?: IndicesStatsMappingStats | undefined
  merges?: MergesStats | undefined
  shard_path?: IndicesStatsShardPath | undefined
  query_cache?: IndicesStatsShardQueryCache | undefined
  recovery?: RecoveryStats | undefined
  refresh?: RefreshStats | undefined
  request_cache?: RequestCacheStats | undefined
  retention_leases?: IndicesStatsShardRetentionLeases | undefined
  routing?: IndicesStatsShardRouting | undefined
  search?: SearchStatsShape | undefined
  segments?: SegmentsStats | undefined
  seq_no?: IndicesStatsShardSequenceNumber | undefined
  store?: StoreStats | undefined
  translog?: TranslogStats | undefined
  warmer?: WarmerStats | undefined
  bulk?: BulkStats | undefined
  shards?: Record<IndexName, unknown> | undefined
  shard_stats?: IndicesStatsShardsTotalStats | undefined
  indices?: IndicesStatsIndicesStatsShape | undefined
}
export const IndicesStatsShardStats = z.object({
  commit: IndicesStatsShardCommit.optional(),
  completion: CompletionStats.optional(),
  docs: DocStats.optional(),
  fielddata: FielddataStats.optional(),
  flush: FlushStats.optional(),
  get: GetStats.optional(),
  get indexing () { return IndexingStats.optional() },
  mappings: IndicesStatsMappingStats.optional(),
  merges: MergesStats.optional(),
  shard_path: IndicesStatsShardPath.optional(),
  query_cache: IndicesStatsShardQueryCache.optional(),
  recovery: RecoveryStats.optional(),
  refresh: RefreshStats.optional(),
  request_cache: RequestCacheStats.optional(),
  retention_leases: IndicesStatsShardRetentionLeases.optional(),
  routing: IndicesStatsShardRouting.optional(),
  get search () { return SearchStats.optional() },
  segments: SegmentsStats.optional(),
  seq_no: IndicesStatsShardSequenceNumber.optional(),
  store: StoreStats.optional(),
  translog: TranslogStats.optional(),
  warmer: WarmerStats.optional(),
  bulk: BulkStats.optional(),
  shards: z.record(IndexName, z.any()).optional(),
  shard_stats: IndicesStatsShardsTotalStats.optional(),
  get indices () { return IndicesStatsIndicesStats.optional() }
}).meta({ id: 'IndicesStatsShardStats' })
export type IndicesStatsShardStats = z.infer<typeof IndicesStatsShardStats>

export interface IndicesStatsIndicesStatsShape {
  primaries?: IndicesStatsIndexStatsShape | undefined
  shards?: Record<string, IndicesStatsShardStatsShape[]> | undefined
  total?: IndicesStatsIndexStatsShape | undefined
  uuid?: Uuid | undefined
  health?: HealthStatus | undefined
  status?: IndicesStatsIndexMetadataState | undefined
}
export const IndicesStatsIndicesStats = z.object({
  get primaries () { return IndicesStatsIndexStats.optional() },
  get shards (): z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<typeof IndicesStatsShardStats>>> { return z.record(z.string(), IndicesStatsShardStats.array()).optional() },
  get total () { return IndicesStatsIndexStats.optional() },
  uuid: Uuid.optional(),
  health: HealthStatus.optional(),
  status: IndicesStatsIndexMetadataState.optional()
}).meta({ id: 'IndicesStatsIndicesStats' })
export type IndicesStatsIndicesStats = z.infer<typeof IndicesStatsIndicesStats>

export interface IndicesStatsIndexStatsShape {
  completion?: CompletionStats | undefined
  docs?: DocStats | undefined
  fielddata?: FielddataStats | undefined
  flush?: FlushStats | undefined
  get?: GetStats | undefined
  indexing?: IndexingStatsShape | undefined
  indices?: IndicesStatsIndicesStatsShape | undefined
  merges?: MergesStats | undefined
  query_cache?: QueryCacheStats | undefined
  recovery?: RecoveryStats | undefined
  refresh?: RefreshStats | undefined
  request_cache?: RequestCacheStats | undefined
  search?: SearchStatsShape | undefined
  segments?: SegmentsStats | undefined
  store?: StoreStats | undefined
  translog?: TranslogStats | undefined
  warmer?: WarmerStats | undefined
  bulk?: BulkStats | undefined
  shard_stats?: IndicesStatsShardsTotalStats | undefined
}
export const IndicesStatsIndexStats = z.object({
  completion: CompletionStats.describe('Contains statistics about completions across all shards assigned to the node.').optional(),
  docs: DocStats.describe('Contains statistics about documents across all primary shards assigned to the node.').optional(),
  fielddata: FielddataStats.describe('Contains statistics about the field data cache across all shards assigned to the node.').optional(),
  flush: FlushStats.describe('Contains statistics about flush operations for the node.').optional(),
  get: GetStats.describe('Contains statistics about get operations for the node.').optional(),
  get indexing () { return IndexingStats.describe('Contains statistics about indexing operations for the node.').optional() },
  get indices () { return IndicesStatsIndicesStats.describe('Contains statistics about indices operations for the node.').optional() },
  merges: MergesStats.describe('Contains statistics about merge operations for the node.').optional(),
  query_cache: QueryCacheStats.describe('Contains statistics about the query cache across all shards assigned to the node.').optional(),
  recovery: RecoveryStats.describe('Contains statistics about recovery operations for the node.').optional(),
  refresh: RefreshStats.describe('Contains statistics about refresh operations for the node.').optional(),
  request_cache: RequestCacheStats.describe('Contains statistics about the request cache across all shards assigned to the node.').optional(),
  get search () { return SearchStats.describe('Contains statistics about search operations for the node.').optional() },
  segments: SegmentsStats.describe('Contains statistics about segments across all shards assigned to the node.').optional(),
  store: StoreStats.describe('Contains statistics about the size of shards assigned to the node.').optional(),
  translog: TranslogStats.describe('Contains statistics about transaction log operations for the node.').optional(),
  warmer: WarmerStats.describe('Contains statistics about index warming operations for the node.').optional(),
  bulk: BulkStats.optional(),
  shard_stats: IndicesStatsShardsTotalStats.optional()
}).meta({ id: 'IndicesStatsIndexStats' })
export type IndicesStatsIndexStats = z.infer<typeof IndicesStatsIndexStats>

export const NodesAdaptiveSelection = z.object({
  avg_queue_size: long.describe('The exponentially weighted moving average queue size of search requests on the keyed node.').optional(),
  avg_response_time: Duration.describe('The exponentially weighted moving average response time of search requests on the keyed node.').optional(),
  avg_response_time_ns: long.describe('The exponentially weighted moving average response time, in nanoseconds, of search requests on the keyed node.').optional(),
  avg_service_time: Duration.describe('The exponentially weighted moving average service time of search requests on the keyed node.').optional(),
  avg_service_time_ns: long.describe('The exponentially weighted moving average service time, in nanoseconds, of search requests on the keyed node.').optional(),
  outgoing_searches: long.describe('The number of outstanding search requests to the keyed node from the node these stats are for.').optional(),
  rank: z.string().describe('The rank of this node; used for shard selection when routing search requests.').optional()
}).meta({ id: 'NodesAdaptiveSelection' })
export type NodesAdaptiveSelection = z.infer<typeof NodesAdaptiveSelection>

export const NodesBreaker = z.object({
  estimated_size: z.string().describe('Estimated memory used for the operation.').optional(),
  estimated_size_in_bytes: long.describe('Estimated memory used, in bytes, for the operation.').optional(),
  limit_size: z.string().describe('Memory limit for the circuit breaker.').optional(),
  limit_size_in_bytes: long.describe('Memory limit, in bytes, for the circuit breaker.').optional(),
  overhead: float.describe('A constant that all estimates for the circuit breaker are multiplied with to calculate a final estimate.').optional(),
  tripped: float.describe('Total number of times the circuit breaker has been triggered and prevented an out of memory error.').optional()
}).meta({ id: 'NodesBreaker' })
export type NodesBreaker = z.infer<typeof NodesBreaker>

export const NodesCpuAcct = z.object({
  control_group: z.string().describe('The `cpuacct` control group to which the Elasticsearch process belongs.').optional(),
  usage_nanos: DurationValue.describe('The total CPU time, in nanoseconds, consumed by all tasks in the same cgroup as the Elasticsearch process.').optional()
}).meta({ id: 'NodesCpuAcct' })
export type NodesCpuAcct = z.infer<typeof NodesCpuAcct>

export const NodesCgroupCpuStat = z.object({
  number_of_elapsed_periods: long.describe('The number of reporting periods (as specified by `cfs_period_micros`) that have elapsed.').optional(),
  number_of_times_throttled: long.describe('The number of times all tasks in the same cgroup as the Elasticsearch process have been throttled.').optional(),
  time_throttled_nanos: DurationValue.describe('The total amount of time, in nanoseconds, for which all tasks in the same cgroup as the Elasticsearch process have been throttled.').optional()
}).meta({ id: 'NodesCgroupCpuStat' })
export type NodesCgroupCpuStat = z.infer<typeof NodesCgroupCpuStat>

export const NodesCgroupCpu = z.object({
  control_group: z.string().describe('The `cpu` control group to which the Elasticsearch process belongs.').optional(),
  cfs_period_micros: integer.describe('The period of time, in microseconds, for how regularly all tasks in the same cgroup as the Elasticsearch process should have their access to CPU resources reallocated.').optional(),
  cfs_quota_micros: integer.describe('The total amount of time, in microseconds, for which all tasks in the same cgroup as the Elasticsearch process can run during one period `cfs_period_micros`.').optional(),
  stat: NodesCgroupCpuStat.describe('Contains CPU statistics for the node.').optional()
}).meta({ id: 'NodesCgroupCpu' })
export type NodesCgroupCpu = z.infer<typeof NodesCgroupCpu>

export const NodesCgroupMemory = z.object({
  control_group: z.string().describe('The `memory` control group to which the Elasticsearch process belongs.').optional(),
  limit_in_bytes: z.string().describe('The maximum amount of user memory (including file cache) allowed for all tasks in the same cgroup as the Elasticsearch process. This value can be too big to store in a `long`, so is returned as a string so that the value returned can exactly match what the underlying operating system interface returns. Any value that is too large to parse into a `long` almost certainly means no limit has been set for the cgroup.').optional(),
  usage_in_bytes: z.string().describe('The total current memory usage by processes in the cgroup, in bytes, by all tasks in the same cgroup as the Elasticsearch process. This value is stored as a string for consistency with `limit_in_bytes`.').optional()
}).meta({ id: 'NodesCgroupMemory' })
export type NodesCgroupMemory = z.infer<typeof NodesCgroupMemory>

export const NodesCgroup = z.object({
  cpuacct: NodesCpuAcct.describe('Contains statistics about `cpuacct` control group for the node.').optional(),
  cpu: NodesCgroupCpu.describe('Contains statistics about `cpu` control group for the node.').optional(),
  memory: NodesCgroupMemory.describe('Contains statistics about the memory control group for the node.').optional()
}).meta({ id: 'NodesCgroup' })
export type NodesCgroup = z.infer<typeof NodesCgroup>

export const NodesClient = z.object({
  id: long.describe('Unique ID for the HTTP client.').optional(),
  agent: z.string().describe('Reported agent for the HTTP client. If unavailable, this property is not included in the response.').optional(),
  local_address: z.string().describe('Local address for the HTTP connection.').optional(),
  remote_address: z.string().describe('Remote address for the HTTP connection.').optional(),
  last_uri: z.string().describe('The URI of the client’s most recent request.').optional(),
  opened_time_millis: long.describe('Time at which the client opened the connection.').optional(),
  closed_time_millis: long.describe('Time at which the client closed the connection if the connection is closed.').optional(),
  last_request_time_millis: long.describe('Time of the most recent request from this client.').optional(),
  request_count: long.describe('Number of requests from this client.').optional(),
  request_size_bytes: long.describe('Cumulative size in bytes of all requests from this client.').optional(),
  x_opaque_id: z.string().describe('Value from the client’s `x-opaque-id` HTTP header. If unavailable, this property is not included in the response.').optional()
}).meta({ id: 'NodesClient' })
export type NodesClient = z.infer<typeof NodesClient>

export const NodesRecording = z.object({
  name: z.string().optional(),
  cumulative_execution_count: long.optional(),
  cumulative_execution_time: Duration.optional(),
  cumulative_execution_time_millis: DurationValue.optional()
}).meta({ id: 'NodesRecording' })
export type NodesRecording = z.infer<typeof NodesRecording>

export const NodesClusterAppliedStats = z.object({
  recordings: z.array(NodesRecording).optional()
}).meta({ id: 'NodesClusterAppliedStats' })
export type NodesClusterAppliedStats = z.infer<typeof NodesClusterAppliedStats>

export const NodesClusterStateQueue = z.object({
  total: long.describe('Total number of cluster states in queue.').optional(),
  pending: long.describe('Number of pending cluster states in queue.').optional(),
  committed: long.describe('Number of committed cluster states in queue.').optional()
}).meta({ id: 'NodesClusterStateQueue' })
export type NodesClusterStateQueue = z.infer<typeof NodesClusterStateQueue>

export const NodesClusterStateUpdate = z.object({
  count: long.describe('The number of cluster state update attempts that did not change the cluster state since the node started.'),
  computation_time: Duration.describe('The cumulative amount of time spent computing no-op cluster state updates since the node started.').optional(),
  computation_time_millis: DurationValue.describe('The cumulative amount of time, in milliseconds, spent computing no-op cluster state updates since the node started.').optional(),
  publication_time: Duration.describe('The cumulative amount of time spent publishing cluster state updates which ultimately succeeded, which includes everything from the start of the publication (just after the computation of the new cluster state) until the publication has finished and the master node is ready to start processing the next state update. This includes the time measured by `context_construction_time`, `commit_time`, `completion_time` and `master_apply_time`.').optional(),
  publication_time_millis: DurationValue.describe('The cumulative amount of time, in milliseconds, spent publishing cluster state updates which ultimately succeeded, which includes everything from the start of the publication (just after the computation of the new cluster state) until the publication has finished and the master node is ready to start processing the next state update. This includes the time measured by `context_construction_time`, `commit_time`, `completion_time` and `master_apply_time`.').optional(),
  context_construction_time: Duration.describe('The cumulative amount of time spent constructing a publication context since the node started for publications that ultimately succeeded. This statistic includes the time spent computing the difference between the current and new cluster state preparing a serialized representation of this difference.').optional(),
  context_construction_time_millis: DurationValue.describe('The cumulative amount of time, in milliseconds, spent constructing a publication context since the node started for publications that ultimately succeeded. This statistic includes the time spent computing the difference between the current and new cluster state preparing a serialized representation of this difference.').optional(),
  commit_time: Duration.describe('The cumulative amount of time spent waiting for a successful cluster state update to commit, which measures the time from the start of each publication until a majority of the master-eligible nodes have written the state to disk and confirmed the write to the elected master.').optional(),
  commit_time_millis: DurationValue.describe('The cumulative amount of time, in milliseconds, spent waiting for a successful cluster state update to commit, which measures the time from the start of each publication until a majority of the master-eligible nodes have written the state to disk and confirmed the write to the elected master.').optional(),
  completion_time: Duration.describe('The cumulative amount of time spent waiting for a successful cluster state update to complete, which measures the time from the start of each publication until all the other nodes have notified the elected master that they have applied the cluster state.').optional(),
  completion_time_millis: DurationValue.describe('The cumulative amount of time, in milliseconds,  spent waiting for a successful cluster state update to complete, which measures the time from the start of each publication until all the other nodes have notified the elected master that they have applied the cluster state.').optional(),
  master_apply_time: Duration.describe('The cumulative amount of time spent successfully applying cluster state updates on the elected master since the node started.').optional(),
  master_apply_time_millis: DurationValue.describe('The cumulative amount of time, in milliseconds, spent successfully applying cluster state updates on the elected master since the node started.').optional(),
  notification_time: Duration.describe('The cumulative amount of time spent notifying listeners of a no-op cluster state update since the node started.').optional(),
  notification_time_millis: DurationValue.describe('The cumulative amount of time, in milliseconds, spent notifying listeners of a no-op cluster state update since the node started.').optional()
}).meta({ id: 'NodesClusterStateUpdate' })
export type NodesClusterStateUpdate = z.infer<typeof NodesClusterStateUpdate>

export const NodesContext = z.object({
  context: z.string().optional(),
  compilations: long.optional(),
  cache_evictions: long.optional(),
  compilation_limit_triggered: long.optional()
}).meta({ id: 'NodesContext' })
export type NodesContext = z.infer<typeof NodesContext>

export const NodesCpu = z.object({
  percent: integer.optional(),
  sys: Duration.optional(),
  sys_in_millis: DurationValue.optional(),
  total: Duration.optional(),
  total_in_millis: DurationValue.optional(),
  user: Duration.optional(),
  user_in_millis: DurationValue.optional(),
  load_average: z.record(z.string(), double).optional()
}).meta({ id: 'NodesCpu' })
export type NodesCpu = z.infer<typeof NodesCpu>

export const NodesDataPathStats = z.object({
  available: z.string().describe('Total amount of disk space available to this Java virtual machine on this file store.').optional(),
  available_in_bytes: long.describe('Total number of bytes available to this Java virtual machine on this file store.').optional(),
  disk_queue: z.string().optional(),
  disk_reads: long.optional(),
  disk_read_size: z.string().optional(),
  disk_read_size_in_bytes: long.optional(),
  disk_writes: long.optional(),
  disk_write_size: z.string().optional(),
  disk_write_size_in_bytes: long.optional(),
  free: z.string().describe('Total amount of unallocated disk space in the file store.').optional(),
  free_in_bytes: long.describe('Total number of unallocated bytes in the file store.').optional(),
  mount: z.string().describe('Mount point of the file store (for example: `/dev/sda2`).').optional(),
  path: z.string().describe('Path to the file store.').optional(),
  total: z.string().describe('Total size of the file store.').optional(),
  total_in_bytes: long.describe('Total size of the file store in bytes.').optional(),
  type: z.string().describe('Type of the file store (ex: ext4).').optional()
}).meta({ id: 'NodesDataPathStats' })
export type NodesDataPathStats = z.infer<typeof NodesDataPathStats>

export const NodesPublishedClusterStates = z.object({
  full_states: long.describe('Number of published cluster states.').optional(),
  incompatible_diffs: long.describe('Number of incompatible differences between published cluster states.').optional(),
  compatible_diffs: long.describe('Number of compatible differences between published cluster states.').optional()
}).meta({ id: 'NodesPublishedClusterStates' })
export type NodesPublishedClusterStates = z.infer<typeof NodesPublishedClusterStates>

export const NodesSerializedClusterStateDetail = z.object({
  count: long.optional(),
  uncompressed_size: z.string().optional(),
  uncompressed_size_in_bytes: long.optional(),
  compressed_size: z.string().optional(),
  compressed_size_in_bytes: long.optional()
}).meta({ id: 'NodesSerializedClusterStateDetail' })
export type NodesSerializedClusterStateDetail = z.infer<typeof NodesSerializedClusterStateDetail>

export const NodesSerializedClusterState = z.object({
  full_states: NodesSerializedClusterStateDetail.describe('Number of published cluster states.').optional(),
  diffs: NodesSerializedClusterStateDetail.optional()
}).meta({ id: 'NodesSerializedClusterState' })
export type NodesSerializedClusterState = z.infer<typeof NodesSerializedClusterState>

export const NodesDiscovery = z.object({
  cluster_state_queue: NodesClusterStateQueue.describe('Contains statistics for the cluster state queue of the node.').optional(),
  published_cluster_states: NodesPublishedClusterStates.describe('Contains statistics for the published cluster states of the node.').optional(),
  cluster_state_update: z.record(z.string(), NodesClusterStateUpdate).describe('Contains low-level statistics about how long various activities took during cluster state updates while the node was the elected master. Omitted if the node is not master-eligible. Every field whose name ends in `_time` within this object is also represented as a raw number of milliseconds in a field whose name ends in `_time_millis`. The human-readable fields with a `_time` suffix are only returned if requested with the `?human=true` query parameter.').optional(),
  serialized_cluster_states: NodesSerializedClusterState.optional(),
  cluster_applier_stats: NodesClusterAppliedStats.optional()
}).meta({ id: 'NodesDiscovery' })
export type NodesDiscovery = z.infer<typeof NodesDiscovery>

export const NodesMemoryStats = z.object({
  adjusted_total_in_bytes: long.describe('If the amount of physical memory has been overridden using the `es`.`total_memory_bytes` system property then this reports the overridden value in bytes. Otherwise it reports the same value as `total_in_bytes`.').optional(),
  resident: z.string().optional(),
  resident_in_bytes: long.optional(),
  share: z.string().optional(),
  share_in_bytes: long.optional(),
  total_virtual: z.string().optional(),
  total_virtual_in_bytes: long.optional(),
  total_in_bytes: long.describe('Total amount of physical memory in bytes.').optional(),
  free_in_bytes: long.describe('Amount of free physical memory in bytes.').optional(),
  used_in_bytes: long.describe('Amount of used physical memory in bytes.').optional()
}).meta({ id: 'NodesMemoryStats' })
export type NodesMemoryStats = z.infer<typeof NodesMemoryStats>

export const NodesExtendedMemoryStats = z.object({
  ...NodesMemoryStats.shape,
  free_percent: integer.describe('Percentage of free memory.').optional(),
  used_percent: integer.describe('Percentage of used memory.').optional()
}).meta({ id: 'NodesExtendedMemoryStats' })
export type NodesExtendedMemoryStats = z.infer<typeof NodesExtendedMemoryStats>

export const NodesFileSystemTotal = z.object({
  available: z.string().describe('Total disk space available to this Java virtual machine on all file stores. Depending on OS or process level restrictions, this might appear less than `free`. This is the actual amount of free disk space the Elasticsearch node can utilise.').optional(),
  available_in_bytes: long.describe('Total number of bytes available to this Java virtual machine on all file stores. Depending on OS or process level restrictions, this might appear less than `free_in_bytes`. This is the actual amount of free disk space the Elasticsearch node can utilise.').optional(),
  free: z.string().describe('Total unallocated disk space in all file stores.').optional(),
  free_in_bytes: long.describe('Total number of unallocated bytes in all file stores.').optional(),
  total: z.string().describe('Total size of all file stores.').optional(),
  total_in_bytes: long.describe('Total size of all file stores in bytes.').optional()
}).meta({ id: 'NodesFileSystemTotal' })
export type NodesFileSystemTotal = z.infer<typeof NodesFileSystemTotal>

export const NodesIoStatDevice = z.object({
  device_name: z.string().describe('The Linux device name.').optional(),
  operations: long.describe('The total number of read and write operations for the device completed since starting Elasticsearch.').optional(),
  read_kilobytes: long.describe('The total number of kilobytes read for the device since starting Elasticsearch.').optional(),
  read_operations: long.describe('The total number of read operations for the device completed since starting Elasticsearch.').optional(),
  write_kilobytes: long.describe('The total number of kilobytes written for the device since starting Elasticsearch.').optional(),
  write_operations: long.describe('The total number of write operations for the device completed since starting Elasticsearch.').optional()
}).meta({ id: 'NodesIoStatDevice' })
export type NodesIoStatDevice = z.infer<typeof NodesIoStatDevice>

export const NodesIoStats = z.object({
  devices: z.array(NodesIoStatDevice).describe('Array of disk metrics for each device that is backing an Elasticsearch data path. These disk metrics are probed periodically and averages between the last probe and the current probe are computed.').optional(),
  total: NodesIoStatDevice.describe('The sum of the disk metrics for all devices that back an Elasticsearch data path.').optional()
}).meta({ id: 'NodesIoStats' })
export type NodesIoStats = z.infer<typeof NodesIoStats>

export const NodesFileSystem = z.object({
  data: z.array(NodesDataPathStats).describe('List of all file stores.').optional(),
  timestamp: long.describe('Last time the file stores statistics were refreshed. Recorded in milliseconds since the Unix Epoch.').optional(),
  total: NodesFileSystemTotal.describe('Contains statistics for all file stores of the node.').optional(),
  io_stats: NodesIoStats.describe('Contains I/O statistics for the node.').optional()
}).meta({ id: 'NodesFileSystem' })
export type NodesFileSystem = z.infer<typeof NodesFileSystem>

export const NodesGarbageCollectorTotal = z.object({
  collection_count: long.describe('Total number of JVM garbage collectors that collect objects.').optional(),
  collection_time: z.string().describe('Total time spent by JVM collecting objects.').optional(),
  collection_time_in_millis: long.describe('Total time, in milliseconds, spent by JVM collecting objects.').optional()
}).meta({ id: 'NodesGarbageCollectorTotal' })
export type NodesGarbageCollectorTotal = z.infer<typeof NodesGarbageCollectorTotal>

export const NodesGarbageCollector = z.object({
  collectors: z.record(z.string(), NodesGarbageCollectorTotal).describe('Contains statistics about JVM garbage collectors for the node.').optional()
}).meta({ id: 'NodesGarbageCollector' })
export type NodesGarbageCollector = z.infer<typeof NodesGarbageCollector>

export const NodesHttp = z.object({
  current_open: integer.describe('Current number of open HTTP connections for the node.').optional(),
  total_opened: long.describe('Total number of HTTP connections opened for the node.').optional(),
  clients: z.array(NodesClient).describe('Information on current and recently-closed HTTP client connections. Clients that have been closed longer than the `http.client_stats.closed_channels.max_age` setting will not be represented here.').optional()
}).meta({ id: 'NodesHttp' })
export type NodesHttp = z.infer<typeof NodesHttp>

export const NodesPressureMemory = z.object({
  all: ByteSize.describe('Memory consumed by indexing requests in the coordinating, primary, or replica stage.').optional(),
  all_in_bytes: long.describe('Memory consumed, in bytes, by indexing requests in the coordinating, primary, or replica stage.').optional(),
  combined_coordinating_and_primary: ByteSize.describe('Memory consumed by indexing requests in the coordinating or primary stage. This value is not the sum of coordinating and primary as a node can reuse the coordinating memory if the primary stage is executed locally.').optional(),
  combined_coordinating_and_primary_in_bytes: long.describe('Memory consumed, in bytes, by indexing requests in the coordinating or primary stage. This value is not the sum of coordinating and primary as a node can reuse the coordinating memory if the primary stage is executed locally.').optional(),
  coordinating: ByteSize.describe('Memory consumed by indexing requests in the coordinating stage.').optional(),
  coordinating_in_bytes: long.describe('Memory consumed, in bytes, by indexing requests in the coordinating stage.').optional(),
  primary: ByteSize.describe('Memory consumed by indexing requests in the primary stage.').optional(),
  primary_in_bytes: long.describe('Memory consumed, in bytes, by indexing requests in the primary stage.').optional(),
  replica: ByteSize.describe('Memory consumed by indexing requests in the replica stage.').optional(),
  replica_in_bytes: long.describe('Memory consumed, in bytes, by indexing requests in the replica stage.').optional(),
  coordinating_rejections: long.describe('Number of indexing requests rejected in the coordinating stage.').optional(),
  primary_rejections: long.describe('Number of indexing requests rejected in the primary stage.').optional(),
  replica_rejections: long.describe('Number of indexing requests rejected in the replica stage.').optional(),
  primary_document_rejections: long.optional(),
  large_operation_rejections: long.optional()
}).meta({ id: 'NodesPressureMemory' })
export type NodesPressureMemory = z.infer<typeof NodesPressureMemory>

export const NodesIndexingPressureMemory = z.object({
  limit: ByteSize.describe('Configured memory limit for the indexing requests. Replica requests have an automatic limit that is 1.5x this value.').optional(),
  limit_in_bytes: long.describe('Configured memory limit, in bytes, for the indexing requests. Replica requests have an automatic limit that is 1.5x this value.').optional(),
  current: NodesPressureMemory.describe('Contains statistics for current indexing load.').optional(),
  total: NodesPressureMemory.describe('Contains statistics for the cumulative indexing load since the node started.').optional()
}).meta({ id: 'NodesIndexingPressureMemory' })
export type NodesIndexingPressureMemory = z.infer<typeof NodesIndexingPressureMemory>

export const NodesIndexingPressure = z.object({
  memory: NodesIndexingPressureMemory.describe('Contains statistics for memory consumption from indexing load.').optional()
}).meta({ id: 'NodesIndexingPressure' })
export type NodesIndexingPressure = z.infer<typeof NodesIndexingPressure>

export const NodesProcessor = z.object({
  count: long.describe('Number of documents transformed by the processor.').optional(),
  current: long.describe('Number of documents currently being transformed by the processor.').optional(),
  failed: long.describe('Number of failed operations for the processor.').optional(),
  time_in_millis: DurationValue.describe('Time, in milliseconds, spent by the processor transforming documents.').optional()
}).meta({ id: 'NodesProcessor' })
export type NodesProcessor = z.infer<typeof NodesProcessor>

export const NodesKeyedProcessor = z.object({
  stats: NodesProcessor.optional(),
  type: z.string().optional()
}).meta({ id: 'NodesKeyedProcessor' })
export type NodesKeyedProcessor = z.infer<typeof NodesKeyedProcessor>

export const NodesIngestStats = z.object({
  count: long.describe('Total number of documents ingested during the lifetime of this node.'),
  current: long.describe('Total number of documents currently being ingested.'),
  failed: long.describe('Total number of failed ingest operations during the lifetime of this node.'),
  processors: z.array(z.record(z.string(), NodesKeyedProcessor)).describe('Total number of ingest processors.'),
  time_in_millis: DurationValue.describe('Total time, in milliseconds, spent preprocessing ingest documents during the lifetime of this node.'),
  ingested_as_first_pipeline_in_bytes: long.describe('Total number of bytes of all documents ingested by the pipeline. This field is only present on pipelines which are the first to process a document. Thus, it is not present on pipelines which only serve as a final pipeline after a default pipeline, a pipeline run after a reroute processor, or pipelines in pipeline processors.'),
  produced_as_first_pipeline_in_bytes: long.describe('Total number of bytes of all documents produced by the pipeline. This field is only present on pipelines which are the first to process a document. Thus, it is not present on pipelines which only serve as a final pipeline after a default pipeline, a pipeline run after a reroute processor, or pipelines in pipeline processors. In situations where there are subsequent pipelines, the value represents the size of the document after all pipelines have run.')
}).meta({ id: 'NodesIngestStats' })
export type NodesIngestStats = z.infer<typeof NodesIngestStats>

export const NodesIngestTotal = z.object({
  count: long.describe('Total number of documents ingested during the lifetime of this node.'),
  current: long.describe('Total number of documents currently being ingested.'),
  failed: long.describe('Total number of failed ingest operations during the lifetime of this node.'),
  time_in_millis: DurationValue.describe('Total time, in milliseconds, spent preprocessing ingest documents during the lifetime of this node.')
}).meta({ id: 'NodesIngestTotal' })
export type NodesIngestTotal = z.infer<typeof NodesIngestTotal>

export const NodesIngest = z.object({
  pipelines: z.record(z.string(), NodesIngestStats).describe('Contains statistics about ingest pipelines for the node.').optional(),
  total: NodesIngestTotal.describe('Contains statistics about ingest operations for the node.').optional()
}).meta({ id: 'NodesIngest' })
export type NodesIngest = z.infer<typeof NodesIngest>

export const NodesNodeBufferPool = z.object({
  count: long.describe('Number of buffer pools.').optional(),
  total_capacity: z.string().describe('Total capacity of buffer pools.').optional(),
  total_capacity_in_bytes: long.describe('Total capacity of buffer pools in bytes.').optional(),
  used: z.string().describe('Size of buffer pools.').optional(),
  used_in_bytes: long.describe('Size of buffer pools in bytes.').optional()
}).meta({ id: 'NodesNodeBufferPool' })
export type NodesNodeBufferPool = z.infer<typeof NodesNodeBufferPool>

export const NodesJvmClasses = z.object({
  current_loaded_count: long.describe('Number of classes currently loaded by JVM.').optional(),
  total_loaded_count: long.describe('Total number of classes loaded since the JVM started.').optional(),
  total_unloaded_count: long.describe('Total number of classes unloaded since the JVM started.').optional()
}).meta({ id: 'NodesJvmClasses' })
export type NodesJvmClasses = z.infer<typeof NodesJvmClasses>

export const NodesPool = z.object({
  used_in_bytes: long.describe('Memory, in bytes, used by the heap.').optional(),
  max_in_bytes: long.describe('Maximum amount of memory, in bytes, available for use by the heap.').optional(),
  peak_used_in_bytes: long.describe('Largest amount of memory, in bytes, historically used by the heap.').optional(),
  peak_max_in_bytes: long.describe('Largest amount of memory, in bytes, historically used by the heap.').optional()
}).meta({ id: 'NodesPool' })
export type NodesPool = z.infer<typeof NodesPool>

export const NodesJvmMemoryStats = z.object({
  heap_used_in_bytes: long.describe('Memory, in bytes, currently in use by the heap.').optional(),
  heap_used_percent: long.describe('Percentage of memory currently in use by the heap.').optional(),
  heap_committed_in_bytes: long.describe('Amount of memory, in bytes, available for use by the heap.').optional(),
  heap_max_in_bytes: long.describe('Maximum amount of memory, in bytes, available for use by the heap.').optional(),
  heap_max: ByteSize.describe('Maximum amount of memory, available for use by the heap.').optional(),
  non_heap_used_in_bytes: long.describe('Non-heap memory used, in bytes.').optional(),
  non_heap_committed_in_bytes: long.describe('Amount of non-heap memory available, in bytes.').optional(),
  pools: z.record(z.string(), NodesPool).describe('Contains statistics about heap memory usage for the node.').optional()
}).meta({ id: 'NodesJvmMemoryStats' })
export type NodesJvmMemoryStats = z.infer<typeof NodesJvmMemoryStats>

export const NodesJvmThreads = z.object({
  count: long.describe('Number of active threads in use by JVM.').optional(),
  peak_count: long.describe('Highest number of threads used by JVM.').optional()
}).meta({ id: 'NodesJvmThreads' })
export type NodesJvmThreads = z.infer<typeof NodesJvmThreads>

export const NodesJvm = z.object({
  buffer_pools: z.record(z.string(), NodesNodeBufferPool).describe('Contains statistics about JVM buffer pools for the node.').optional(),
  classes: NodesJvmClasses.describe('Contains statistics about classes loaded by JVM for the node.').optional(),
  gc: NodesGarbageCollector.describe('Contains statistics about JVM garbage collectors for the node.').optional(),
  mem: NodesJvmMemoryStats.describe('Contains JVM memory usage statistics for the node.').optional(),
  threads: NodesJvmThreads.describe('Contains statistics about JVM thread usage for the node.').optional(),
  timestamp: long.describe('Last time JVM statistics were refreshed.').optional(),
  uptime: z.string().describe('Human-readable JVM uptime. Only returned if the `human` query parameter is `true`.').optional(),
  uptime_in_millis: long.describe('JVM uptime in milliseconds.').optional()
}).meta({ id: 'NodesJvm' })
export type NodesJvm = z.infer<typeof NodesJvm>

export const NodesNodesResponseBase = z.object({
  node_stats: NodeStatistics.describe('Contains statistics about the number of nodes selected by the request’s node filters.').optional()
}).meta({ id: 'NodesNodesResponseBase' })
export type NodesNodesResponseBase = z.infer<typeof NodesNodesResponseBase>

export const NodesOperatingSystem = z.object({
  cpu: NodesCpu.optional(),
  mem: NodesExtendedMemoryStats.optional(),
  swap: NodesMemoryStats.optional(),
  cgroup: NodesCgroup.optional(),
  timestamp: long.optional()
}).meta({ id: 'NodesOperatingSystem' })
export type NodesOperatingSystem = z.infer<typeof NodesOperatingSystem>

export const NodesProcess = z.object({
  cpu: NodesCpu.describe('Contains CPU statistics for the node.').optional(),
  mem: NodesMemoryStats.describe('Contains virtual memory statistics for the node.').optional(),
  open_file_descriptors: integer.describe('Number of opened file descriptors associated with the current or `-1` if not supported.').optional(),
  max_file_descriptors: integer.describe('Maximum number of file descriptors allowed on the system, or `-1` if not supported.').optional(),
  timestamp: long.describe('Last time the statistics were refreshed. Recorded in milliseconds since the Unix Epoch.').optional()
}).meta({ id: 'NodesProcess' })
export type NodesProcess = z.infer<typeof NodesProcess>

export const NodesScriptCache = z.object({
  cache_evictions: long.describe('Total number of times the script cache has evicted old data.').optional(),
  compilation_limit_triggered: long.describe('Total number of times the script compilation circuit breaker has limited inline script compilations.').optional(),
  compilations: long.describe('Total number of inline script compilations performed by the node.').optional(),
  context: z.string().optional()
}).meta({ id: 'NodesScriptCache' })
export type NodesScriptCache = z.infer<typeof NodesScriptCache>

export const NodesScripting = z.object({
  cache_evictions: long.describe('Total number of times the script cache has evicted old data.').optional(),
  compilations: long.describe('Total number of inline script compilations performed by the node.').optional(),
  compilations_history: z.record(z.string(), long).describe('Contains this recent history of script compilations.').optional(),
  compilation_limit_triggered: long.describe('Total number of times the script compilation circuit breaker has limited inline script compilations.').optional(),
  contexts: z.array(NodesContext).optional()
}).meta({ id: 'NodesScripting' })
export type NodesScripting = z.infer<typeof NodesScripting>

export const NodesThreadCount = z.object({
  active: long.describe('Number of active threads in the thread pool.').optional(),
  completed: long.describe('Number of tasks completed by the thread pool executor.').optional(),
  largest: long.describe('Highest number of active threads in the thread pool.').optional(),
  queue: long.describe('Number of tasks in queue for the thread pool.').optional(),
  rejected: long.describe('Number of tasks rejected by the thread pool executor.').optional(),
  threads: long.describe('Number of threads in the thread pool.').optional()
}).meta({ id: 'NodesThreadCount' })
export type NodesThreadCount = z.infer<typeof NodesThreadCount>

export const NodesTransportHistogram = z.object({
  count: long.describe('The number of times a transport thread took a period of time within the bounds of this bucket to handle an inbound message.').optional(),
  lt_millis: long.describe('The exclusive upper bound of the bucket in milliseconds. May be omitted on the last bucket if this bucket has no upper bound.').optional(),
  ge_millis: long.describe('The inclusive lower bound of the bucket in milliseconds. May be omitted on the first bucket if this bucket has no lower bound.').optional()
}).meta({ id: 'NodesTransportHistogram' })
export type NodesTransportHistogram = z.infer<typeof NodesTransportHistogram>

export const NodesTransport = z.object({
  inbound_handling_time_histogram: z.array(NodesTransportHistogram).describe('The distribution of the time spent handling each inbound message on a transport thread, represented as a histogram.').optional(),
  outbound_handling_time_histogram: z.array(NodesTransportHistogram).describe('The distribution of the time spent sending each outbound transport message on a transport thread, represented as a histogram.').optional(),
  rx_count: long.describe('Total number of RX (receive) packets received by the node during internal cluster communication.').optional(),
  rx_size: z.string().describe('Size of RX packets received by the node during internal cluster communication.').optional(),
  rx_size_in_bytes: long.describe('Size, in bytes, of RX packets received by the node during internal cluster communication.').optional(),
  server_open: integer.describe('Current number of inbound TCP connections used for internal communication between nodes.').optional(),
  tx_count: long.describe('Total number of TX (transmit) packets sent by the node during internal cluster communication.').optional(),
  tx_size: z.string().describe('Size of TX packets sent by the node during internal cluster communication.').optional(),
  tx_size_in_bytes: long.describe('Size, in bytes, of TX packets sent by the node during internal cluster communication.').optional(),
  total_outbound_connections: long.describe('The cumulative number of outbound transport connections that this node has opened since it started. Each transport connection may comprise multiple TCP connections but is only counted once in this statistic. Transport connections are typically long-lived so this statistic should remain constant in a stable cluster.').optional()
}).meta({ id: 'NodesTransport' })
export type NodesTransport = z.infer<typeof NodesTransport>

export const NodesStats = z.object({
  adaptive_selection: z.record(z.string(), NodesAdaptiveSelection).describe('Statistics about adaptive replica selection.').optional(),
  breakers: z.record(z.string(), NodesBreaker).describe('Statistics about the field data circuit breaker.').optional(),
  fs: NodesFileSystem.describe('File system information, data path, free disk space, read/write stats.').optional(),
  host: Host.describe('Network host for the node, based on the network host setting.').optional(),
  http: NodesHttp.describe('HTTP connection information.').optional(),
  ingest: NodesIngest.describe('Statistics about ingest preprocessing.').optional(),
  ip: z.union([Ip, z.array(Ip)]).describe('IP address and port for the node.').optional(),
  jvm: NodesJvm.describe('JVM stats, memory pool information, garbage collection, buffer pools, number of loaded/unloaded classes.').optional(),
  name: Name.describe('Human-readable identifier for the node. Based on the node name setting.').optional(),
  os: NodesOperatingSystem.describe('Operating system stats, load average, mem, swap.').optional(),
  process: NodesProcess.describe('Process statistics, memory consumption, cpu usage, open file descriptors.').optional(),
  roles: NodeRoles.describe('Roles assigned to the node.').optional(),
  script: NodesScripting.describe('Contains script statistics for the node.').optional(),
  script_cache: z.record(z.string(), z.union([NodesScriptCache, z.array(NodesScriptCache)])).optional(),
  thread_pool: z.record(z.string(), NodesThreadCount).describe('Statistics about each thread pool, including current size, queue and rejected tasks.').optional(),
  timestamp: long.optional(),
  transport: NodesTransport.describe('Transport statistics about sent and received bytes in cluster communication.').optional(),
  transport_address: TransportAddress.describe('Host and port for the transport layer, used for internal communication between nodes in a cluster.').optional(),
  attributes: z.record(Field, z.string()).describe('Contains a list of attributes for the node.').optional(),
  discovery: NodesDiscovery.describe('Contains node discovery statistics for the node.').optional(),
  indexing_pressure: NodesIndexingPressure.describe('Contains indexing pressure statistics for the node.').optional(),
  indices: z.lazy(() => IndicesStatsShardStats).describe('Indices stats about size, document count, indexing and deletion times, search times, field cache size, merges and flushes.').optional()
}).meta({ id: 'NodesStats' })
export type NodesStats = z.infer<typeof NodesStats>

export const NodesStatsNodeStatsMetric = z.enum(['_all', '_none', 'indices', 'os', 'process', 'jvm', 'thread_pool', 'fs', 'transport', 'http', 'breaker', 'script', 'discovery', 'ingest', 'adaptive_selection', 'script_cache', 'indexing_pressure', 'repositories', 'allocations']).meta({ id: 'NodesStatsNodeStatsMetric' })
export type NodesStatsNodeStatsMetric = z.infer<typeof NodesStatsNodeStatsMetric>

export const NodesStatsNodeStatsMetrics = z.union([NodesStatsNodeStatsMetric, z.array(NodesStatsNodeStatsMetric)]).meta({ id: 'NodesStatsNodeStatsMetrics' })
export type NodesStatsNodeStatsMetrics = z.infer<typeof NodesStatsNodeStatsMetrics>

/**
 * Get node statistics.
 *
 * Get statistics for nodes in a cluster.
 * By default, all stats are returned. You can limit the returned information by using metrics.
 */
export const NodesStatsRequest = z.object({
  ...RequestBase.shape,
  node_id: NodeIds.describe('Comma-separated list of node IDs or names used to limit returned information.').optional().meta({ found_in: 'path' }),
  metric: NodesStatsNodeStatsMetrics.describe('Limits the information returned to the specific metrics.').optional().meta({ found_in: 'path' }),
  index_metric: CommonStatsFlags.describe('Limit the information returned for indices metric to the specific index metrics. It can be used only if indices (or all) metric is specified.').optional().meta({ found_in: 'path' }),
  completion_fields: Fields.describe('Comma-separated list or wildcard expressions of fields to include in fielddata and suggest statistics.').optional().meta({ found_in: 'query' }),
  fielddata_fields: Fields.describe('Comma-separated list or wildcard expressions of fields to include in fielddata statistics.').optional().meta({ found_in: 'query' }),
  fields: Fields.describe('Comma-separated list or wildcard expressions of fields to include in the statistics.').optional().meta({ found_in: 'query' }),
  groups: z.boolean().describe('Comma-separated list of search groups to include in the search statistics.').optional().meta({ found_in: 'query' }),
  include_segment_file_sizes: z.boolean().describe('If true, the call reports the aggregated disk usage of each one of the Lucene index files (only applies if segment stats are requested).').optional().meta({ found_in: 'query' }),
  level: NodeStatsLevel.describe('Indicates whether statistics are aggregated at the node, indices, or shards level.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  types: z.array(z.string()).describe('A comma-separated list of document types for the indexing index metric.').optional().meta({ found_in: 'query' }),
  include_unloaded_segments: z.boolean().describe('If `true`, the response includes information from segments that are not loaded into memory.').optional().meta({ found_in: 'query' })
}).meta({ id: 'NodesStatsRequest' })
export type NodesStatsRequest = z.infer<typeof NodesStatsRequest>

export const NodesStatsResponseBase = z.object({
  ...NodesNodesResponseBase.shape,
  cluster_name: Name.optional(),
  nodes: z.record(z.string(), NodesStats)
}).meta({ id: 'NodesStatsResponseBase' })
export type NodesStatsResponseBase = z.infer<typeof NodesStatsResponseBase>

export const NodesStatsResponse = NodesStatsResponseBase.meta({ id: 'NodesStatsResponse' })
export type NodesStatsResponse = z.infer<typeof NodesStatsResponse>
