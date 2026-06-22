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

export const ByteSize = z.union([long, z.string()]).meta({ id: 'ByteSize' })
export type ByteSize = z.infer<typeof ByteSize>

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

export const DateFormat = z.string().meta({ id: 'DateFormat' })
export type DateFormat = z.infer<typeof DateFormat>

export const DocStats = z.object({
  count: long.describe('Total number of non-deleted documents across all primary shards assigned to selected nodes. This number is based on documents in Lucene segments and may include documents from nested fields.'),
  deleted: long.describe('Total number of deleted documents across all primary shards assigned to selected nodes. This number is based on documents in Lucene segments. Elasticsearch reclaims the disk space of deleted Lucene documents when a segment is merged.').optional(),
  total_size_in_bytes: long.describe('Returns the total size in bytes of all documents in this stats. This value may be more reliable than store_stats.size_in_bytes in estimating the index size.'),
  total_size: ByteSize.describe('Human readable total_size_in_bytes').optional()
}).meta({ id: 'DocStats' })
export type DocStats = z.infer<typeof DocStats>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

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

export const HealthStatus = z.enum(['green', 'GREEN', 'yellow', 'YELLOW', 'red', 'RED', 'unknown', 'unavailable']).meta({ id: 'HealthStatus' })
export type HealthStatus = z.infer<typeof HealthStatus>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const NodeIds = z.union([NodeId, z.array(NodeId)]).meta({ id: 'NodeIds' })
export type NodeIds = z.infer<typeof NodeIds>

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

export const VersionString = z.string().meta({ id: 'VersionString' })
export type VersionString = z.infer<typeof VersionString>

export const PluginStats = z.object({
  classname: z.string(),
  description: z.string(),
  elasticsearch_version: VersionString,
  extended_plugins: z.array(z.string()),
  has_native_controller: z.boolean(),
  java_version: VersionString,
  name: Name,
  version: VersionString,
  licensed: z.boolean()
}).meta({ id: 'PluginStats' })
export type PluginStats = z.infer<typeof PluginStats>

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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

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

export const StoreStats = z.object({
  size: ByteSize.describe('Total size of all shards assigned to selected nodes.').optional(),
  size_in_bytes: long.describe('Total size, in bytes, of all shards assigned to selected nodes.'),
  reserved: ByteSize.describe('A prediction of how much larger the shard stores will eventually grow due to ongoing peer recoveries, restoring snapshots, and similar activities.').optional(),
  reserved_in_bytes: long.describe('A prediction, in bytes, of how much larger the shard stores will eventually grow due to ongoing peer recoveries, restoring snapshots, and similar activities.'),
  total_data_set_size: ByteSize.describe('Total data set size of all shards assigned to selected nodes. This includes the size of shards not stored fully on the nodes, such as the cache for partially mounted indices.').optional(),
  total_data_set_size_in_bytes: long.describe('Total data set size, in bytes, of all shards assigned to selected nodes. This includes the size of shards not stored fully on the nodes, such as the cache for partially mounted indices.').optional()
}).meta({ id: 'StoreStats' })
export type StoreStats = z.infer<typeof StoreStats>

export const Uuid = z.string().meta({ id: 'Uuid' })
export type Uuid = z.infer<typeof Uuid>

export const double = z.number().meta({ id: 'double' })
export type double = z.infer<typeof double>

export const ClusterStatsRemoteClusterInfo = z.object({
  cluster_uuid: z.string().describe('The UUID of the remote cluster.'),
  mode: z.string().describe('The connection mode used to communicate with the remote cluster.'),
  skip_unavailable: z.boolean().describe('The `skip_unavailable` setting used for this remote cluster.'),
  'transport.compress': z.string().describe('Transport compression setting used for this remote cluster.'),
  status: HealthStatus.describe('Health status of the cluster, based on the state of its primary and replica shards.'),
  version: z.array(VersionString).describe('The list of Elasticsearch versions used by the nodes on the remote cluster.'),
  nodes_count: integer.describe('The total count of nodes in the remote cluster.'),
  shards_count: integer.describe('The total number of shards in the remote cluster.'),
  indices_count: integer.describe('The total number of indices in the remote cluster.'),
  indices_total_size_in_bytes: long.describe('Total data set size, in bytes, of all shards assigned to selected nodes.'),
  indices_total_size: z.string().describe('Total data set size of all shards assigned to selected nodes, as a human-readable string.').optional(),
  max_heap_in_bytes: long.describe('Maximum amount of memory, in bytes, available for use by the heap across the nodes of the remote cluster.'),
  max_heap: z.string().describe('Maximum amount of memory available for use by the heap across the nodes of the remote cluster, as a human-readable string.').optional(),
  mem_total_in_bytes: long.describe('Total amount, in bytes, of physical memory across the nodes of the remote cluster.'),
  mem_total: z.string().describe('Total amount of physical memory across the nodes of the remote cluster, as a human-readable string.').optional()
}).meta({ id: 'ClusterStatsRemoteClusterInfo' })
export type ClusterStatsRemoteClusterInfo = z.infer<typeof ClusterStatsRemoteClusterInfo>

