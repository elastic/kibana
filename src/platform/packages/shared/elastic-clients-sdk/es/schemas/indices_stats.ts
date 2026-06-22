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

export const ExpandWildcard = z.enum(['all', 'open', 'closed', 'hidden', 'none']).meta({ id: 'ExpandWildcard' })
export type ExpandWildcard = z.infer<typeof ExpandWildcard>

export const ExpandWildcards = z.union([ExpandWildcard, z.array(ExpandWildcard)]).meta({ id: 'ExpandWildcards' })
export type ExpandWildcards = z.infer<typeof ExpandWildcards>

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

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const Level = z.enum(['cluster', 'indices', 'shards']).meta({ id: 'Level' })
export type Level = z.infer<typeof Level>

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

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

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

/**
 * Get index statistics.
 *
 * For data streams, the API retrieves statistics for the stream's backing indices.
 *
 * By default, the returned statistics are index-level with `primaries` and `total` aggregations.
 * `primaries` are the values for only the primary shards.
 * `total` are the accumulated values for both primary and replica shards.
 *
 * To get shard-level statistics, set the `level` parameter to `shards`.
 *
 * NOTE: When moving to another node, the shard-level statistics for a shard are cleared.
 * Although the shard is no longer part of the node, that node retains any node-level statistics to which the shard contributed.
 */
export const IndicesStatsRequest = z.object({
  ...RequestBase.shape,
  metric: CommonStatsFlags.describe('Comma-separated list of metrics used to limit the request.').optional().meta({ found_in: 'path' }),
  index: Indices.describe('A comma-separated list of index names; use `_all` or empty string to perform the operation on all indices').optional().meta({ found_in: 'path' }),
  completion_fields: Fields.describe('Comma-separated list or wildcard expressions of fields to include in fielddata and suggest statistics.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  fielddata_fields: Fields.describe('Comma-separated list or wildcard expressions of fields to include in fielddata statistics.').optional().meta({ found_in: 'query' }),
  fields: Fields.describe('Comma-separated list or wildcard expressions of fields to include in the statistics.').optional().meta({ found_in: 'query' }),
  forbid_closed_indices: z.boolean().describe('If true, statistics are not collected from closed indices.').optional().meta({ found_in: 'query' }),
  groups: z.union([z.string(), z.array(z.string())]).describe('Comma-separated list of search groups to include in the search statistics.').optional().meta({ found_in: 'query' }),
  include_segment_file_sizes: z.boolean().describe('If true, the call reports the aggregated disk usage of each one of the Lucene index files (only applies if segment stats are requested).').optional().meta({ found_in: 'query' }),
  include_unloaded_segments: z.boolean().describe('If true, the response includes information from segments that are not loaded into memory.').optional().meta({ found_in: 'query' }),
  level: Level.describe('Indicates whether statistics are aggregated at the cluster, indices, or shards level.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesStatsRequest' })
export type IndicesStatsRequest = z.infer<typeof IndicesStatsRequest>

export const IndicesStatsResponse = z.object({
  indices: z.record(z.string(), z.lazy(() => IndicesStatsIndicesStats)).optional(),
  _shards: ShardStatistics,
  _all: z.lazy(() => IndicesStatsIndicesStats)
}).meta({ id: 'IndicesStatsResponse' })
export type IndicesStatsResponse = z.infer<typeof IndicesStatsResponse>