export const ClusterStatsCCSUsageTimeValue = z.object({
  max: DurationValue.describe('The maximum time taken to execute a request, in milliseconds.'),
  avg: DurationValue.describe('The average time taken to execute a request, in milliseconds.'),
  p90: DurationValue.describe('The 90th percentile of the time taken to execute requests, in milliseconds.')
}).meta({ id: 'ClusterStatsCCSUsageTimeValue' })
export type ClusterStatsCCSUsageTimeValue = z.infer<typeof ClusterStatsCCSUsageTimeValue>

export const ClusterStatsCCSUsageClusterStats = z.object({
  total: integer.describe('The total number of successful (not skipped) cross-cluster search requests that were executed against this cluster. This may include requests where partial results were returned, but not requests in which the cluster has been skipped entirely.'),
  skipped: integer.describe('The total number of cross-cluster search requests for which this cluster was skipped.'),
  took: ClusterStatsCCSUsageTimeValue.describe('Statistics about the time taken to execute requests against this cluster.')
}).meta({ id: 'ClusterStatsCCSUsageClusterStats' })
export type ClusterStatsCCSUsageClusterStats = z.infer<typeof ClusterStatsCCSUsageClusterStats>

export const ClusterStatsCCSUsageStats = z.object({
  total: integer.describe('The total number of cross-cluster search requests that have been executed by the cluster.'),
  success: integer.describe('The total number of cross-cluster search requests that have been successfully executed by the cluster.'),
  skipped: integer.describe('The total number of cross-cluster search requests (successful or failed) that had at least one remote cluster skipped.'),
  took: ClusterStatsCCSUsageTimeValue.describe('Statistics about the time taken to execute cross-cluster search requests.'),
  took_mrt_true: ClusterStatsCCSUsageTimeValue.describe('Statistics about the time taken to execute cross-cluster search requests for which the `ccs_minimize_roundtrips` setting was set to `true`.').optional(),
  took_mrt_false: ClusterStatsCCSUsageTimeValue.describe('Statistics about the time taken to execute cross-cluster search requests for which the `ccs_minimize_roundtrips` setting was set to `false`.').optional(),
  remotes_per_search_max: integer.describe('The maximum number of remote clusters that were queried in a single cross-cluster search request.'),
  remotes_per_search_avg: double.describe('The average number of remote clusters that were queried in a single cross-cluster search request.'),
  failure_reasons: z.record(z.string(), integer).describe('Statistics about the reasons for cross-cluster search request failures. The keys are the failure reason names and the values are the number of requests that failed for that reason.'),
  features: z.record(z.string(), integer).describe('The keys are the names of the search feature, and the values are the number of requests that used that feature. Single request can use more than one feature (e.g. both `async` and `wildcard`).'),
  clients: z.record(z.string(), integer).describe('Statistics about the clients that executed cross-cluster search requests. The keys are the names of the clients, and the values are the number of requests that were executed by that client. Only known clients (such as `kibana` or `elasticsearch`) are counted.'),
  clusters: z.record(z.string(), ClusterStatsCCSUsageClusterStats).describe('Statistics about the clusters that were queried in cross-cluster search requests. The keys are cluster names, and the values are per-cluster telemetry data. This also includes the local cluster itself, which uses the name `(local)`.')
}).meta({ id: 'ClusterStatsCCSUsageStats' })
export type ClusterStatsCCSUsageStats = z.infer<typeof ClusterStatsCCSUsageStats>

export const ClusterStatsCCSStats = z.object({
  clusters: z.record(z.string(), ClusterStatsRemoteClusterInfo).describe('Contains remote cluster settings and metrics collected from them. The keys are cluster names, and the values are per-cluster data. Only present if `include_remotes` option is set to true.').optional(),
  _search: ClusterStatsCCSUsageStats.describe('Information about cross-cluster search usage.'),
  _esql: ClusterStatsCCSUsageStats.describe('Information about ES|QL cross-cluster query usage.').optional()
}).meta({ id: 'ClusterStatsCCSStats' })
export type ClusterStatsCCSStats = z.infer<typeof ClusterStatsCCSStats>

export const ClusterStatsFieldTypes = z.object({
  name: Name.describe('The name for the field type in selected nodes.'),
  count: integer.describe('The number of occurrences of the field type in selected nodes.'),
  index_count: integer.describe('The number of indices containing the field type in selected nodes.'),
  indexed_vector_count: integer.describe('For dense_vector field types, number of indexed vector types in selected nodes.').optional(),
  indexed_vector_dim_max: integer.describe('For dense_vector field types, the maximum dimension of all indexed vector types in selected nodes.').optional(),
  indexed_vector_dim_min: integer.describe('For dense_vector field types, the minimum dimension of all indexed vector types in selected nodes.').optional(),
  script_count: integer.describe('The number of fields that declare a script.').optional(),
  vector_index_type_count: z.record(Name, integer).describe('For dense_vector field types, count of mappings by index type').optional(),
  vector_similarity_type_count: z.record(Name, integer).describe('For dense_vector field types, count of mappings by similarity').optional(),
  vector_element_type_count: z.record(Name, integer).describe('For dense_vector field types, count of mappings by element type').optional()
}).meta({ id: 'ClusterStatsFieldTypes' })
export type ClusterStatsFieldTypes = z.infer<typeof ClusterStatsFieldTypes>

export const ClusterStatsSynonymsStats = z.object({
  count: integer,
  index_count: integer
}).meta({ id: 'ClusterStatsSynonymsStats' })
export type ClusterStatsSynonymsStats = z.infer<typeof ClusterStatsSynonymsStats>

export const ClusterStatsCharFilterTypes = z.object({
  analyzer_types: z.array(ClusterStatsFieldTypes).describe('Contains statistics about analyzer types used in selected nodes.'),
  built_in_analyzers: z.array(ClusterStatsFieldTypes).describe('Contains statistics about built-in analyzers used in selected nodes.'),
  built_in_char_filters: z.array(ClusterStatsFieldTypes).describe('Contains statistics about built-in character filters used in selected nodes.'),
  built_in_filters: z.array(ClusterStatsFieldTypes).describe('Contains statistics about built-in token filters used in selected nodes.'),
  built_in_tokenizers: z.array(ClusterStatsFieldTypes).describe('Contains statistics about built-in tokenizers used in selected nodes.'),
  char_filter_types: z.array(ClusterStatsFieldTypes).describe('Contains statistics about character filter types used in selected nodes.'),
  filter_types: z.array(ClusterStatsFieldTypes).describe('Contains statistics about token filter types used in selected nodes.'),
  tokenizer_types: z.array(ClusterStatsFieldTypes).describe('Contains statistics about tokenizer types used in selected nodes.'),
  synonyms: z.record(Name, ClusterStatsSynonymsStats).describe('Contains statistics about synonyms types used in selected nodes.')
}).meta({ id: 'ClusterStatsCharFilterTypes' })
export type ClusterStatsCharFilterTypes = z.infer<typeof ClusterStatsCharFilterTypes>

export const ClusterStatsClusterFileSystem = z.object({
  path: z.string().optional(),
  mount: z.string().optional(),
  type: z.string().optional(),
  available_in_bytes: long.describe('Total number of bytes available to JVM in file stores across all selected nodes. Depending on operating system or process-level restrictions, this number may be less than `nodes.fs.free_in_byes`. This is the actual amount of free disk space the selected Elasticsearch nodes can use.').optional(),
  available: ByteSize.describe('Total number of bytes available to JVM in file stores across all selected nodes. Depending on operating system or process-level restrictions, this number may be less than `nodes.fs.free_in_byes`. This is the actual amount of free disk space the selected Elasticsearch nodes can use.').optional(),
  free_in_bytes: long.describe('Total number, in bytes, of unallocated bytes in file stores across all selected nodes.').optional(),
  free: ByteSize.describe('Total number of unallocated bytes in file stores across all selected nodes.').optional(),
  total_in_bytes: long.describe('Total size, in bytes, of all file stores across all selected nodes.').optional(),
  total: ByteSize.describe('Total size of all file stores across all selected nodes.').optional(),
  low_watermark_free_space: ByteSize.optional(),
  low_watermark_free_space_in_bytes: long.optional(),
  high_watermark_free_space: ByteSize.optional(),
  high_watermark_free_space_in_bytes: long.optional(),
  flood_stage_free_space: ByteSize.optional(),
  flood_stage_free_space_in_bytes: long.optional(),
  frozen_flood_stage_free_space: ByteSize.optional(),
  frozen_flood_stage_free_space_in_bytes: long.optional()
}).meta({ id: 'ClusterStatsClusterFileSystem' })
export type ClusterStatsClusterFileSystem = z.infer<typeof ClusterStatsClusterFileSystem>

export const ClusterStatsExtendedTextSimilarityRetrieverUsage = z.object({
  chunk_rescorer: long.optional()
}).meta({ id: 'ClusterStatsExtendedTextSimilarityRetrieverUsage' })
export type ClusterStatsExtendedTextSimilarityRetrieverUsage = z.infer<typeof ClusterStatsExtendedTextSimilarityRetrieverUsage>

export const ClusterStatsExtendedRetrieversSearchUsage = z.object({
  text_similarity_reranker: ClusterStatsExtendedTextSimilarityRetrieverUsage.optional()
}).meta({ id: 'ClusterStatsExtendedRetrieversSearchUsage' })
export type ClusterStatsExtendedRetrieversSearchUsage = z.infer<typeof ClusterStatsExtendedRetrieversSearchUsage>

export const ClusterStatsSortType = z.enum(['_doc', '_geo_distance', '_score', '_script', 'field_sort']).meta({ id: 'ClusterStatsSortType' })
export type ClusterStatsSortType = z.infer<typeof ClusterStatsSortType>

export const ClusterStatsExtendedSectionSearchUsage = z.object({
  sort: z.record(ClusterStatsSortType, long).optional()
}).meta({ id: 'ClusterStatsExtendedSectionSearchUsage' })
export type ClusterStatsExtendedSectionSearchUsage = z.infer<typeof ClusterStatsExtendedSectionSearchUsage>

export const ClusterStatsExtendedSearchUsage = z.object({
  retrievers: ClusterStatsExtendedRetrieversSearchUsage.optional(),
  section: ClusterStatsExtendedSectionSearchUsage.optional()
}).meta({ id: 'ClusterStatsExtendedSearchUsage' })
export type ClusterStatsExtendedSearchUsage = z.infer<typeof ClusterStatsExtendedSearchUsage>

export const ClusterStatsSearchUsageStats = z.object({
  total: long,
  queries: z.record(Name, long),
  rescorers: z.record(Name, long),
  sections: z.record(Name, long),
  retrievers: z.record(Name, long),
  extended: ClusterStatsExtendedSearchUsage
}).meta({ id: 'ClusterStatsSearchUsageStats' })
export type ClusterStatsSearchUsageStats = z.infer<typeof ClusterStatsSearchUsageStats>

export const ClusterStatsClusterShardMetrics = z.object({
  avg: double.describe('Mean number of shards in an index, counting only shards assigned to selected nodes.'),
  max: double.describe('Maximum number of shards in an index, counting only shards assigned to selected nodes.'),
  min: double.describe('Minimum number of shards in an index, counting only shards assigned to selected nodes.')
}).meta({ id: 'ClusterStatsClusterShardMetrics' })
export type ClusterStatsClusterShardMetrics = z.infer<typeof ClusterStatsClusterShardMetrics>

export const ClusterStatsClusterIndicesShardsIndex = z.object({
  primaries: ClusterStatsClusterShardMetrics.describe('Contains statistics about the number of primary shards assigned to selected nodes.'),
  replication: ClusterStatsClusterShardMetrics.describe('Contains statistics about the number of replication shards assigned to selected nodes.'),
  shards: ClusterStatsClusterShardMetrics.describe('Contains statistics about the number of shards assigned to selected nodes.')
}).meta({ id: 'ClusterStatsClusterIndicesShardsIndex' })
export type ClusterStatsClusterIndicesShardsIndex = z.infer<typeof ClusterStatsClusterIndicesShardsIndex>

/** Contains statistics about shards assigned to selected nodes. */
export const ClusterStatsClusterIndicesShards = z.object({
  index: ClusterStatsClusterIndicesShardsIndex.describe('Contains statistics about shards assigned to selected nodes.').optional(),
  primaries: double.describe('Number of primary shards assigned to selected nodes.').optional(),
  replication: double.describe('Ratio of replica shards to primary shards across all selected nodes.').optional(),
  total: double.describe('Total number of shards assigned to selected nodes.').optional()
}).meta({ id: 'ClusterStatsClusterIndicesShards' })
export type ClusterStatsClusterIndicesShards = z.infer<typeof ClusterStatsClusterIndicesShards>

export const ClusterStatsRuntimeFieldTypes = z.object({
  chars_max: integer.describe('Maximum number of characters for a single runtime field script.'),
  chars_total: integer.describe('Total number of characters for the scripts that define the current runtime field data type.'),
  count: integer.describe('Number of runtime fields mapped to the field data type in selected nodes.'),
  doc_max: integer.describe('Maximum number of accesses to doc_values for a single runtime field script'),
  doc_total: integer.describe('Total number of accesses to doc_values for the scripts that define the current runtime field data type.'),
  index_count: integer.describe('Number of indices containing a mapping of the runtime field data type in selected nodes.'),
  lang: z.array(z.string()).describe('Script languages used for the runtime fields scripts.'),
  lines_max: integer.describe('Maximum number of lines for a single runtime field script.'),
  lines_total: integer.describe('Total number of lines for the scripts that define the current runtime field data type.'),
  name: Name.describe('Field data type used in selected nodes.'),
  scriptless_count: integer.describe('Number of runtime fields that don’t declare a script.'),
  shadowed_count: integer.describe('Number of runtime fields that shadow an indexed field.'),
  source_max: integer.describe('Maximum number of accesses to _source for a single runtime field script.'),
  source_total: integer.describe('Total number of accesses to _source for the scripts that define the current runtime field data type.')
}).meta({ id: 'ClusterStatsRuntimeFieldTypes' })
export type ClusterStatsRuntimeFieldTypes = z.infer<typeof ClusterStatsRuntimeFieldTypes>

export const ClusterStatsFieldTypesMappings = z.object({
  field_types: z.array(ClusterStatsFieldTypes).describe('Contains statistics about field data types used in selected nodes.'),
  runtime_field_types: z.array(ClusterStatsRuntimeFieldTypes).describe('Contains statistics about runtime field data types used in selected nodes.'),
  total_field_count: long.describe('Total number of fields in all non-system indices.').optional(),
  total_deduplicated_field_count: long.describe('Total number of fields in all non-system indices, accounting for mapping deduplication.').optional(),
  total_deduplicated_mapping_size: ByteSize.describe('Total size of all mappings after deduplication and compression.').optional(),
  total_deduplicated_mapping_size_in_bytes: long.describe('Total size of all mappings, in bytes, after deduplication and compression.').optional(),
  source_modes: z.record(Name, integer).describe('Source mode usage count.')
}).meta({ id: 'ClusterStatsFieldTypesMappings' })
export type ClusterStatsFieldTypesMappings = z.infer<typeof ClusterStatsFieldTypesMappings>

export const ClusterStatsIndicesVersions = z.object({
  index_count: integer,
  primary_shard_count: integer,
  total_primary_bytes: long,
  total_primary_size: ByteSize.optional(),
  version: VersionString
}).meta({ id: 'ClusterStatsIndicesVersions' })
export type ClusterStatsIndicesVersions = z.infer<typeof ClusterStatsIndicesVersions>

export const ClusterStatsDenseVectorOffHeapStats = z.object({
  total_size_bytes: long,
  total_size: ByteSize.optional(),
  total_veb_size_bytes: long,
  total_veb_size: ByteSize.optional(),
  total_vec_size_bytes: long,
  total_vec_size: ByteSize.optional(),
  total_veq_size_bytes: long,
  total_veq_size: ByteSize.optional(),
  total_vex_size_bytes: long,
  total_vex_size: ByteSize.optional(),
  total_cenif_size_bytes: long,
  total_cenif_size: ByteSize.optional(),
  total_clivf_size_bytes: long,
  total_clivf_size: ByteSize.optional(),
  fielddata: z.record(z.string(), z.record(z.string(), long)).optional()
}).meta({ id: 'ClusterStatsDenseVectorOffHeapStats' })
export type ClusterStatsDenseVectorOffHeapStats = z.infer<typeof ClusterStatsDenseVectorOffHeapStats>

export const ClusterStatsDenseVectorStats = z.object({
  value_count: long,
  off_heap: ClusterStatsDenseVectorOffHeapStats.optional()
}).meta({ id: 'ClusterStatsDenseVectorStats' })
export type ClusterStatsDenseVectorStats = z.infer<typeof ClusterStatsDenseVectorStats>

export const ClusterStatsSparseVectorStats = z.object({
  value_count: long
}).meta({ id: 'ClusterStatsSparseVectorStats' })
export type ClusterStatsSparseVectorStats = z.infer<typeof ClusterStatsSparseVectorStats>

export const ClusterStatsClusterIndices = z.object({
  analysis: ClusterStatsCharFilterTypes.describe('Contains statistics about analyzers and analyzer components used in selected nodes.').optional(),
  completion: CompletionStats.describe('Contains statistics about memory used for completion in selected nodes.'),
  count: long.describe('Total number of indices with shards assigned to selected nodes.'),
  docs: DocStats.describe('Contains counts for documents in selected nodes.'),
  fielddata: FielddataStats.describe('Contains statistics about the field data cache of selected nodes.'),
  query_cache: QueryCacheStats.describe('Contains statistics about the query cache of selected nodes.'),
  search: ClusterStatsSearchUsageStats.describe('Holds a snapshot of the search usage statistics. Used to hold the stats for a single node that\'s part of a ClusterStatsNodeResponse, as well as to accumulate stats for the entire cluster and return them as part of the ClusterStatsResponse.'),
  segments: SegmentsStats.describe('Contains statistics about segments in selected nodes.'),
  shards: ClusterStatsClusterIndicesShards.describe('Contains statistics about indices with shards assigned to selected nodes.'),
  store: StoreStats.describe('Contains statistics about the size of shards assigned to selected nodes.'),
  mappings: ClusterStatsFieldTypesMappings.describe('Contains statistics about field mappings in selected nodes.').optional(),
  versions: z.array(ClusterStatsIndicesVersions).describe('Contains statistics about analyzers and analyzer components used in selected nodes.').optional(),
  dense_vector: ClusterStatsDenseVectorStats.describe('Contains statistics about indexed dense vector'),
  sparse_vector: ClusterStatsSparseVectorStats.describe('Contains statistics about indexed sparse vector')
}).meta({ id: 'ClusterStatsClusterIndices' })
export type ClusterStatsClusterIndices = z.infer<typeof ClusterStatsClusterIndices>

export const ClusterStatsClusterProcessor = z.object({
  count: long,
  current: long,
  failed: long,
  time: Duration.optional(),
  time_in_millis: DurationValue
}).meta({ id: 'ClusterStatsClusterProcessor' })
export type ClusterStatsClusterProcessor = z.infer<typeof ClusterStatsClusterProcessor>

export const ClusterStatsClusterIngest = z.object({
  number_of_pipelines: integer,
  processor_stats: z.record(z.string(), ClusterStatsClusterProcessor)
}).meta({ id: 'ClusterStatsClusterIngest' })
export type ClusterStatsClusterIngest = z.infer<typeof ClusterStatsClusterIngest>

export const ClusterStatsClusterJvmMemory = z.object({
  heap_max_in_bytes: long.describe('Maximum amount of memory, in bytes, available for use by the heap across all selected nodes.'),
  heap_max: ByteSize.describe('Maximum amount of memory available for use by the heap across all selected nodes.').optional(),
  heap_used_in_bytes: long.describe('Memory, in bytes, currently in use by the heap across all selected nodes.'),
  heap_used: ByteSize.describe('Memory currently in use by the heap across all selected nodes.').optional()
}).meta({ id: 'ClusterStatsClusterJvmMemory' })
export type ClusterStatsClusterJvmMemory = z.infer<typeof ClusterStatsClusterJvmMemory>

export const ClusterStatsClusterJvmVersion = z.object({
  bundled_jdk: z.boolean().describe('Always `true`. All distributions come with a bundled Java Development Kit (JDK).'),
  count: integer.describe('Total number of selected nodes using JVM.'),
  using_bundled_jdk: z.boolean().describe('If `true`, a bundled JDK is in use by JVM.'),
  version: VersionString.describe('Version of JVM used by one or more selected nodes.'),
  vm_name: z.string().describe('Name of the JVM.'),
  vm_vendor: z.string().describe('Vendor of the JVM.'),
  vm_version: VersionString.describe('Full version number of JVM. The full version number includes a plus sign (+) followed by the build number.')
}).meta({ id: 'ClusterStatsClusterJvmVersion' })
export type ClusterStatsClusterJvmVersion = z.infer<typeof ClusterStatsClusterJvmVersion>

export const ClusterStatsClusterJvm = z.object({
  max_uptime_in_millis: DurationValue.describe('Uptime duration, in milliseconds, since JVM last started.'),
  max_uptime: Duration.describe('Uptime duration since JVM last started.').optional(),
  mem: ClusterStatsClusterJvmMemory.describe('Contains statistics about memory used by selected nodes.'),
  threads: long.describe('Number of active threads in use by JVM across all selected nodes.'),
  versions: z.array(ClusterStatsClusterJvmVersion).describe('Contains statistics about the JVM versions used by selected nodes.')
}).meta({ id: 'ClusterStatsClusterJvm' })
export type ClusterStatsClusterJvm = z.infer<typeof ClusterStatsClusterJvm>

export const ClusterStatsClusterNetworkTypes = z.object({
  http_types: z.record(z.string(), integer).describe('Contains statistics about the HTTP network types used by selected nodes.'),
  transport_types: z.record(z.string(), integer).describe('Contains statistics about the transport network types used by selected nodes.')
}).meta({ id: 'ClusterStatsClusterNetworkTypes' })
export type ClusterStatsClusterNetworkTypes = z.infer<typeof ClusterStatsClusterNetworkTypes>

export const ClusterStatsClusterNodeCount = z.object({
  total: integer,
  coordinating_only: integer.optional(),
  data: integer.optional(),
  data_cold: integer.optional(),
  data_content: integer.optional(),
  data_frozen: integer.optional(),
  data_hot: integer.optional(),
  data_warm: integer.optional(),
  index: integer.optional(),
  ingest: integer.optional(),
  master: integer.optional(),
  ml: integer.optional(),
  remote_cluster_client: integer.optional(),
  search: integer.optional(),
  transform: integer.optional(),
  voting_only: integer.optional()
}).meta({ id: 'ClusterStatsClusterNodeCount' })
export type ClusterStatsClusterNodeCount = z.infer<typeof ClusterStatsClusterNodeCount>

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

export const ClusterStatsIndexingPressure = z.object({
  memory: NodesIndexingPressureMemory
}).meta({ id: 'ClusterStatsIndexingPressure' })
export type ClusterStatsIndexingPressure = z.infer<typeof ClusterStatsIndexingPressure>

export const ClusterStatsClusterOperatingSystemArchitecture = z.object({
  arch: z.string().describe('Name of an architecture used by one or more selected nodes.'),
  count: integer.describe('Number of selected nodes using the architecture.')
}).meta({ id: 'ClusterStatsClusterOperatingSystemArchitecture' })
export type ClusterStatsClusterOperatingSystemArchitecture = z.infer<typeof ClusterStatsClusterOperatingSystemArchitecture>

export const ClusterStatsOperatingSystemMemoryInfo = z.object({
  adjusted_total_in_bytes: long.describe('Total amount, in bytes, of memory across all selected nodes, but using the value specified using the `es.total_memory_bytes` system property instead of measured total memory for those nodes where that system property was set.').optional(),
  adjusted_total: ByteSize.describe('Total amount of memory across all selected nodes, but using the value specified using the `es.total_memory_bytes` system property instead of measured total memory for those nodes where that system property was set.').optional(),
  free_in_bytes: long.describe('Amount, in bytes, of free physical memory across all selected nodes.'),
  free: ByteSize.describe('Amount of free physical memory across all selected nodes.').optional(),
  free_percent: integer.describe('Percentage of free physical memory across all selected nodes.'),
  total_in_bytes: long.describe('Total amount, in bytes, of physical memory across all selected nodes.'),
  total: ByteSize.describe('Total amount of physical memory across all selected nodes.').optional(),
  used_in_bytes: long.describe('Amount, in bytes, of physical memory in use across all selected nodes.'),
  used: ByteSize.describe('Amount of physical memory in use across all selected nodes.').optional(),
  used_percent: integer.describe('Percentage of physical memory in use across all selected nodes.')
}).meta({ id: 'ClusterStatsOperatingSystemMemoryInfo' })
export type ClusterStatsOperatingSystemMemoryInfo = z.infer<typeof ClusterStatsOperatingSystemMemoryInfo>

export const ClusterStatsClusterOperatingSystemName = z.object({
  count: integer.describe('Number of selected nodes using the operating system.'),
  name: Name.describe('Name of an operating system used by one or more selected nodes.')
}).meta({ id: 'ClusterStatsClusterOperatingSystemName' })
export type ClusterStatsClusterOperatingSystemName = z.infer<typeof ClusterStatsClusterOperatingSystemName>

export const ClusterStatsClusterOperatingSystemPrettyName = z.object({
  count: integer.describe('Number of selected nodes using the operating system.'),
  pretty_name: Name.describe('Human-readable name of an operating system used by one or more selected nodes.')
}).meta({ id: 'ClusterStatsClusterOperatingSystemPrettyName' })
export type ClusterStatsClusterOperatingSystemPrettyName = z.infer<typeof ClusterStatsClusterOperatingSystemPrettyName>

export const ClusterStatsClusterOperatingSystem = z.object({
  allocated_processors: integer.describe('Number of processors used to calculate thread pool size across all selected nodes. This number can be set with the processors setting of a node and defaults to the number of processors reported by the operating system. In both cases, this number will never be larger than 32.'),
  architectures: z.array(ClusterStatsClusterOperatingSystemArchitecture).describe('Contains statistics about processor architectures (for example, x86_64 or aarch64) used by selected nodes.').optional(),
  available_processors: integer.describe('Number of processors available to JVM across all selected nodes.'),
  mem: ClusterStatsOperatingSystemMemoryInfo.describe('Contains statistics about memory used by selected nodes.'),
  names: z.array(ClusterStatsClusterOperatingSystemName).describe('Contains statistics about operating systems used by selected nodes.'),
  pretty_names: z.array(ClusterStatsClusterOperatingSystemPrettyName).describe('Contains statistics about operating systems used by selected nodes.')
}).meta({ id: 'ClusterStatsClusterOperatingSystem' })
export type ClusterStatsClusterOperatingSystem = z.infer<typeof ClusterStatsClusterOperatingSystem>

export const ClusterStatsNodePackagingType = z.object({
  count: integer.describe('Number of selected nodes using the distribution flavor and file type.'),
  flavor: z.string().describe('Type of Elasticsearch distribution. This is always `default`.'),
  type: z.string().describe('File type (such as `tar` or `zip`) used for the distribution package.')
}).meta({ id: 'ClusterStatsNodePackagingType' })
export type ClusterStatsNodePackagingType = z.infer<typeof ClusterStatsNodePackagingType>

export const ClusterStatsClusterProcessCpu = z.object({
  percent: integer.describe('Percentage of CPU used across all selected nodes. Returns `-1` if not supported.')
}).meta({ id: 'ClusterStatsClusterProcessCpu' })
export type ClusterStatsClusterProcessCpu = z.infer<typeof ClusterStatsClusterProcessCpu>

export const ClusterStatsClusterProcessOpenFileDescriptors = z.object({
  avg: long.describe('Average number of concurrently open file descriptors. Returns `-1` if not supported.'),
  max: long.describe('Maximum number of concurrently open file descriptors allowed across all selected nodes. Returns `-1` if not supported.'),
  min: long.describe('Minimum number of concurrently open file descriptors across all selected nodes. Returns -1 if not supported.')
}).meta({ id: 'ClusterStatsClusterProcessOpenFileDescriptors' })
export type ClusterStatsClusterProcessOpenFileDescriptors = z.infer<typeof ClusterStatsClusterProcessOpenFileDescriptors>

export const ClusterStatsClusterProcess = z.object({
  cpu: ClusterStatsClusterProcessCpu.describe('Contains statistics about CPU used by selected nodes.'),
  open_file_descriptors: ClusterStatsClusterProcessOpenFileDescriptors.describe('Contains statistics about open file descriptors in selected nodes.')
}).meta({ id: 'ClusterStatsClusterProcess' })
export type ClusterStatsClusterProcess = z.infer<typeof ClusterStatsClusterProcess>

export const ClusterStatsClusterNodes = z.object({
  count: ClusterStatsClusterNodeCount.describe('Contains counts for nodes selected by the request’s node filters.'),
  discovery_types: z.record(z.string(), integer).describe('Contains statistics about the discovery types used by selected nodes.'),
  fs: ClusterStatsClusterFileSystem.describe('Contains statistics about file stores by selected nodes.'),
  indexing_pressure: ClusterStatsIndexingPressure,
  ingest: ClusterStatsClusterIngest,
  jvm: ClusterStatsClusterJvm.describe('Contains statistics about the Java Virtual Machines (JVMs) used by selected nodes.'),
  network_types: ClusterStatsClusterNetworkTypes.describe('Contains statistics about the transport and HTTP networks used by selected nodes.'),
  os: ClusterStatsClusterOperatingSystem.describe('Contains statistics about the operating systems used by selected nodes.'),
  packaging_types: z.array(ClusterStatsNodePackagingType).describe('Contains statistics about Elasticsearch distributions installed on selected nodes.'),
  plugins: z.array(PluginStats).describe('Contains statistics about installed plugins and modules by selected nodes. If no plugins or modules are installed, this array is empty.'),
  process: ClusterStatsClusterProcess.describe('Contains statistics about processes used by selected nodes.'),
  versions: z.array(VersionString).describe('Array of Elasticsearch versions used on selected nodes.')
}).meta({ id: 'ClusterStatsClusterNodes' })
export type ClusterStatsClusterNodes = z.infer<typeof ClusterStatsClusterNodes>

export const ClusterStatsSnapshotCurrentCounts = z.object({
  snapshots: integer.describe('Snapshots currently in progress'),
  shard_snapshots: integer.describe('Incomplete shard snapshots'),
  snapshot_deletions: integer.describe('Snapshots deletions in progress'),
  concurrent_operations: integer.describe('Sum of snapshots and snapshot_deletions'),
  cleanups: integer.describe('Cleanups in progress, not counted in concurrent_operations as they are not concurrent')
}).meta({ id: 'ClusterStatsSnapshotCurrentCounts' })
export type ClusterStatsSnapshotCurrentCounts = z.infer<typeof ClusterStatsSnapshotCurrentCounts>

export const ClusterStatsShardState = z.enum(['INIT', 'SUCCESS', 'FAILED', 'ABORTED', 'MISSING', 'WAITING', 'QUEUED', 'PAUSED_FOR_NODE_REMOVAL']).meta({ id: 'ClusterStatsShardState' })
export type ClusterStatsShardState = z.infer<typeof ClusterStatsShardState>

export const ClusterStatsRepositoryStatsShards = z.object({
  total: integer,
  complete: integer,
  incomplete: integer,
  states: z.record(ClusterStatsShardState, integer)
}).meta({ id: 'ClusterStatsRepositoryStatsShards' })
export type ClusterStatsRepositoryStatsShards = z.infer<typeof ClusterStatsRepositoryStatsShards>

export const ClusterStatsRepositoryStatsCurrentCounts = z.object({
  snapshots: integer,
  clones: integer,
  finalizations: integer,
  deletions: integer,
  snapshot_deletions: integer,
  active_deletions: integer,
  shards: ClusterStatsRepositoryStatsShards
}).meta({ id: 'ClusterStatsRepositoryStatsCurrentCounts' })
export type ClusterStatsRepositoryStatsCurrentCounts = z.infer<typeof ClusterStatsRepositoryStatsCurrentCounts>

export const ClusterStatsPerRepositoryStats = z.object({
  type: z.string(),
  oldest_start_time_millis: UnitMillis,
  oldest_start_time: DateFormat.optional(),
  current_counts: ClusterStatsRepositoryStatsCurrentCounts
}).meta({ id: 'ClusterStatsPerRepositoryStats' })
export type ClusterStatsPerRepositoryStats = z.infer<typeof ClusterStatsPerRepositoryStats>

export const ClusterStatsClusterSnapshotStats = z.object({
  current_counts: ClusterStatsSnapshotCurrentCounts,
  repositories: z.record(Name, ClusterStatsPerRepositoryStats)
}).meta({ id: 'ClusterStatsClusterSnapshotStats' })
export type ClusterStatsClusterSnapshotStats = z.infer<typeof ClusterStatsClusterSnapshotStats>

/**
 * Get cluster statistics.
 *
 * Get basic index metrics (shard numbers, store size, memory usage) and information about the current nodes that form the cluster (number, roles, os, jvm versions, memory usage, cpu and installed plugins).
 */
export const ClusterStatsRequest = z.object({
  ...RequestBase.shape,
  node_id: NodeIds.describe('Comma-separated list of node filters used to limit returned information. Defaults to all nodes in the cluster.').optional().meta({ found_in: 'path' }),
  include_remotes: z.boolean().describe('Include remote cluster data into the response').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for each node to respond. If a node does not respond before its timeout expires, the response does not include its stats. However, timed out nodes are included in the response’s `_nodes.failed` property. Defaults to no timeout.').optional().meta({ found_in: 'query' })
}).meta({ id: 'ClusterStatsRequest' })
export type ClusterStatsRequest = z.infer<typeof ClusterStatsRequest>

export const NodesNodesResponseBase = z.object({
  node_stats: NodeStatistics.describe('Contains statistics about the number of nodes selected by the request’s node filters.').optional()
}).meta({ id: 'NodesNodesResponseBase' })
export type NodesNodesResponseBase = z.infer<typeof NodesNodesResponseBase>

export const ClusterStatsStatsResponseBase = z.object({
  ...NodesNodesResponseBase.shape,
  cluster_name: Name.describe('Name of the cluster, based on the cluster name setting.'),
  cluster_uuid: Uuid.describe('Unique identifier for the cluster.'),
  indices: ClusterStatsClusterIndices.describe('Contains statistics about indices with shards assigned to selected nodes.'),
  nodes: ClusterStatsClusterNodes.describe('Contains statistics about nodes selected by the request’s node filters.'),
  repositories: z.record(Name, z.record(Name, long)).describe('Contains stats on repository feature usage exposed in cluster stats for telemetry.'),
  snapshots: ClusterStatsClusterSnapshotStats.describe('Contains stats cluster snapshots.'),
  status: HealthStatus.describe('Health status of the cluster, based on the state of its primary and replica shards.').optional(),
  timestamp: long.describe('Unix timestamp, in milliseconds, for the last time the cluster statistics were refreshed.'),
  ccs: ClusterStatsCCSStats.describe('Cross-cluster stats')
}).meta({ id: 'ClusterStatsStatsResponseBase' })
export type ClusterStatsStatsResponseBase = z.infer<typeof ClusterStatsStatsResponseBase>

export const ClusterStatsResponse = ClusterStatsStatsResponseBase.meta({ id: 'ClusterStatsResponse' })
export type ClusterStatsResponse = z.infer<typeof ClusterStatsResponse>
