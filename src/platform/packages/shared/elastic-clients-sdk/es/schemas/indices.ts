/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { Script } from './_global.search'
import { SpecUtilsStringified, SpecUtilsWithNullValue } from './_spec_utils'
import { AcknowledgedResponseBase, BulkStats, ByteSize, ClusterAlias, CommonStatsFlags, CompletionStats, DFIIndependenceMeasure, DFRAfterEffect, DFRBasicModel, DataStreamName, DataStreamNames, DateTime, DocStats, Duration, DurationLarge, DurationValue, ElasticsearchVersionMinInfo, EpochTime, ErrorCause, ExpandWildcards, Field, FielddataStats, Fields, FlushStats, GetStats, HealthStatus, Host, IBDistribution, IBLambda, Id, IndexAlias, IndexName, IndexingStats, Indices, IndicesResponseBase, Ip, Level, MergesStats, Metadata, Name, Names, Normalization, Percentage, PipelineName, PropertyName, QueryCacheStats, RecoveryStats, RefreshStats, RequestBase, RequestCacheStats, SearchStats, SequenceNumber, ShardFailure, ShardStatistics, ShardsOperationResponseBase, StoreStats, TranslogStats, TransportAddress, Uuid, VersionNumber, VersionString, WaitForActiveShards, WarmerStats, double, integer, long, uint } from './_types'
import type { IndexingStatsShape, SearchStatsShape } from './_types'
import { AnalysisAnalyzer, AnalysisCharFilter, AnalysisNormalizer, AnalysisTokenFilter, AnalysisTokenizer } from './_types.analysis'
import { MappingDynamicMapping, MappingDynamicTemplate, MappingFieldMapping, MappingFieldNamesField, MappingProperty, MappingRoutingField, MappingRuntimeFields, MappingSourceField, MappingTypeMapping } from './_types.mapping'
import { QueryDslOperator, QueryDslQueryContainer } from './_types.query_dsl'

export const IndicesStatsShardRoutingState = z.enum(['UNASSIGNED', 'INITIALIZING', 'STARTED', 'RELOCATING']).meta({ id: 'IndicesStatsShardRoutingState' })
export type IndicesStatsShardRoutingState = z.infer<typeof IndicesStatsShardRoutingState>

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

export const IndicesNumericFielddataFormat = z.enum(['array', 'disabled']).meta({ id: 'IndicesNumericFielddataFormat' })
export type IndicesNumericFielddataFormat = z.infer<typeof IndicesNumericFielddataFormat>

export const IndicesNumericFielddata = z.object({
  format: IndicesNumericFielddataFormat
}).meta({ id: 'IndicesNumericFielddata' })
export type IndicesNumericFielddata = z.infer<typeof IndicesNumericFielddata>

export const IndicesFielddataFrequencyFilter = z.object({
  max: double,
  min: double,
  min_segment_size: integer
}).meta({ id: 'IndicesFielddataFrequencyFilter' })
export type IndicesFielddataFrequencyFilter = z.infer<typeof IndicesFielddataFrequencyFilter>

export const IndicesRetentionLease = z.object({
  period: Duration
}).meta({ id: 'IndicesRetentionLease' })
export type IndicesRetentionLease = z.infer<typeof IndicesRetentionLease>

export const IndicesSoftDeletes = z.object({
  enabled: z.boolean().describe('Indicates whether soft deletes are enabled on the index.').optional(),
  retention_lease: IndicesRetentionLease.describe('The maximum period to retain a shard history retention lease before it is considered expired. Shard history retention leases ensure that soft deletes are retained during merges on the Lucene index. If a soft delete is merged away before it can be replicated to a follower the following process will fail due to incomplete history on the leader.').optional()
}).meta({ id: 'IndicesSoftDeletes' })
export type IndicesSoftDeletes = z.infer<typeof IndicesSoftDeletes>

export const IndicesSegmentSortOrder = z.enum(['asc', 'ASC', 'desc', 'DESC']).meta({ id: 'IndicesSegmentSortOrder' })
export type IndicesSegmentSortOrder = z.infer<typeof IndicesSegmentSortOrder>

export const IndicesSegmentSortMode = z.enum(['min', 'MIN', 'max', 'MAX']).meta({ id: 'IndicesSegmentSortMode' })
export type IndicesSegmentSortMode = z.infer<typeof IndicesSegmentSortMode>

export const IndicesSegmentSortMissing = z.enum(['_last', '_first']).meta({ id: 'IndicesSegmentSortMissing' })
export type IndicesSegmentSortMissing = z.infer<typeof IndicesSegmentSortMissing>

export const IndicesIndexSegmentSort = z.object({
  field: Fields.optional(),
  order: z.union([IndicesSegmentSortOrder, z.array(IndicesSegmentSortOrder)]).optional(),
  mode: z.union([IndicesSegmentSortMode, z.array(IndicesSegmentSortMode)]).optional(),
  missing: z.union([IndicesSegmentSortMissing, z.array(IndicesSegmentSortMissing)]).optional()
}).meta({ id: 'IndicesIndexSegmentSort' })
export type IndicesIndexSegmentSort = z.infer<typeof IndicesIndexSegmentSort>

export const IndicesIndexCheckOnStartup = z.union([z.boolean(), z.enum(['true', 'false', 'checksum'])]).meta({ id: 'IndicesIndexCheckOnStartup' })
export type IndicesIndexCheckOnStartup = z.infer<typeof IndicesIndexCheckOnStartup>

export const IndicesMergeScheduler = z.object({
  max_thread_count: SpecUtilsStringified.optional(),
  max_merge_count: SpecUtilsStringified.optional()
}).meta({ id: 'IndicesMergeScheduler' })
export type IndicesMergeScheduler = z.infer<typeof IndicesMergeScheduler>

export const IndicesMerge = z.object({
  scheduler: IndicesMergeScheduler.optional()
}).meta({ id: 'IndicesMerge' })
export type IndicesMerge = z.infer<typeof IndicesMerge>

export const IndicesSearchIdle = z.object({
  after: Duration.optional()
}).meta({ id: 'IndicesSearchIdle' })
export type IndicesSearchIdle = z.infer<typeof IndicesSearchIdle>

export const IndicesSlowlogTresholdLevels = z.object({
  warn: Duration.optional(),
  info: Duration.optional(),
  debug: Duration.optional(),
  trace: Duration.optional()
}).meta({ id: 'IndicesSlowlogTresholdLevels' })
export type IndicesSlowlogTresholdLevels = z.infer<typeof IndicesSlowlogTresholdLevels>

export const IndicesSlowlogTresholds = z.object({
  query: IndicesSlowlogTresholdLevels.optional(),
  fetch: IndicesSlowlogTresholdLevels.optional()
}).meta({ id: 'IndicesSlowlogTresholds' })
export type IndicesSlowlogTresholds = z.infer<typeof IndicesSlowlogTresholds>

export const IndicesSlowlogSettings = z.object({
  level: z.string().optional(),
  source: integer.optional(),
  reformat: z.boolean().optional(),
  threshold: IndicesSlowlogTresholds.optional()
}).meta({ id: 'IndicesSlowlogSettings' })
export type IndicesSlowlogSettings = z.infer<typeof IndicesSlowlogSettings>

export const IndicesSettingsSearch = z.object({
  idle: IndicesSearchIdle.optional(),
  slowlog: IndicesSlowlogSettings.optional()
}).meta({ id: 'IndicesSettingsSearch' })
export type IndicesSettingsSearch = z.infer<typeof IndicesSettingsSearch>

export const IndicesIndexSettingBlocks = z.object({
  read_only: SpecUtilsStringified.optional(),
  read_only_allow_delete: SpecUtilsStringified.optional(),
  read: SpecUtilsStringified.optional(),
  write: SpecUtilsStringified.optional(),
  metadata: SpecUtilsStringified.optional()
}).meta({ id: 'IndicesIndexSettingBlocks' })
export type IndicesIndexSettingBlocks = z.infer<typeof IndicesIndexSettingBlocks>

export const IndicesSettingsAnalyze = z.object({
  max_token_count: SpecUtilsStringified.optional()
}).meta({ id: 'IndicesSettingsAnalyze' })
export type IndicesSettingsAnalyze = z.infer<typeof IndicesSettingsAnalyze>

export const IndicesSettingsHighlight = z.object({
  max_analyzed_offset: integer.optional()
}).meta({ id: 'IndicesSettingsHighlight' })
export type IndicesSettingsHighlight = z.infer<typeof IndicesSettingsHighlight>

export const IndicesIndexRoutingAllocationOptions = z.enum(['all', 'primaries', 'new_primaries', 'none']).meta({ id: 'IndicesIndexRoutingAllocationOptions' })
export type IndicesIndexRoutingAllocationOptions = z.infer<typeof IndicesIndexRoutingAllocationOptions>

export const IndicesIndexRoutingAllocationInclude = z.object({
  _tier_preference: z.string().optional(),
  _id: Id.optional()
}).meta({ id: 'IndicesIndexRoutingAllocationInclude' })
export type IndicesIndexRoutingAllocationInclude = z.infer<typeof IndicesIndexRoutingAllocationInclude>

export const IndicesIndexRoutingAllocationInitialRecovery = z.object({
  _id: Id.optional()
}).meta({ id: 'IndicesIndexRoutingAllocationInitialRecovery' })
export type IndicesIndexRoutingAllocationInitialRecovery = z.infer<typeof IndicesIndexRoutingAllocationInitialRecovery>

export const IndicesIndexRoutingAllocationDisk = z.object({
  threshold_enabled: z.union([z.boolean(), z.string()]).optional()
}).meta({ id: 'IndicesIndexRoutingAllocationDisk' })
export type IndicesIndexRoutingAllocationDisk = z.infer<typeof IndicesIndexRoutingAllocationDisk>

export const IndicesIndexRoutingAllocation = z.object({
  enable: IndicesIndexRoutingAllocationOptions.optional(),
  include: IndicesIndexRoutingAllocationInclude.optional(),
  initial_recovery: IndicesIndexRoutingAllocationInitialRecovery.optional(),
  disk: IndicesIndexRoutingAllocationDisk.optional()
}).meta({ id: 'IndicesIndexRoutingAllocation' })
export type IndicesIndexRoutingAllocation = z.infer<typeof IndicesIndexRoutingAllocation>

export const IndicesIndexRoutingRebalanceOptions = z.enum(['all', 'primaries', 'replicas', 'none']).meta({ id: 'IndicesIndexRoutingRebalanceOptions' })
export type IndicesIndexRoutingRebalanceOptions = z.infer<typeof IndicesIndexRoutingRebalanceOptions>

export const IndicesIndexRoutingRebalance = z.object({
  enable: IndicesIndexRoutingRebalanceOptions
}).meta({ id: 'IndicesIndexRoutingRebalance' })
export type IndicesIndexRoutingRebalance = z.infer<typeof IndicesIndexRoutingRebalance>

export const IndicesIndexRouting = z.object({
  allocation: IndicesIndexRoutingAllocation.optional(),
  rebalance: IndicesIndexRoutingRebalance.optional()
}).meta({ id: 'IndicesIndexRouting' })
export type IndicesIndexRouting = z.infer<typeof IndicesIndexRouting>

export const IndicesIndexSettingsLifecycleStep = z.object({
  wait_time_threshold: Duration.describe('Time to wait for the cluster to resolve allocation issues during an ILM shrink action. Must be greater than 1h (1 hour). See Shard allocation for shrink.').optional()
}).meta({ id: 'IndicesIndexSettingsLifecycleStep' })
export type IndicesIndexSettingsLifecycleStep = z.infer<typeof IndicesIndexSettingsLifecycleStep>

export const IndicesIndexSettingsLifecycle = z.object({
  name: Name.describe('The name of the policy to use to manage the index. For information about how Elasticsearch applies policy changes, see Policy updates.').optional(),
  indexing_complete: SpecUtilsStringified.describe('Indicates whether or not the index has been rolled over. Automatically set to true when ILM completes the rollover action. You can explicitly set it to skip rollover.').optional(),
  origination_date: long.describe('If specified, this is the timestamp used to calculate the index age for its phase transitions. Use this setting if you create a new index that contains old data and want to use the original creation date to calculate the index age. Specified as a Unix epoch value in milliseconds.').optional(),
  parse_origination_date: z.boolean().describe('Set to true to parse the origination date from the index name. This origination date is used to calculate the index age for its phase transitions. The index name must match the pattern ^.*-{date_format}-d+, where the date_format is yyyy.MM.dd and the trailing digits are optional. An index that was rolled over would normally match the full format, for example logs-2016.10.31-000002). If the index name doesn’t match the pattern, index creation fails.').optional(),
  step: IndicesIndexSettingsLifecycleStep.optional(),
  rollover_alias: z.string().describe('The index alias to update when the index rolls over. Specify when using a policy that contains a rollover action. When the index rolls over, the alias is updated to reflect that the index is no longer the write index. For more information about rolling indices, see Rollover.').optional(),
  prefer_ilm: z.union([z.boolean(), z.string()]).describe('Preference for the system that manages a data stream backing index (preferring ILM when both ILM and DLM are applicable for an index).').optional()
}).meta({ id: 'IndicesIndexSettingsLifecycle' })
export type IndicesIndexSettingsLifecycle = z.infer<typeof IndicesIndexSettingsLifecycle>

export const IndicesIndexVersioning = z.object({
  created: VersionString.optional(),
  created_string: z.string().optional()
}).meta({ id: 'IndicesIndexVersioning' })
export type IndicesIndexVersioning = z.infer<typeof IndicesIndexVersioning>

export const IndicesTranslogDurability = z.enum(['request', 'REQUEST', 'async', 'ASYNC']).meta({ id: 'IndicesTranslogDurability' })
export type IndicesTranslogDurability = z.infer<typeof IndicesTranslogDurability>

export const IndicesTranslogRetention = z.object({
  size: ByteSize.describe('This controls the total size of translog files to keep for each shard. Keeping more translog files increases the chance of performing an operation based sync when recovering a replica. If the translog files are not sufficient, replica recovery will fall back to a file based sync. This setting is ignored, and should not be set, if soft deletes are enabled. Soft deletes are enabled by default in indices created in Elasticsearch versions 7.0.0 and later.').optional(),
  age: Duration.describe('This controls the maximum duration for which translog files are kept by each shard. Keeping more translog files increases the chance of performing an operation based sync when recovering replicas. If the translog files are not sufficient, replica recovery will fall back to a file based sync. This setting is ignored, and should not be set, if soft deletes are enabled. Soft deletes are enabled by default in indices created in Elasticsearch versions 7.0.0 and later.').optional()
}).meta({ id: 'IndicesTranslogRetention' })
export type IndicesTranslogRetention = z.infer<typeof IndicesTranslogRetention>

export const IndicesTranslog = z.object({
  sync_interval: Duration.describe('How often the translog is fsynced to disk and committed, regardless of write operations. Values less than 100ms are not allowed.').optional(),
  durability: IndicesTranslogDurability.describe('Whether or not to `fsync` and commit the translog after every index, delete, update, or bulk request.').optional(),
  flush_threshold_size: ByteSize.describe('The translog stores all operations that are not yet safely persisted in Lucene (i.e., are not part of a Lucene commit point). Although these operations are available for reads, they will need to be replayed if the shard was stopped and had to be recovered. This setting controls the maximum total size of these operations, to prevent recoveries from taking too long. Once the maximum size has been reached a flush will happen, generating a new Lucene commit point.').optional(),
  retention: IndicesTranslogRetention.optional()
}).meta({ id: 'IndicesTranslog' })
export type IndicesTranslog = z.infer<typeof IndicesTranslog>

export const IndicesSettingsQueryString = z.object({
  lenient: SpecUtilsStringified
}).meta({ id: 'IndicesSettingsQueryString' })
export type IndicesSettingsQueryString = z.infer<typeof IndicesSettingsQueryString>

export const IndicesIndexSettingsAnalysis = z.object({
  analyzer: z.record(z.string(), z.lazy(() => AnalysisAnalyzer)).optional(),
  char_filter: z.record(z.string(), z.lazy(() => AnalysisCharFilter)).optional(),
  filter: z.record(z.string(), z.lazy(() => AnalysisTokenFilter)).optional(),
  normalizer: z.record(z.string(), z.lazy(() => AnalysisNormalizer)).optional(),
  tokenizer: z.record(z.string(), z.lazy(() => AnalysisTokenizer)).optional()
}).meta({ id: 'IndicesIndexSettingsAnalysis' })
export type IndicesIndexSettingsAnalysis = z.infer<typeof IndicesIndexSettingsAnalysis>

export const IndicesIndexSettingsTimeSeries = z.object({
  end_time: DateTime.optional(),
  start_time: DateTime.optional()
}).meta({ id: 'IndicesIndexSettingsTimeSeries' })
export type IndicesIndexSettingsTimeSeries = z.infer<typeof IndicesIndexSettingsTimeSeries>

export const IndicesCacheQueries = z.object({
  enabled: z.boolean()
}).meta({ id: 'IndicesCacheQueries' })
export type IndicesCacheQueries = z.infer<typeof IndicesCacheQueries>

export const IndicesQueries = z.object({
  cache: IndicesCacheQueries.optional()
}).meta({ id: 'IndicesQueries' })
export type IndicesQueries = z.infer<typeof IndicesQueries>

export const IndicesSettingsSimilarityBm25 = z.object({
  type: z.literal('BM25'),
  b: double.optional(),
  discount_overlaps: z.boolean().optional(),
  k1: double.optional()
}).meta({ id: 'IndicesSettingsSimilarityBm25' })
export type IndicesSettingsSimilarityBm25 = z.infer<typeof IndicesSettingsSimilarityBm25>

export const IndicesSettingsSimilarityBoolean = z.object({
  type: z.literal('boolean')
}).meta({ id: 'IndicesSettingsSimilarityBoolean' })
export type IndicesSettingsSimilarityBoolean = z.infer<typeof IndicesSettingsSimilarityBoolean>

export const IndicesSettingsSimilarityDfi = z.object({
  type: z.literal('DFI'),
  independence_measure: DFIIndependenceMeasure
}).meta({ id: 'IndicesSettingsSimilarityDfi' })
export type IndicesSettingsSimilarityDfi = z.infer<typeof IndicesSettingsSimilarityDfi>

export const IndicesSettingsSimilarityDfr = z.object({
  type: z.literal('DFR'),
  after_effect: DFRAfterEffect,
  basic_model: DFRBasicModel,
  normalization: Normalization
}).meta({ id: 'IndicesSettingsSimilarityDfr' })
export type IndicesSettingsSimilarityDfr = z.infer<typeof IndicesSettingsSimilarityDfr>

export const IndicesSettingsSimilarityIb = z.object({
  type: z.literal('IB'),
  distribution: IBDistribution,
  lambda: IBLambda,
  normalization: Normalization
}).meta({ id: 'IndicesSettingsSimilarityIb' })
export type IndicesSettingsSimilarityIb = z.infer<typeof IndicesSettingsSimilarityIb>

export const IndicesSettingsSimilarityLmd = z.object({
  type: z.literal('LMDirichlet'),
  mu: double.optional()
}).meta({ id: 'IndicesSettingsSimilarityLmd' })
export type IndicesSettingsSimilarityLmd = z.infer<typeof IndicesSettingsSimilarityLmd>

export const IndicesSettingsSimilarityLmj = z.object({
  type: z.literal('LMJelinekMercer'),
  lambda: double.optional()
}).meta({ id: 'IndicesSettingsSimilarityLmj' })
export type IndicesSettingsSimilarityLmj = z.infer<typeof IndicesSettingsSimilarityLmj>

export const IndicesSettingsSimilarityScripted = z.object({
  type: z.literal('scripted'),
  script: z.lazy(() => Script),
  weight_script: z.lazy(() => Script).optional()
}).meta({ id: 'IndicesSettingsSimilarityScripted' })
export type IndicesSettingsSimilarityScripted = z.infer<typeof IndicesSettingsSimilarityScripted>

export const IndicesSettingsSimilarity = z.union([IndicesSettingsSimilarityBm25, IndicesSettingsSimilarityBoolean, IndicesSettingsSimilarityDfi, IndicesSettingsSimilarityDfr, IndicesSettingsSimilarityIb, IndicesSettingsSimilarityLmd, IndicesSettingsSimilarityLmj, IndicesSettingsSimilarityScripted]).meta({ id: 'IndicesSettingsSimilarity' })
export type IndicesSettingsSimilarity = z.infer<typeof IndicesSettingsSimilarity>

export const IndicesMappingLimitSettingsTotalFields = z.object({
  limit: z.union([long, z.string()]).describe('The maximum number of fields in an index. Field and object mappings, as well as field aliases count towards this limit. The limit is in place to prevent mappings and searches from becoming too large. Higher values can lead to performance degradations and memory issues, especially in clusters with a high load or few resources.').optional(),
  ignore_dynamic_beyond_limit: z.union([z.boolean(), z.string()]).describe('This setting determines what happens when a dynamically mapped field would exceed the total fields limit. When set to false (the default), the index request of the document that tries to add a dynamic field to the mapping will fail with the message Limit of total fields [X] has been exceeded. When set to true, the index request will not fail. Instead, fields that would exceed the limit are not added to the mapping, similar to dynamic: false. The fields that were not added to the mapping will be added to the _ignored field.').optional()
}).meta({ id: 'IndicesMappingLimitSettingsTotalFields' })
export type IndicesMappingLimitSettingsTotalFields = z.infer<typeof IndicesMappingLimitSettingsTotalFields>

export const IndicesMappingLimitSettingsDepth = z.object({
  limit: long.describe('The maximum depth for a field, which is measured as the number of inner objects. For instance, if all fields are defined at the root object level, then the depth is 1. If there is one object mapping, then the depth is 2, etc.').optional()
}).meta({ id: 'IndicesMappingLimitSettingsDepth' })
export type IndicesMappingLimitSettingsDepth = z.infer<typeof IndicesMappingLimitSettingsDepth>

export const IndicesMappingLimitSettingsNestedFields = z.object({
  limit: long.describe('The maximum number of distinct nested mappings in an index. The nested type should only be used in special cases, when arrays of objects need to be queried independently of each other. To safeguard against poorly designed mappings, this setting limits the number of unique nested types per index.').optional()
}).meta({ id: 'IndicesMappingLimitSettingsNestedFields' })
export type IndicesMappingLimitSettingsNestedFields = z.infer<typeof IndicesMappingLimitSettingsNestedFields>

export const IndicesMappingLimitSettingsNestedObjects = z.object({
  limit: long.describe('The maximum number of nested JSON objects that a single document can contain across all nested types. This limit helps to prevent out of memory errors when a document contains too many nested objects.').optional()
}).meta({ id: 'IndicesMappingLimitSettingsNestedObjects' })
export type IndicesMappingLimitSettingsNestedObjects = z.infer<typeof IndicesMappingLimitSettingsNestedObjects>

export const IndicesMappingLimitSettingsFieldNameLength = z.object({
  limit: long.describe('Setting for the maximum length of a field name. This setting isn’t really something that addresses mappings explosion but might still be useful if you want to limit the field length. It usually shouldn’t be necessary to set this setting. The default is okay unless a user starts to add a huge number of fields with really long names. Default is `Long.MAX_VALUE` (no limit).').optional()
}).meta({ id: 'IndicesMappingLimitSettingsFieldNameLength' })
export type IndicesMappingLimitSettingsFieldNameLength = z.infer<typeof IndicesMappingLimitSettingsFieldNameLength>

export const IndicesMappingLimitSettingsDimensionFields = z.object({
  limit: long.describe('[preview] This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.').optional()
}).meta({ id: 'IndicesMappingLimitSettingsDimensionFields' })
export type IndicesMappingLimitSettingsDimensionFields = z.infer<typeof IndicesMappingLimitSettingsDimensionFields>

export const IndicesSourceMode = z.enum(['disabled', 'stored', 'synthetic']).meta({ id: 'IndicesSourceMode' })
export type IndicesSourceMode = z.infer<typeof IndicesSourceMode>

export const IndicesMappingLimitSettingsSourceFields = z.object({
  mode: IndicesSourceMode
}).meta({ id: 'IndicesMappingLimitSettingsSourceFields' })
export type IndicesMappingLimitSettingsSourceFields = z.infer<typeof IndicesMappingLimitSettingsSourceFields>

/** Mapping Limit Settings */
export const IndicesMappingLimitSettings = z.object({
  coerce: z.boolean().optional(),
  total_fields: IndicesMappingLimitSettingsTotalFields.optional(),
  depth: IndicesMappingLimitSettingsDepth.optional(),
  nested_fields: IndicesMappingLimitSettingsNestedFields.optional(),
  nested_objects: IndicesMappingLimitSettingsNestedObjects.optional(),
  field_name_length: IndicesMappingLimitSettingsFieldNameLength.optional(),
  dimension_fields: IndicesMappingLimitSettingsDimensionFields.optional(),
  source: IndicesMappingLimitSettingsSourceFields.optional(),
  ignore_malformed: z.union([z.boolean(), z.string()]).optional()
}).meta({ id: 'IndicesMappingLimitSettings' })
export type IndicesMappingLimitSettings = z.infer<typeof IndicesMappingLimitSettings>

export const IndicesIndexingSlowlogTresholds = z.object({
  index: IndicesSlowlogTresholdLevels.describe('The indexing slow log, similar in functionality to the search slow log. The log file name ends with `_index_indexing_slowlog.json`. Log and the thresholds are configured in the same way as the search slowlog.').optional()
}).meta({ id: 'IndicesIndexingSlowlogTresholds' })
export type IndicesIndexingSlowlogTresholds = z.infer<typeof IndicesIndexingSlowlogTresholds>

export const IndicesIndexingSlowlogSettings = z.object({
  level: z.string().optional(),
  source: integer.optional(),
  reformat: z.boolean().optional(),
  threshold: IndicesIndexingSlowlogTresholds.optional()
}).meta({ id: 'IndicesIndexingSlowlogSettings' })
export type IndicesIndexingSlowlogSettings = z.infer<typeof IndicesIndexingSlowlogSettings>

export const IndicesIndexingPressureMemory = z.object({
  limit: integer.describe('Number of outstanding bytes that may be consumed by indexing requests. When this limit is reached or exceeded, the node will reject new coordinating and primary operations. When replica operations consume 1.5x this limit, the node will reject new replica operations. Defaults to 10% of the heap.').optional()
}).meta({ id: 'IndicesIndexingPressureMemory' })
export type IndicesIndexingPressureMemory = z.infer<typeof IndicesIndexingPressureMemory>

export const IndicesIndexingPressure = z.object({
  memory: IndicesIndexingPressureMemory
}).meta({ id: 'IndicesIndexingPressure' })
export type IndicesIndexingPressure = z.infer<typeof IndicesIndexingPressure>

export const IndicesStorageType = z.union([z.enum(['fs', 'niofs', 'mmapfs', 'hybridfs']), z.string()]).meta({ id: 'IndicesStorageType' })
export type IndicesStorageType = z.infer<typeof IndicesStorageType>

export const IndicesStorage = z.object({
  type: IndicesStorageType,
  allow_mmap: z.boolean().describe('You can restrict the use of the mmapfs and the related hybridfs store type via the setting node.store.allow_mmap. This is a boolean setting indicating whether or not memory-mapping is allowed. The default is to allow it. This setting is useful, for example, if you are in an environment where you can not control the ability to create a lot of memory maps so you need disable the ability to use memory-mapping.').optional(),
  stats_refresh_interval: Duration.describe('How often store statistics are refreshed').optional()
}).meta({ id: 'IndicesStorage' })
export type IndicesStorage = z.infer<typeof IndicesStorage>

export interface IndicesIndexSettingsShape {
  index?: IndicesIndexSettingsShape | undefined
  mode?: string | undefined
  routing_path?: string | string[] | undefined
  soft_deletes?: IndicesSoftDeletes | undefined
  sort?: IndicesIndexSegmentSort | undefined
  number_of_routing_shards?: integer | undefined
  check_on_startup?: IndicesIndexCheckOnStartup | undefined
  codec?: string | undefined
  routing_partition_size?: SpecUtilsStringified | undefined
  load_fixed_bitset_filters_eagerly?: boolean | undefined
  hidden?: boolean | string | undefined
  auto_expand_replicas?: SpecUtilsWithNullValue | undefined
  merge?: IndicesMerge | undefined
  search?: IndicesSettingsSearch | undefined
  refresh_interval?: Duration | undefined
  max_result_window?: integer | undefined
  max_inner_result_window?: integer | undefined
  max_rescore_window?: integer | undefined
  max_docvalue_fields_search?: integer | undefined
  max_script_fields?: integer | undefined
  max_ngram_diff?: integer | undefined
  max_shingle_diff?: integer | undefined
  blocks?: IndicesIndexSettingBlocks | undefined
  max_refresh_listeners?: integer | undefined
  analyze?: IndicesSettingsAnalyze | undefined
  highlight?: IndicesSettingsHighlight | undefined
  max_terms_count?: integer | undefined
  max_regex_length?: integer | undefined
  routing?: IndicesIndexRouting | undefined
  gc_deletes?: Duration | undefined
  default_pipeline?: PipelineName | undefined
  final_pipeline?: PipelineName | undefined
  lifecycle?: IndicesIndexSettingsLifecycle | undefined
  provided_name?: Name | undefined
  creation_date?: SpecUtilsStringified | undefined
  creation_date_string?: DateTime | undefined
  uuid?: Uuid | undefined
  version?: IndicesIndexVersioning | undefined
  verified_before_close?: boolean | string | undefined
  format?: string | integer | undefined
  max_slices_per_scroll?: integer | undefined
  translog?: IndicesTranslog | undefined
  query_string?: IndicesSettingsQueryString | undefined
  priority?: integer | string | undefined
  top_metrics_max_size?: integer | undefined
  analysis?: IndicesIndexSettingsAnalysis | undefined
  settings?: IndicesIndexSettingsShape | undefined
  time_series?: IndicesIndexSettingsTimeSeries | undefined
  queries?: IndicesQueries | undefined
  similarity?: Record<string, IndicesSettingsSimilarity> | undefined
  mapping?: IndicesMappingLimitSettings | undefined
  'indexing.slowlog'?: IndicesIndexingSlowlogSettings | undefined
  indexing_pressure?: IndicesIndexingPressure | undefined
  store?: IndicesStorage | undefined
}
export const IndicesIndexSettings = z.looseObject({
  get index () { return IndicesIndexSettings.optional() },
  mode: z.string().optional(),
  routing_path: z.union([z.string(), z.array(z.string())]).optional(),
  soft_deletes: IndicesSoftDeletes.optional(),
  sort: IndicesIndexSegmentSort.optional(),
  number_of_routing_shards: integer.optional(),
  check_on_startup: IndicesIndexCheckOnStartup.optional(),
  codec: z.string().optional(),
  routing_partition_size: SpecUtilsStringified.optional(),
  load_fixed_bitset_filters_eagerly: z.boolean().optional(),
  hidden: z.union([z.boolean(), z.string()]).optional(),
  auto_expand_replicas: SpecUtilsWithNullValue.optional(),
  merge: IndicesMerge.optional(),
  search: IndicesSettingsSearch.optional(),
  refresh_interval: Duration.optional(),
  max_result_window: integer.optional(),
  max_inner_result_window: integer.optional(),
  max_rescore_window: integer.optional(),
  max_docvalue_fields_search: integer.optional(),
  max_script_fields: integer.optional(),
  max_ngram_diff: integer.optional(),
  max_shingle_diff: integer.optional(),
  blocks: IndicesIndexSettingBlocks.optional(),
  max_refresh_listeners: integer.optional(),
  analyze: IndicesSettingsAnalyze.describe('Settings to define analyzers, tokenizers, token filters and character filters. Refer to the linked documentation for step-by-step examples of updating analyzers on existing indices.').optional(),
  highlight: IndicesSettingsHighlight.optional(),
  max_terms_count: integer.optional(),
  max_regex_length: integer.optional(),
  routing: IndicesIndexRouting.optional(),
  gc_deletes: Duration.optional(),
  default_pipeline: PipelineName.optional(),
  final_pipeline: PipelineName.optional(),
  lifecycle: IndicesIndexSettingsLifecycle.optional(),
  provided_name: Name.optional(),
  creation_date: SpecUtilsStringified.optional(),
  creation_date_string: DateTime.optional(),
  uuid: Uuid.optional(),
  version: IndicesIndexVersioning.optional(),
  verified_before_close: z.union([z.boolean(), z.string()]).optional(),
  format: z.union([z.string(), integer]).optional(),
  max_slices_per_scroll: integer.optional(),
  translog: IndicesTranslog.optional(),
  query_string: IndicesSettingsQueryString.optional(),
  priority: z.union([integer, z.string()]).optional(),
  top_metrics_max_size: integer.optional(),
  analysis: IndicesIndexSettingsAnalysis.optional(),
  get settings () { return IndicesIndexSettings.optional() },
  time_series: IndicesIndexSettingsTimeSeries.optional(),
  queries: IndicesQueries.optional(),
  similarity: z.record(z.string(), IndicesSettingsSimilarity).describe('Configure custom similarity settings to customize how search results are scored.').optional(),
  mapping: IndicesMappingLimitSettings.describe('Enable or disable dynamic mapping for an index.').optional(),
  'indexing.slowlog': IndicesIndexingSlowlogSettings.optional(),
  indexing_pressure: IndicesIndexingPressure.describe('Configure indexing back pressure limits.').optional(),
  store: IndicesStorage.describe('The store module allows you to control how index data is stored and accessed on disk.').optional()
}).meta({ id: 'IndicesIndexSettings' })
export type IndicesIndexSettings = z.infer<typeof IndicesIndexSettings>

export const IndicesDownsamplingRound = z.object({
  after: Duration.describe('The duration since rollover when this downsampling round should execute'),
  fixed_interval: DurationLarge.describe('The downsample interval.')
}).meta({ id: 'IndicesDownsamplingRound' })
export type IndicesDownsamplingRound = z.infer<typeof IndicesDownsamplingRound>

export const IndicesSamplingMethod = z.enum(['aggregate', 'last_value']).meta({ id: 'IndicesSamplingMethod' })
export type IndicesSamplingMethod = z.infer<typeof IndicesSamplingMethod>

/** Data stream lifecycle denotes that a data stream is managed by the data stream lifecycle and contains the configuration. */
export const IndicesDataStreamLifecycle = z.object({
  data_retention: Duration.describe('If defined, every document added to this data stream will be stored at least for this time frame. Any time after this duration the document could be deleted. When empty, every document in this data stream will be stored indefinitely.').optional(),
  downsampling: z.array(IndicesDownsamplingRound).describe('The list of downsampling rounds to execute as part of this downsampling configuration').optional(),
  downsampling_method: IndicesSamplingMethod.describe('The method used to downsample the data. There are two options `aggregate` and `last_value`. It requires `downsampling` to be defined. Defaults to `aggregate`.').optional(),
  enabled: z.boolean().describe('If defined, it turns data stream lifecycle on/off (`true`/`false`) for this data stream. A data stream lifecycle that\'s disabled (enabled: `false`) will have no effect on the data stream.').optional(),
  frozen_after: Duration.describe('Only available with feature flag dlm_searchable_snapshots.').optional()
}).meta({ id: 'IndicesDataStreamLifecycle' })
export type IndicesDataStreamLifecycle = z.infer<typeof IndicesDataStreamLifecycle>

export const IndicesDataStreamLifecycleRolloverConditions = z.object({
  min_age: Duration.optional(),
  max_age: z.string().optional(),
  min_docs: long.optional(),
  max_docs: long.optional(),
  min_size: ByteSize.optional(),
  max_size: ByteSize.optional(),
  min_primary_shard_size: ByteSize.optional(),
  max_primary_shard_size: ByteSize.optional(),
  min_primary_shard_docs: long.optional(),
  max_primary_shard_docs: long.optional()
}).meta({ id: 'IndicesDataStreamLifecycleRolloverConditions' })
export type IndicesDataStreamLifecycleRolloverConditions = z.infer<typeof IndicesDataStreamLifecycleRolloverConditions>

/**
 * Data stream lifecycle with rollover can be used to display the configuration including the default rollover conditions,
 * if asked.
 */
export const IndicesDataStreamLifecycleWithRollover = z.object({
  ...IndicesDataStreamLifecycle.shape,
  rollover: IndicesDataStreamLifecycleRolloverConditions.describe('The conditions which will trigger the rollover of a backing index as configured by the cluster setting `cluster.lifecycle.default.rollover`. This property is an implementation detail and it will only be retrieved when the query param `include_defaults` is set to true. The contents of this field are subject to change.').optional()
}).meta({ id: 'IndicesDataStreamLifecycleWithRollover' })
export type IndicesDataStreamLifecycleWithRollover = z.infer<typeof IndicesDataStreamLifecycleWithRollover>

export const IndicesAliasDefinition = z.object({
  filter: z.lazy(() => QueryDslQueryContainer).describe('Query used to limit documents the alias can access.').optional(),
  index_routing: z.string().describe('Value used to route indexing operations to a specific shard. If specified, this overwrites the `routing` value for indexing operations.').optional(),
  is_write_index: z.boolean().describe('If `true`, the index is the write index for the alias.').optional(),
  routing: z.string().describe('Value used to route indexing and search operations to a specific shard.').optional(),
  search_routing: z.string().describe('Value used to route search operations to a specific shard. If specified, this overwrites the `routing` value for search operations.').optional(),
  is_hidden: z.boolean().describe('If `true`, the alias is hidden. All indices for the alias must have the same `is_hidden` value.').optional()
}).meta({ id: 'IndicesAliasDefinition' })
export type IndicesAliasDefinition = z.infer<typeof IndicesAliasDefinition>

/** The failure store lifecycle configures the data stream lifecycle configuration for failure indices. */
export const IndicesFailureStoreLifecycle = z.object({
  data_retention: Duration.describe('If defined, every document added to this data stream will be stored at least for this time frame. Any time after this duration the document could be deleted. When empty, every document in this data stream will be stored indefinitely.').optional(),
  enabled: z.boolean().describe('If defined, it turns data stream lifecycle on/off (`true`/`false`) for this data stream. A data stream lifecycle that\'s disabled (enabled: `false`) will have no effect on the data stream.').optional()
}).meta({ id: 'IndicesFailureStoreLifecycle' })
export type IndicesFailureStoreLifecycle = z.infer<typeof IndicesFailureStoreLifecycle>

/** Data stream failure store contains the configuration of the failure store for a given data stream. */
export const IndicesDataStreamFailureStore = z.object({
  enabled: z.boolean().describe('If defined, it turns the failure store on/off (`true`/`false`) for this data stream. A data stream failure store that\'s disabled (enabled: `false`) will redirect no new failed indices to the failure store; however, it will not remove any existing data from the failure store.').optional(),
  lifecycle: IndicesFailureStoreLifecycle.describe('If defined, it specifies the lifecycle configuration for the failure store of this data stream.').optional()
}).meta({ id: 'IndicesDataStreamFailureStore' })
export type IndicesDataStreamFailureStore = z.infer<typeof IndicesDataStreamFailureStore>

/**
 * Data stream options contain the configuration of data stream level features for a given data stream, for example,
 * the failure store configuration.
 */
export const IndicesDataStreamOptions = z.object({
  failure_store: IndicesDataStreamFailureStore.describe('If defined, it specifies configuration for the failure store of this data stream.').optional()
}).meta({ id: 'IndicesDataStreamOptions' })
export type IndicesDataStreamOptions = z.infer<typeof IndicesDataStreamOptions>

export const IndicesAlias = z.object({
  filter: z.lazy(() => QueryDslQueryContainer).describe('Query used to limit documents the alias can access.').optional(),
  index_routing: z.string().describe('Value used to route indexing operations to a specific shard. If specified, this overwrites the `routing` value for indexing operations.').optional(),
  is_hidden: z.boolean().describe('If `true`, the alias is hidden. All indices for the alias must have the same `is_hidden` value.').optional(),
  is_write_index: z.boolean().describe('If `true`, the index is the write index for the alias.').optional(),
  routing: z.string().describe('Value used to route indexing and search operations to a specific shard.').optional(),
  search_routing: z.string().describe('Value used to route search operations to a specific shard. If specified, this overwrites the `routing` value for search operations.').optional()
}).meta({ id: 'IndicesAlias' })
export type IndicesAlias = z.infer<typeof IndicesAlias>

/** Template equivalent of FailureStoreLifecycle that allows nullable values. */
export const IndicesFailureStoreLifecycleTemplate = z.object({
  data_retention: z.union([Duration, z.null()]).describe('If defined, every document added to this data stream will be stored at least for this time frame. Any time after this duration the document could be deleted. When empty, every document in this data stream will be stored indefinitely.').optional(),
  enabled: z.boolean().describe('If defined, it turns data stream lifecycle on/off (`true`/`false`) for this data stream. A data stream lifecycle that\'s disabled (enabled: `false`) will have no effect on the data stream.').optional()
}).meta({ id: 'IndicesFailureStoreLifecycleTemplate' })
export type IndicesFailureStoreLifecycleTemplate = z.infer<typeof IndicesFailureStoreLifecycleTemplate>

/** Template equivalent of DataStreamFailureStore that allows nullable values. */
export const IndicesDataStreamFailureStoreTemplate = z.object({
  enabled: z.union([z.boolean(), z.null()]).describe('If defined, it turns the failure store on/off (`true`/`false`) for this data stream. A data stream failure store that\'s disabled (enabled: `false`) will redirect no new failed indices to the failure store; however, it will not remove any existing data from the failure store.').optional(),
  lifecycle: z.union([IndicesFailureStoreLifecycleTemplate, z.null()]).describe('If defined, it specifies the lifecycle configuration for the failure store of this data stream.').optional()
}).meta({ id: 'IndicesDataStreamFailureStoreTemplate' })
export type IndicesDataStreamFailureStoreTemplate = z.infer<typeof IndicesDataStreamFailureStoreTemplate>

/** Data stream options template contains the same information as DataStreamOptions but allows them to be set explicitly to null. */
export const IndicesDataStreamOptionsTemplate = z.object({
  failure_store: z.union([IndicesDataStreamFailureStoreTemplate, z.null()]).optional()
}).meta({ id: 'IndicesDataStreamOptionsTemplate' })
export type IndicesDataStreamOptionsTemplate = z.infer<typeof IndicesDataStreamOptionsTemplate>

export const IndicesPutIndexTemplateIndexTemplateMapping = z.object({
  aliases: z.record(IndexName, IndicesAlias).describe('Aliases to add. If the index template includes a `data_stream` object, these are data stream aliases. Otherwise, these are index aliases. Data stream aliases ignore the `index_routing`, `routing`, and `search_routing` options.').optional(),
  mappings: z.lazy(() => MappingTypeMapping).describe('Mapping for fields in the index. If specified, this mapping can include field names, field data types, and mapping parameters.').optional(),
  settings: z.lazy(() => IndicesIndexSettings).describe('Configuration options for the index.').optional(),
  lifecycle: IndicesDataStreamLifecycle.optional(),
  data_stream_options: z.union([IndicesDataStreamOptionsTemplate, z.null()]).optional()
}).meta({ id: 'IndicesPutIndexTemplateIndexTemplateMapping' })
export type IndicesPutIndexTemplateIndexTemplateMapping = z.infer<typeof IndicesPutIndexTemplateIndexTemplateMapping>

export const IndicesManagedBy = z.enum(['Index Lifecycle Management', 'Data stream lifecycle', 'Unmanaged']).meta({ id: 'IndicesManagedBy' })
export type IndicesManagedBy = z.infer<typeof IndicesManagedBy>

export const IndicesIndexMode = z.enum(['standard', 'time_series', 'logsdb', 'lookup']).meta({ id: 'IndicesIndexMode' })
export type IndicesIndexMode = z.infer<typeof IndicesIndexMode>

export const IndicesDataStreamIndex = z.object({
  index_name: IndexName.describe('Name of the backing index.'),
  index_uuid: Uuid.describe('Universally unique identifier (UUID) for the index.'),
  ilm_policy: Name.describe('Name of the current ILM lifecycle policy configured for this backing index.').optional(),
  managed_by: IndicesManagedBy.describe('Name of the lifecycle system that\'s currently managing this backing index.').optional(),
  prefer_ilm: z.boolean().describe('Indicates if ILM should take precedence over DSL in case both are configured to manage this index.').optional(),
  index_mode: IndicesIndexMode.describe('The index mode of this backing index of the data stream.').optional()
}).meta({ id: 'IndicesDataStreamIndex' })
export type IndicesDataStreamIndex = z.infer<typeof IndicesDataStreamIndex>

export const IndicesFailureStore = z.object({
  enabled: z.boolean(),
  indices: z.array(IndicesDataStreamIndex),
  rollover_on_write: z.boolean()
}).meta({ id: 'IndicesFailureStore' })
export type IndicesFailureStore = z.infer<typeof IndicesFailureStore>

export const IndicesDataStreamTimestampField = z.object({
  name: Field.describe('Name of the timestamp field for the data stream, which must be `@timestamp`. The `@timestamp` field must be included in every document indexed to the data stream.')
}).meta({ id: 'IndicesDataStreamTimestampField' })
export type IndicesDataStreamTimestampField = z.infer<typeof IndicesDataStreamTimestampField>

export const IndicesDataStream = z.object({
  _meta: Metadata.describe('Custom metadata for the stream, copied from the `_meta` object of the stream’s matching index template. If empty, the response omits this property.').optional(),
  allow_custom_routing: z.boolean().describe('If `true`, the data stream allows custom routing on write request.').optional(),
  failure_store: IndicesFailureStore.describe('Information about failure store backing indices').optional(),
  generation: integer.describe('Current generation for the data stream. This number acts as a cumulative count of the stream’s rollovers, starting at 1.'),
  hidden: z.boolean().describe('If `true`, the data stream is hidden.'),
  ilm_policy: Name.describe('Name of the current ILM lifecycle policy in the stream’s matching index template. This lifecycle policy is set in the `index.lifecycle.name` setting. If the template does not include a lifecycle policy, this property is not included in the response. NOTE: A data stream’s backing indices may be assigned different lifecycle policies. To retrieve the lifecycle policy for individual backing indices, use the get index settings API.').optional(),
  next_generation_managed_by: IndicesManagedBy.describe('Name of the lifecycle system that\'ll manage the next generation of the data stream.'),
  prefer_ilm: z.boolean().describe('Indicates if ILM should take precedence over DSL in case both are configured to managed this data stream.'),
  indices: z.array(IndicesDataStreamIndex).describe('Array of objects containing information about the data stream’s backing indices. The last item in this array contains information about the stream’s current write index.'),
  lifecycle: IndicesDataStreamLifecycleWithRollover.describe('Contains the configuration for the data stream lifecycle of this data stream.').optional(),
  name: DataStreamName.describe('Name of the data stream.'),
  replicated: z.boolean().describe('If `true`, the data stream is created and managed by cross-cluster replication and the local cluster can not write into this data stream or change its mappings.').optional(),
  rollover_on_write: z.boolean().describe('If `true`, the next write to this data stream will trigger a rollover first and the document will be indexed in the new backing index. If the rollover fails the indexing request will fail too.'),
  settings: z.lazy(() => IndicesIndexSettings).describe('The settings specific to this data stream that will take precedence over the settings in the matching index template.'),
  mappings: z.lazy(() => MappingTypeMapping).describe('The mappings specific to this data stream that will take precedence over the mappings in the matching index template.').optional(),
  status: HealthStatus.describe('Health status of the data stream. This health status is based on the state of the primary and replica shards of the stream’s backing indices.'),
  system: z.boolean().describe('If `true`, the data stream is created and managed by an Elastic stack component and cannot be modified through normal user interaction.').optional(),
  template: Name.describe('Name of the index template used to create the data stream’s backing indices. The template’s index pattern must match the name of this data stream.'),
  timestamp_field: IndicesDataStreamTimestampField.describe('Information about the `@timestamp` field in the data stream.'),
  index_mode: IndicesIndexMode.describe('The index mode for the data stream that will be used for newly created backing indices.').optional()
}).meta({ id: 'IndicesDataStream' })
export type IndicesDataStream = z.infer<typeof IndicesDataStream>

export const IndicesDataStreamVisibility = z.object({
  hidden: z.boolean().optional(),
  allow_custom_routing: z.boolean().optional(),
  failure_store: z.boolean().optional()
}).meta({ id: 'IndicesDataStreamVisibility' })
export type IndicesDataStreamVisibility = z.infer<typeof IndicesDataStreamVisibility>

export const IndicesDownsampleConfig = z.object({
  fixed_interval: DurationLarge.describe('The interval at which to aggregate the original time series index.'),
  sampling_method: IndicesSamplingMethod.describe('The sampling method used to reduce the documents; it can be either `aggregate` or `last_value`. Defaults to `aggregate`.').optional()
}).meta({ id: 'IndicesDownsampleConfig' })
export type IndicesDownsampleConfig = z.infer<typeof IndicesDownsampleConfig>

export const IndicesIndexState = z.object({
  aliases: z.record(IndexName, IndicesAlias).optional(),
  mappings: z.lazy(() => MappingTypeMapping).optional(),
  settings: z.lazy(() => IndicesIndexSettings).optional(),
  defaults: z.lazy(() => IndicesIndexSettings).describe('Default settings, included when the request\'s `include_default` is `true`.').optional(),
  data_stream: DataStreamName.optional(),
  lifecycle: IndicesDataStreamLifecycle.describe('Data stream lifecycle applicable if this is a data stream.').optional()
}).meta({ id: 'IndicesIndexState' })
export type IndicesIndexState = z.infer<typeof IndicesIndexState>

export const IndicesIndexTemplateSummary = z.object({
  aliases: z.record(IndexName, IndicesAlias).describe('Aliases to add. If the index template includes a `data_stream` object, these are data stream aliases. Otherwise, these are index aliases. Data stream aliases ignore the `index_routing`, `routing`, and `search_routing` options.').optional(),
  mappings: z.lazy(() => MappingTypeMapping).describe('Mapping for fields in the index. If specified, this mapping can include field names, field data types, and mapping parameters.').optional(),
  settings: z.lazy(() => IndicesIndexSettings).describe('Configuration options for the index.').optional(),
  lifecycle: IndicesDataStreamLifecycle.optional(),
  data_stream_options: IndicesDataStreamOptions.optional()
}).meta({ id: 'IndicesIndexTemplateSummary' })
export type IndicesIndexTemplateSummary = z.infer<typeof IndicesIndexTemplateSummary>

export const IndicesIndexTemplateDataStreamConfiguration = z.object({
  hidden: z.boolean().describe('If true, the data stream is hidden.').optional(),
  allow_custom_routing: z.boolean().describe('If true, the data stream supports custom routing.').optional()
}).meta({ id: 'IndicesIndexTemplateDataStreamConfiguration' })
export type IndicesIndexTemplateDataStreamConfiguration = z.infer<typeof IndicesIndexTemplateDataStreamConfiguration>

export const IndicesIndexTemplate = z.object({
  index_patterns: Names.describe('Array of wildcard (`*`) expressions used to match the names of data streams and indices during creation.'),
  composed_of: z.array(Name).describe('An ordered list of component template names. Component templates are merged in the order specified, meaning that the last component template specified has the highest precedence.'),
  template: IndicesIndexTemplateSummary.describe('Template to be applied. It may optionally include an `aliases`, `mappings`, or `settings` configuration.').optional(),
  version: VersionNumber.describe('Version number used to manage index templates externally. This number is not automatically generated by Elasticsearch.').optional(),
  priority: long.describe('Priority to determine index template precedence when a new data stream or index is created. The index template with the highest priority is chosen. If no priority is specified the template is treated as though it is of priority 0 (lowest priority). This number is not automatically generated by Elasticsearch.').optional(),
  _meta: Metadata.describe('Optional user metadata about the index template. May have any contents. This map is not automatically generated by Elasticsearch.').optional(),
  allow_auto_create: z.boolean().optional(),
  data_stream: IndicesIndexTemplateDataStreamConfiguration.describe('If this object is included, the template is used to create data streams and their backing indices. Supports an empty object. Data streams require a matching index template with a `data_stream` object.').optional(),
  deprecated: z.boolean().describe('Marks this index template as deprecated. When creating or updating a non-deprecated index template that uses deprecated components, Elasticsearch will emit a deprecation warning.').optional(),
  ignore_missing_component_templates: Names.describe('A list of component template names that are allowed to be absent.').optional(),
  created_date: DateTime.describe('Date and time when the index template was created. Only returned if the `human` query parameter is `true`.').optional(),
  created_date_millis: EpochTime.describe('Date and time when the index template was created, in milliseconds since the epoch.').optional(),
  modified_date: DateTime.describe('Date and time when the index template was last modified. Only returned if the `human` query parameter is `true`.').optional(),
  modified_date_millis: EpochTime.describe('Date and time when the index template was last modified, in milliseconds since the epoch.').optional()
}).meta({ id: 'IndicesIndexTemplate' })
export type IndicesIndexTemplate = z.infer<typeof IndicesIndexTemplate>

export const IndicesIndexTemplateSummaryWithRollover = z.object({
  lifecycle: IndicesDataStreamLifecycleWithRollover.optional(),
  aliases: z.record(IndexName, IndicesAlias).describe('Aliases to add. If the index template includes a `data_stream` object, these are data stream aliases. Otherwise, these are index aliases. Data stream aliases ignore the `index_routing`, `routing`, and `search_routing` options.').optional(),
  mappings: z.lazy(() => MappingTypeMapping).describe('Mapping for fields in the index. If specified, this mapping can include field names, field data types, and mapping parameters.').optional(),
  settings: z.lazy(() => IndicesIndexSettings).describe('Configuration options for the index.').optional(),
  data_stream_options: IndicesDataStreamOptions.optional()
}).meta({ id: 'IndicesIndexTemplateSummaryWithRollover' })
export type IndicesIndexTemplateSummaryWithRollover = z.infer<typeof IndicesIndexTemplateSummaryWithRollover>

export const IndicesIndexTemplateWithRollover = z.object({
  template: IndicesIndexTemplateSummaryWithRollover.describe('Template to be applied. It may optionally include an `aliases`, `mappings`, or `settings` configuration.').optional(),
  index_patterns: Names.describe('Array of wildcard (`*`) expressions used to match the names of data streams and indices during creation.'),
  composed_of: z.array(Name).describe('An ordered list of component template names. Component templates are merged in the order specified, meaning that the last component template specified has the highest precedence.'),
  version: VersionNumber.describe('Version number used to manage index templates externally. This number is not automatically generated by Elasticsearch.').optional(),
  priority: long.describe('Priority to determine index template precedence when a new data stream or index is created. The index template with the highest priority is chosen. If no priority is specified the template is treated as though it is of priority 0 (lowest priority). This number is not automatically generated by Elasticsearch.').optional(),
  _meta: Metadata.describe('Optional user metadata about the index template. May have any contents. This map is not automatically generated by Elasticsearch.').optional(),
  allow_auto_create: z.boolean().optional(),
  data_stream: IndicesIndexTemplateDataStreamConfiguration.describe('If this object is included, the template is used to create data streams and their backing indices. Supports an empty object. Data streams require a matching index template with a `data_stream` object.').optional(),
  deprecated: z.boolean().describe('Marks this index template as deprecated. When creating or updating a non-deprecated index template that uses deprecated components, Elasticsearch will emit a deprecation warning.').optional(),
  ignore_missing_component_templates: Names.describe('A list of component template names that are allowed to be absent.').optional(),
  created_date: DateTime.describe('Date and time when the index template was created. Only returned if the `human` query parameter is `true`.').optional(),
  created_date_millis: EpochTime.describe('Date and time when the index template was created, in milliseconds since the epoch.').optional(),
  modified_date: DateTime.describe('Date and time when the index template was last modified. Only returned if the `human` query parameter is `true`.').optional(),
  modified_date_millis: EpochTime.describe('Date and time when the index template was last modified, in milliseconds since the epoch.').optional()
}).meta({ id: 'IndicesIndexTemplateWithRollover' })
export type IndicesIndexTemplateWithRollover = z.infer<typeof IndicesIndexTemplateWithRollover>

export const IndicesIndicesBlockOptions = z.enum(['metadata', 'read', 'read_only', 'write']).meta({ id: 'IndicesIndicesBlockOptions' })
export type IndicesIndicesBlockOptions = z.infer<typeof IndicesIndicesBlockOptions>

export const IndicesTemplateMapping = z.object({
  aliases: z.record(IndexName, IndicesAlias),
  index_patterns: z.array(Name),
  mappings: z.lazy(() => MappingTypeMapping),
  order: integer,
  settings: z.record(z.string(), z.any()),
  version: VersionNumber.optional()
}).meta({ id: 'IndicesTemplateMapping' })
export type IndicesTemplateMapping = z.infer<typeof IndicesTemplateMapping>

export const IndicesAddBlockAddIndicesBlockStatus = z.object({
  name: IndexName,
  blocked: z.boolean()
}).meta({ id: 'IndicesAddBlockAddIndicesBlockStatus' })
export type IndicesAddBlockAddIndicesBlockStatus = z.infer<typeof IndicesAddBlockAddIndicesBlockStatus>

/**
 * Add an index block.
 *
 * Add an index block to an index.
 * Index blocks limit the operations allowed on an index by blocking specific operation types.
 */
export const IndicesAddBlockRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-separated list or wildcard expression of index names used to limit the request. By default, you must explicitly name the indices you are adding blocks to. To allow the adding of blocks to indices with `_all`, `*`, or other wildcard expressions, change the `action.destructive_requires_name` setting to `false`. You can update this setting in the `elasticsearch.yml` file or by using the cluster update settings API.').meta({ found_in: 'path' }),
  block: IndicesIndicesBlockOptions.describe('The block type to add to the index.').meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('The type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. It supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for the master node. If the master node is not available before the timeout expires, the request fails and returns an error. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response from all relevant nodes in the cluster after updating the cluster metadata. If no response is received before the timeout expires, the cluster metadata update still applies but the response will indicate that it was not completely acknowledged. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesAddBlockRequest' })
export type IndicesAddBlockRequest = z.infer<typeof IndicesAddBlockRequest>

export const IndicesAddBlockResponse = z.object({
  acknowledged: z.boolean(),
  shards_acknowledged: z.boolean(),
  indices: z.array(IndicesAddBlockAddIndicesBlockStatus)
}).meta({ id: 'IndicesAddBlockResponse' })
export type IndicesAddBlockResponse = z.infer<typeof IndicesAddBlockResponse>

export const IndicesAnalyzeExplainAnalyzeToken = z.object({
  bytes: z.string(),
  end_offset: long,
  keyword: z.boolean().optional(),
  position: long,
  positionLength: long,
  start_offset: long,
  termFrequency: long,
  token: z.string(),
  type: z.string()
}).catchall(z.any()).meta({ id: 'IndicesAnalyzeExplainAnalyzeToken' })
export type IndicesAnalyzeExplainAnalyzeToken = z.infer<typeof IndicesAnalyzeExplainAnalyzeToken>

export const IndicesAnalyzeAnalyzerDetail = z.object({
  name: z.string(),
  tokens: z.array(IndicesAnalyzeExplainAnalyzeToken)
}).meta({ id: 'IndicesAnalyzeAnalyzerDetail' })
export type IndicesAnalyzeAnalyzerDetail = z.infer<typeof IndicesAnalyzeAnalyzerDetail>

export const IndicesAnalyzeCharFilterDetail = z.object({
  filtered_text: z.array(z.string()),
  name: z.string()
}).meta({ id: 'IndicesAnalyzeCharFilterDetail' })
export type IndicesAnalyzeCharFilterDetail = z.infer<typeof IndicesAnalyzeCharFilterDetail>

export const IndicesAnalyzeTokenDetail = z.object({
  name: z.string(),
  tokens: z.array(IndicesAnalyzeExplainAnalyzeToken)
}).meta({ id: 'IndicesAnalyzeTokenDetail' })
export type IndicesAnalyzeTokenDetail = z.infer<typeof IndicesAnalyzeTokenDetail>

export const IndicesAnalyzeAnalyzeDetail = z.object({
  analyzer: IndicesAnalyzeAnalyzerDetail.optional(),
  charfilters: z.array(IndicesAnalyzeCharFilterDetail).optional(),
  custom_analyzer: z.boolean(),
  tokenfilters: z.array(IndicesAnalyzeTokenDetail).optional(),
  tokenizer: IndicesAnalyzeTokenDetail.optional()
}).meta({ id: 'IndicesAnalyzeAnalyzeDetail' })
export type IndicesAnalyzeAnalyzeDetail = z.infer<typeof IndicesAnalyzeAnalyzeDetail>

export const IndicesAnalyzeAnalyzeToken = z.object({
  end_offset: long,
  position: long,
  positionLength: long.optional(),
  start_offset: long,
  token: z.string(),
  type: z.string()
}).meta({ id: 'IndicesAnalyzeAnalyzeToken' })
export type IndicesAnalyzeAnalyzeToken = z.infer<typeof IndicesAnalyzeAnalyzeToken>

export const IndicesAnalyzeTextToAnalyze = z.union([z.string(), z.array(z.string())]).meta({ id: 'IndicesAnalyzeTextToAnalyze' })
export type IndicesAnalyzeTextToAnalyze = z.infer<typeof IndicesAnalyzeTextToAnalyze>

/**
 * Get tokens from text analysis.
 *
 * The analyze API performs analysis on a text string and returns the resulting tokens.
 *
 * Generating excessive amount of tokens may cause a node to run out of memory.
 * The `index.analyze.max_token_count` setting enables you to limit the number of tokens that can be produced.
 * If more than this limit of tokens gets generated, an error occurs.
 * The `_analyze` endpoint without a specified index will always use `10000` as its limit.
 */
export const IndicesAnalyzeRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('Index used to derive the analyzer. If specified, the `analyzer` or field parameter overrides this value. If no index is specified or the index does not have a default analyzer, the analyze API uses the standard analyzer.').optional().meta({ found_in: 'path' }),
  analyzer: z.string().describe('The name of the analyzer that should be applied to the provided `text`. This could be a built-in analyzer, or an analyzer that’s been configured in the index.').optional().meta({ found_in: 'body' }),
  attributes: z.array(z.string()).describe('Array of token attributes used to filter the output of the `explain` parameter.').optional().meta({ found_in: 'body' }),
  char_filter: z.array(z.lazy(() => AnalysisCharFilter)).describe('Array of character filters used to preprocess characters before the tokenizer.').optional().meta({ found_in: 'body' }),
  explain: z.boolean().describe('If `true`, the response includes token attributes and additional details.').optional().meta({ found_in: 'body' }),
  field: Field.describe('Field used to derive the analyzer. To use this parameter, you must specify an index. If specified, the `analyzer` parameter overrides this value.').optional().meta({ found_in: 'body' }),
  filter: z.array(z.lazy(() => AnalysisTokenFilter)).describe('Array of token filters used to apply after the tokenizer.').optional().meta({ found_in: 'body' }),
  normalizer: z.string().describe('Normalizer to use to convert text into a single token.').optional().meta({ found_in: 'body' }),
  text: IndicesAnalyzeTextToAnalyze.describe('Text to analyze. If an array of strings is provided, it is analyzed as a multi-value field.').optional().meta({ found_in: 'body' }),
  tokenizer: z.lazy(() => AnalysisTokenizer).describe('Tokenizer to use to convert text into tokens.').optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesAnalyzeRequest' })
export type IndicesAnalyzeRequest = z.infer<typeof IndicesAnalyzeRequest>

export const IndicesAnalyzeResponse = z.object({
  detail: IndicesAnalyzeAnalyzeDetail.optional(),
  tokens: z.array(IndicesAnalyzeAnalyzeToken).optional()
}).meta({ id: 'IndicesAnalyzeResponse' })
export type IndicesAnalyzeResponse = z.infer<typeof IndicesAnalyzeResponse>

/**
 * Cancel a migration reindex operation.
 *
 * Cancel a migration reindex attempt for a data stream or index.
 */
export const IndicesCancelMigrateReindexRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('The index or data stream name').meta({ found_in: 'path' })
}).meta({ id: 'IndicesCancelMigrateReindexRequest' })
export type IndicesCancelMigrateReindexRequest = z.infer<typeof IndicesCancelMigrateReindexRequest>

export const IndicesCancelMigrateReindexResponse = AcknowledgedResponseBase.meta({ id: 'IndicesCancelMigrateReindexResponse' })
export type IndicesCancelMigrateReindexResponse = z.infer<typeof IndicesCancelMigrateReindexResponse>

/**
 * Clear the cache.
 *
 * Clear the cache of one or more indices.
 * For data streams, the API clears the caches of the stream's backing indices.
 *
 * By default, the clear cache API clears all caches.
 * To clear only specific caches, use the `fielddata`, `query`, or `request` parameters.
 * To clear the cache only of specific fields, use the `fields` parameter.
 */
export const IndicesClearCacheRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of data streams, indices, and aliases used to limit the request. Supports wildcards (`*`). To target all data streams and indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  fielddata: z.boolean().describe('If `true`, clears the fields cache. Use the `fields` parameter to clear the cache of specific fields only.').optional().meta({ found_in: 'query' }),
  fields: Fields.describe('Comma-separated list of field names used to limit the `fielddata` parameter.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  query: z.boolean().describe('If `true`, clears the query cache.').optional().meta({ found_in: 'query' }),
  request: z.boolean().describe('If `true`, clears the request cache.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesClearCacheRequest' })
export type IndicesClearCacheRequest = z.infer<typeof IndicesClearCacheRequest>

export const IndicesClearCacheResponse = ShardsOperationResponseBase.meta({ id: 'IndicesClearCacheResponse' })
export type IndicesClearCacheResponse = z.infer<typeof IndicesClearCacheResponse>

/**
 * Clone an index.
 *
 * Clone an existing index into a new index.
 * Each original primary shard is cloned into a new primary shard in the new index.
 *
 * IMPORTANT: Elasticsearch does not apply index templates to the resulting index.
 * The API also does not copy index metadata from the original index.
 * Index metadata includes aliases, index lifecycle management phase definitions, and cross-cluster replication (CCR) follower information.
 * For example, if you clone a CCR follower index, the resulting clone will not be a follower index.
 *
 * The clone API copies most index settings from the source index to the resulting index, with the exception of `index.number_of_replicas` and `index.auto_expand_replicas`.
 * To set the number of replicas in the resulting index, configure these settings in the clone request.
 *
 * Cloning works as follows:
 *
 * * First, it creates a new target index with the same definition as the source index.
 * * Then it hard-links segments from the source index into the target index. If the file system does not support hard-linking, all segments are copied into the new index, which is a much more time consuming process.
 * * Finally, it recovers the target index as though it were a closed index which had just been re-opened.
 *
 * IMPORTANT: Indices can only be cloned if they meet the following requirements:
 *
 * * The index must be marked as read-only and have a cluster health status of green.
 * * The target index must not exist.
 * * The source index must have the same number of primary shards as the target index.
 * * The node handling the clone process must have sufficient free disk space to accommodate a second copy of the existing index.
 *
 * The current write index on a data stream cannot be cloned.
 * In order to clone the current write index, the data stream must first be rolled over so that a new write index is created and then the previous write index can be cloned.
 *
 * NOTE: Mappings cannot be specified in the `_clone` request. The mappings of the source index will be used for the target index.
 *
 * **Monitor the cloning process**
 *
 * The cloning process can be monitored with the cat recovery API or the cluster health API can be used to wait until all primary shards have been allocated by setting the `wait_for_status` parameter to `yellow`.
 *
 * The `_clone` API returns as soon as the target index has been added to the cluster state, before any shards have been allocated.
 * At this point, all shards are in the state unassigned.
 * If, for any reason, the target index can't be allocated, its primary shard will remain unassigned until it can be allocated on that node.
 *
 * Once the primary shard is allocated, it moves to state initializing, and the clone process begins.
 * When the clone operation completes, the shard will become active.
 * At that point, Elasticsearch will try to allocate any replicas and may decide to relocate the primary shard to another node.
 *
 * **Wait for active shards**
 *
 * Because the clone operation creates a new index to clone the shards to, the wait for active shards setting on index creation applies to the clone index action as well.
 */
export const IndicesCloneRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('Name of the source index to clone.').meta({ found_in: 'path' }),
  target: Name.describe('Name of the target index to create.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  wait_for_active_shards: WaitForActiveShards.describe('The number of shard copies that must be active before proceeding with the operation. Set to `all` or any positive integer up to the total number of shards in the index (`number_of_replicas+1`).').optional().meta({ found_in: 'query' }),
  aliases: z.record(IndexName, IndicesAlias).describe('Aliases for the resulting index.').optional().meta({ found_in: 'body' }),
  settings: z.record(z.string(), z.any()).describe('Configuration options for the target index.').optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesCloneRequest' })
export type IndicesCloneRequest = z.infer<typeof IndicesCloneRequest>

export const IndicesCloneResponse = z.object({
  acknowledged: z.boolean(),
  index: IndexName,
  shards_acknowledged: z.boolean()
}).meta({ id: 'IndicesCloneResponse' })
export type IndicesCloneResponse = z.infer<typeof IndicesCloneResponse>

export const IndicesCloseCloseShardResult = z.object({
  failures: z.array(ShardFailure)
}).meta({ id: 'IndicesCloseCloseShardResult' })
export type IndicesCloseCloseShardResult = z.infer<typeof IndicesCloseCloseShardResult>

export const IndicesCloseCloseIndexResult = z.object({
  closed: z.boolean(),
  shards: z.record(z.string(), IndicesCloseCloseShardResult).optional()
}).meta({ id: 'IndicesCloseCloseIndexResult' })
export type IndicesCloseCloseIndexResult = z.infer<typeof IndicesCloseCloseIndexResult>

/**
 * Close an index.
 *
 * A closed index is blocked for read or write operations and does not allow all operations that opened indices allow.
 * It is not possible to index documents or to search for documents in a closed index.
 * Closed indices do not have to maintain internal data structures for indexing or searching documents, which results in a smaller overhead on the cluster.
 *
 * When opening or closing an index, the master node is responsible for restarting the index shards to reflect the new state of the index.
 * The shards will then go through the normal recovery process.
 * The data of opened and closed indices is automatically replicated by the cluster to ensure that enough shard copies are safely kept around at all times.
 *
 * You can open and close multiple indices.
 * An error is thrown if the request explicitly refers to a missing index.
 * This behaviour can be turned off using the `ignore_unavailable=true` parameter.
 *
 * By default, you must explicitly name the indices you are opening or closing.
 * To open or close indices with `_all`, `*`, or other wildcard expressions, change the` action.destructive_requires_name` setting to `false`. This setting can also be changed with the cluster update settings API.
 *
 * Closed indices consume a significant amount of disk-space which can cause problems in managed environments.
 * Closing indices can be turned off with the cluster settings API by setting `cluster.indices.close.enable` to `false`.
 */
export const IndicesCloseRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list or wildcard expression of index names used to limit the request.').meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  wait_for_active_shards: WaitForActiveShards.describe('The number of shard copies that must be active before proceeding with the operation. Set to `all` or any positive integer up to the total number of shards in the index (`number_of_replicas+1`).').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesCloseRequest' })
export type IndicesCloseRequest = z.infer<typeof IndicesCloseRequest>

export const IndicesCloseResponse = z.object({
  acknowledged: z.boolean(),
  indices: z.record(IndexName, IndicesCloseCloseIndexResult),
  shards_acknowledged: z.boolean()
}).meta({ id: 'IndicesCloseResponse' })
export type IndicesCloseResponse = z.infer<typeof IndicesCloseResponse>

/**
 * Create an index.
 *
 * You can use the create index API to add a new index to an Elasticsearch cluster.
 * When creating an index, you can specify the following:
 *
 * * Settings for the index.
 * * Mappings for fields in the index.
 * * Index aliases
 *
 * **Wait for active shards**
 *
 * By default, index creation will only return a response to the client when the primary copies of each shard have been started, or the request times out.
 * The index creation response will indicate what happened.
 * For example, `acknowledged` indicates whether the index was successfully created in the cluster, `while shards_acknowledged` indicates whether the requisite number of shard copies were started for each shard in the index before timing out.
 * Note that it is still possible for either `acknowledged` or `shards_acknowledged` to be `false`, but for the index creation to be successful.
 * These values simply indicate whether the operation completed before the timeout.
 * If `acknowledged` is false, the request timed out before the cluster state was updated with the newly created index, but it probably will be created sometime soon.
 * If `shards_acknowledged` is false, then the request timed out before the requisite number of shards were started (by default just the primaries), even if the cluster state was successfully updated to reflect the newly created index (that is to say, `acknowledged` is `true`).
 *
 * You can change the default of only waiting for the primary shards to start through the index setting `index.write.wait_for_active_shards`.
 * Note that changing this setting will also affect the `wait_for_active_shards` value on all subsequent write operations.
 */
export const IndicesCreateRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('Name of the index you wish to create. Index names must meet the following criteria: * Lowercase only * Cannot include ``, `/`, `*`, `?`, `"`, `<`, `>`, `|`, ` ` (space character), `,`, or `#` * Indices prior to 7.0 could contain a colon (`:`), but that has been deprecated and will not be supported in later versions * Cannot start with `-`, `_`, or `+` * Cannot be `.` or `..` * Cannot be longer than 255 bytes (note thtat it is bytes, so multi-byte characters will reach the limit faster) * Names starting with `.` are deprecated, except for hidden indices and internal indices managed by plugins').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  wait_for_active_shards: WaitForActiveShards.describe('The number of shard copies that must be active before proceeding with the operation. Set to `all` or any positive integer up to the total number of shards in the index (`number_of_replicas+1`).').optional().meta({ found_in: 'query' }),
  aliases: z.record(Name, IndicesAlias).describe('Aliases for the index.').optional().meta({ found_in: 'body' }),
  mappings: z.lazy(() => MappingTypeMapping).describe('Mapping for fields in the index. If specified, this mapping can include: - Field names - Field data types - Mapping parameters').optional().meta({ found_in: 'body' }),
  settings: z.lazy(() => IndicesIndexSettings).describe('Configuration options for the index.').optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesCreateRequest' })
export type IndicesCreateRequest = z.infer<typeof IndicesCreateRequest>

export const IndicesCreateResponse = z.object({
  index: IndexName,
  shards_acknowledged: z.boolean(),
  acknowledged: z.boolean()
}).meta({ id: 'IndicesCreateResponse' })
export type IndicesCreateResponse = z.infer<typeof IndicesCreateResponse>

/**
 * Create a data stream.
 *
 * You must have a matching index template with data stream enabled.
 */
export const IndicesCreateDataStreamRequest = z.object({
  ...RequestBase.shape,
  name: DataStreamName.describe('Name of the data stream, which must meet the following criteria: Lowercase only; Cannot include ``, `/`, `*`, `?`, `"`, `<`, `>`, `|`, `,`, `#`, `:`, or a space character; Cannot start with `-`, `_`, `+`, or `.ds-`; Cannot be `.` or `..`; Cannot be longer than 255 bytes. Multi-byte characters count towards this limit faster.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesCreateDataStreamRequest' })
export type IndicesCreateDataStreamRequest = z.infer<typeof IndicesCreateDataStreamRequest>

export const IndicesCreateDataStreamResponse = AcknowledgedResponseBase.meta({ id: 'IndicesCreateDataStreamResponse' })
export type IndicesCreateDataStreamResponse = z.infer<typeof IndicesCreateDataStreamResponse>

export const IndicesCreateFromCreateFrom = z.object({
  mappings_override: z.lazy(() => MappingTypeMapping).describe('Mappings overrides to be applied to the destination index (optional)').optional(),
  settings_override: z.lazy(() => IndicesIndexSettings).describe('Settings overrides to be applied to the destination index (optional)').optional(),
  remove_index_blocks: z.boolean().describe('If index blocks should be removed when creating destination index (optional)').optional()
}).meta({ id: 'IndicesCreateFromCreateFrom' })
export type IndicesCreateFromCreateFrom = z.infer<typeof IndicesCreateFromCreateFrom>

/**
 * Create an index from a source index.
 *
 * Copy the mappings and settings from the source index to a destination index while allowing request settings and mappings to override the source values.
 */
export const IndicesCreateFromRequest = z.object({
  ...RequestBase.shape,
  source: IndexName.describe('The source index or data stream name').meta({ found_in: 'path' }),
  dest: IndexName.describe('The destination index or data stream name').meta({ found_in: 'path' }),
  create_from: IndicesCreateFromCreateFrom.optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesCreateFromRequest' })
export type IndicesCreateFromRequest = z.infer<typeof IndicesCreateFromRequest>

export const IndicesCreateFromResponse = z.object({
  acknowledged: z.boolean(),
  index: IndexName,
  shards_acknowledged: z.boolean()
}).meta({ id: 'IndicesCreateFromResponse' })
export type IndicesCreateFromResponse = z.infer<typeof IndicesCreateFromResponse>

export const IndicesDataStreamsStatsDataStreamsStatsItem = z.object({
  backing_indices: integer.describe('Current number of backing indices for the data stream.'),
  data_stream: Name.describe('Name of the data stream.'),
  maximum_timestamp: EpochTime.describe('The data stream’s highest `@timestamp` value, converted to milliseconds since the Unix epoch. NOTE: This timestamp is provided as a best effort. The data stream may contain `@timestamp` values higher than this if one or more of the following conditions are met: The stream contains closed backing indices; Backing indices with a lower generation contain higher `@timestamp` values.'),
  store_size: ByteSize.describe('Total size of all shards for the data stream’s backing indices. This parameter is only returned if the `human` query parameter is `true`.').optional(),
  store_size_bytes: long.describe('Total size, in bytes, of all shards for the data stream’s backing indices.')
}).meta({ id: 'IndicesDataStreamsStatsDataStreamsStatsItem' })
export type IndicesDataStreamsStatsDataStreamsStatsItem = z.infer<typeof IndicesDataStreamsStatsDataStreamsStatsItem>

/**
 * Get data stream stats.
 *
 * Get statistics for one or more data streams.
 */
export const IndicesDataStreamsStatsRequest = z.object({
  ...RequestBase.shape,
  name: Indices.describe('Comma-separated list of data streams used to limit the request. Wildcard expressions (`*`) are supported. To target all data streams in a cluster, omit this parameter or use `*`.').optional().meta({ found_in: 'path' }),
  expand_wildcards: ExpandWildcards.describe('Type of data stream that wildcard patterns can match. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesDataStreamsStatsRequest' })
export type IndicesDataStreamsStatsRequest = z.infer<typeof IndicesDataStreamsStatsRequest>

export const IndicesDataStreamsStatsResponse = z.object({
  _shards: ShardStatistics.describe('Contains information about shards that attempted to execute the request.'),
  backing_indices: integer.describe('Total number of backing indices for the selected data streams.'),
  data_stream_count: integer.describe('Total number of selected data streams.'),
  data_streams: z.array(IndicesDataStreamsStatsDataStreamsStatsItem).describe('Contains statistics for the selected data streams.'),
  total_store_sizes: ByteSize.describe('Total size of all shards for the selected data streams. This property is included only if the `human` query parameter is `true`').optional(),
  total_store_size_bytes: long.describe('Total size, in bytes, of all shards for the selected data streams.')
}).meta({ id: 'IndicesDataStreamsStatsResponse' })
export type IndicesDataStreamsStatsResponse = z.infer<typeof IndicesDataStreamsStatsResponse>

/**
 * Delete indices.
 *
 * Deleting an index deletes its documents, shards, and metadata.
 * It does not delete related Kibana components, such as data views, visualizations, or dashboards.
 *
 * You cannot delete the current write index of a data stream.
 * To delete the index, you must roll over the data stream so a new write index is created.
 * You can then use the delete index API to delete the previous write index.
 */
export const IndicesDeleteRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of indices to delete. You cannot specify index aliases. By default, this parameter does not support wildcards (`*`) or `_all`. To use wildcards or `_all`, set the `action.destructive_requires_name` cluster setting to `false`.').meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesDeleteRequest' })
export type IndicesDeleteRequest = z.infer<typeof IndicesDeleteRequest>

export const IndicesDeleteResponse = IndicesResponseBase.meta({ id: 'IndicesDeleteResponse' })
export type IndicesDeleteResponse = z.infer<typeof IndicesDeleteResponse>

export const IndicesDeleteAliasIndicesAliasesResponseBody = z.object({
  ...AcknowledgedResponseBase.shape,
  errors: z.boolean().optional()
}).meta({ id: 'IndicesDeleteAliasIndicesAliasesResponseBody' })
export type IndicesDeleteAliasIndicesAliasesResponseBody = z.infer<typeof IndicesDeleteAliasIndicesAliasesResponseBody>

/**
 * Delete an alias.
 *
 * Removes a data stream or index from an alias.
 */
export const IndicesDeleteAliasRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of data streams or indices used to limit the request. Supports wildcards (`*`).').meta({ found_in: 'path' }),
  name: Names.describe('Comma-separated list of aliases to remove. Supports wildcards (`*`). To remove all aliases, use `*` or `_all`.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesDeleteAliasRequest' })
export type IndicesDeleteAliasRequest = z.infer<typeof IndicesDeleteAliasRequest>

export const IndicesDeleteAliasResponse = IndicesDeleteAliasIndicesAliasesResponseBody.meta({ id: 'IndicesDeleteAliasResponse' })
export type IndicesDeleteAliasResponse = z.infer<typeof IndicesDeleteAliasResponse>

/**
 * Delete data stream lifecycles.
 *
 * Removes the data stream lifecycle from a data stream, rendering it not managed by the data stream lifecycle.
 */
export const IndicesDeleteDataLifecycleRequest = z.object({
  ...RequestBase.shape,
  name: DataStreamNames.describe('A comma-separated list of data streams of which the data stream lifecycle will be deleted. Use `*` to get all data streams').meta({ found_in: 'path' }),
  expand_wildcards: ExpandWildcards.describe('Whether wildcard expressions should get expanded to open or closed indices (default: open)').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesDeleteDataLifecycleRequest' })
export type IndicesDeleteDataLifecycleRequest = z.infer<typeof IndicesDeleteDataLifecycleRequest>

export const IndicesDeleteDataLifecycleResponse = AcknowledgedResponseBase.meta({ id: 'IndicesDeleteDataLifecycleResponse' })
export type IndicesDeleteDataLifecycleResponse = z.infer<typeof IndicesDeleteDataLifecycleResponse>

/**
 * Delete data streams.
 *
 * Deletes one or more data streams and their backing indices.
 */
export const IndicesDeleteDataStreamRequest = z.object({
  ...RequestBase.shape,
  name: DataStreamNames.describe('Comma-separated list of data streams to delete. Wildcard (`*`) expressions are supported.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of data stream that wildcard patterns can match. Supports comma-separated values,such as `open,hidden`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesDeleteDataStreamRequest' })
export type IndicesDeleteDataStreamRequest = z.infer<typeof IndicesDeleteDataStreamRequest>

export const IndicesDeleteDataStreamResponse = AcknowledgedResponseBase.meta({ id: 'IndicesDeleteDataStreamResponse' })
export type IndicesDeleteDataStreamResponse = z.infer<typeof IndicesDeleteDataStreamResponse>

/**
 * Delete data stream options.
 *
 * Removes the data stream options from a data stream.
 */
export const IndicesDeleteDataStreamOptionsRequest = z.object({
  ...RequestBase.shape,
  name: DataStreamNames.describe('A comma-separated list of data streams of which the data stream options will be deleted. Use `*` to get all data streams').meta({ found_in: 'path' }),
  expand_wildcards: ExpandWildcards.describe('Whether wildcard expressions should get expanded to open or closed indices').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesDeleteDataStreamOptionsRequest' })
export type IndicesDeleteDataStreamOptionsRequest = z.infer<typeof IndicesDeleteDataStreamOptionsRequest>

export const IndicesDeleteDataStreamOptionsResponse = AcknowledgedResponseBase.meta({ id: 'IndicesDeleteDataStreamOptionsResponse' })
export type IndicesDeleteDataStreamOptionsResponse = z.infer<typeof IndicesDeleteDataStreamOptionsResponse>

/**
 * Delete an index template.
 *
 * The provided <index-template> may contain multiple template names separated by a comma. If multiple template
 * names are specified then there is no wildcard support and the provided names should match completely with
 * existing templates.
 */
export const IndicesDeleteIndexTemplateRequest = z.object({
  ...RequestBase.shape,
  name: Names.describe('Comma-separated list of index template names used to limit the request. Wildcard (*) expressions are supported.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesDeleteIndexTemplateRequest' })
export type IndicesDeleteIndexTemplateRequest = z.infer<typeof IndicesDeleteIndexTemplateRequest>

export const IndicesDeleteIndexTemplateResponse = AcknowledgedResponseBase.meta({ id: 'IndicesDeleteIndexTemplateResponse' })
export type IndicesDeleteIndexTemplateResponse = z.infer<typeof IndicesDeleteIndexTemplateResponse>

/**
 * Delete a legacy index template.
 *
 * IMPORTANT: This documentation is about legacy index templates, which are deprecated and will be replaced by the composable templates introduced in Elasticsearch 7.8.
 * @deprecated
 */
export const IndicesDeleteTemplateRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the legacy index template to delete. Wildcard (`*`) expressions are supported.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesDeleteTemplateRequest' })
export type IndicesDeleteTemplateRequest = z.infer<typeof IndicesDeleteTemplateRequest>

export const IndicesDeleteTemplateResponse = AcknowledgedResponseBase.meta({ id: 'IndicesDeleteTemplateResponse' })
export type IndicesDeleteTemplateResponse = z.infer<typeof IndicesDeleteTemplateResponse>

/**
 * Analyze the index disk usage.
 *
 * Analyze the disk usage of each field of an index or data stream.
 * This API might not support indices created in previous Elasticsearch versions.
 * The result of a small index can be inaccurate as some parts of an index might not be analyzed by the API.
 *
 * NOTE: The total size of fields of the analyzed shards of the index in the response is usually smaller than the index `store_size` value because some small metadata files are ignored and some parts of data files might not be scanned by the API.
 * Since stored fields are stored together in a compressed format, the sizes of stored fields are also estimates and can be inaccurate.
 * The stored size of the `_id` field is likely underestimated while the `_source` field is overestimated.
 *
 * For usage examples see the External documentation or refer to [Analyze the index disk usage example](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/index-disk-usage) for an example.
 */
export const IndicesDiskUsageRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of data streams, indices, and aliases used to limit the request. It’s recommended to execute this API with a single index (or the latest backing index of a data stream) as the API consumes resources significantly.').meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  flush: z.boolean().describe('If `true`, the API performs a flush before analysis. If `false`, the response may not include uncommitted data.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  run_expensive_tasks: z.boolean().describe('Analyzing field disk usage is resource-intensive. To use the API, this parameter must be set to `true`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesDiskUsageRequest' })
export type IndicesDiskUsageRequest = z.infer<typeof IndicesDiskUsageRequest>

export const IndicesDiskUsageResponse = z.any().meta({ id: 'IndicesDiskUsageResponse' })
export type IndicesDiskUsageResponse = z.infer<typeof IndicesDiskUsageResponse>

/**
 * Downsample an index.
 *
 * Downsamples a time series (TSDS) index and reduces its size by keeping the last value or by pre-aggregating metrics:
 *
 * - When running in `aggregate` mode, it pre-calculates and stores statistical summaries (`min`, `max`, `sum`, `value_count` and `avg`)
 * for each metric field grouped by a configured time interval and their dimensions.
 * - When running in `last_value` mode, it keeps the last value for each metric in the configured interval and their dimensions.
 *
 * For example, a TSDS index that contains metrics sampled every 10 seconds can be downsampled to an hourly index.
 * All documents within an hour interval are summarized and stored as a single document in the downsample index.
 *
 * NOTE: Only indices in a time series data stream are supported.
 * Neither field nor document level security can be defined on the source index.
 * The source index must be read-only (`index.blocks.write: true`).
 */
export const IndicesDownsampleRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('Name of the time series index to downsample.').meta({ found_in: 'path' }),
  target_index: IndexName.describe('Name of the index to create.').meta({ found_in: 'path' }),
  config: IndicesDownsampleConfig.optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesDownsampleRequest' })
export type IndicesDownsampleRequest = z.infer<typeof IndicesDownsampleRequest>

export const IndicesDownsampleResponse = z.any().meta({ id: 'IndicesDownsampleResponse' })
export type IndicesDownsampleResponse = z.infer<typeof IndicesDownsampleResponse>

/**
 * Check indices.
 *
 * Check if one or more indices, index aliases, or data streams exist.
 */
export const IndicesExistsRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of data streams, indices, and aliases. Supports wildcards (`*`).').meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  flat_settings: z.boolean().describe('If `true`, returns settings in flat format.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  include_defaults: z.boolean().describe('If `true`, return all default settings in the response.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request retrieves information from the local node only.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesExistsRequest' })
export type IndicesExistsRequest = z.infer<typeof IndicesExistsRequest>

export const IndicesExistsResponse = z.boolean().meta({ id: 'IndicesExistsResponse' })
export type IndicesExistsResponse = z.infer<typeof IndicesExistsResponse>

/**
 * Check aliases.
 *
 * Check if one or more data stream or index aliases exist.
 */
export const IndicesExistsAliasRequest = z.object({
  ...RequestBase.shape,
  name: Names.describe('Comma-separated list of aliases to check. Supports wildcards (`*`).').meta({ found_in: 'path' }),
  index: Indices.describe('Comma-separated list of data streams or indices used to limit the request. Supports wildcards (`*`). To target all data streams and indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesExistsAliasRequest' })
export type IndicesExistsAliasRequest = z.infer<typeof IndicesExistsAliasRequest>

export const IndicesExistsAliasResponse = z.boolean().meta({ id: 'IndicesExistsAliasResponse' })
export type IndicesExistsAliasResponse = z.infer<typeof IndicesExistsAliasResponse>

/**
 * Check index templates.
 *
 * Check whether index templates exist.
 */
export const IndicesExistsIndexTemplateRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('Comma-separated list of index template names used to limit the request. Wildcard (*) expressions are supported.').meta({ found_in: 'path' }),
  local: z.boolean().describe('If true, the request retrieves information from the local node only. Defaults to false, which means information is retrieved from the master node.').optional().meta({ found_in: 'query' }),
  flat_settings: z.boolean().describe('If true, returns settings in flat format.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesExistsIndexTemplateRequest' })
export type IndicesExistsIndexTemplateRequest = z.infer<typeof IndicesExistsIndexTemplateRequest>

export const IndicesExistsIndexTemplateResponse = z.boolean().meta({ id: 'IndicesExistsIndexTemplateResponse' })
export type IndicesExistsIndexTemplateResponse = z.infer<typeof IndicesExistsIndexTemplateResponse>

/**
 * Check existence of index templates.
 *
 * Get information about whether index templates exist.
 * Index templates define settings, mappings, and aliases that can be applied automatically to new indices.
 *
 * IMPORTANT: This documentation is about legacy index templates, which are deprecated and will be replaced by the composable templates introduced in Elasticsearch 7.8.
 */
export const IndicesExistsTemplateRequest = z.object({
  ...RequestBase.shape,
  name: Names.describe('A comma-separated list of index template names used to limit the request. Wildcard (`*`) expressions are supported.').meta({ found_in: 'path' }),
  flat_settings: z.boolean().describe('Indicates whether to use a flat format for the response.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('Indicates whether to get information from the local node only.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for the master node. If the master node is not available before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesExistsTemplateRequest' })
export type IndicesExistsTemplateRequest = z.infer<typeof IndicesExistsTemplateRequest>

export const IndicesExistsTemplateResponse = z.boolean().meta({ id: 'IndicesExistsTemplateResponse' })
export type IndicesExistsTemplateResponse = z.infer<typeof IndicesExistsTemplateResponse>

export const IndicesExplainDataLifecycleDataStreamLifecycleExplain = z.object({
  index: IndexName,
  managed_by_lifecycle: z.boolean(),
  index_creation_date_millis: EpochTime.optional(),
  time_since_index_creation: Duration.optional(),
  rollover_date_millis: EpochTime.optional(),
  time_since_rollover: Duration.optional(),
  lifecycle: IndicesDataStreamLifecycleWithRollover.optional(),
  generation_time: Duration.optional(),
  error: z.string().optional()
}).meta({ id: 'IndicesExplainDataLifecycleDataStreamLifecycleExplain' })
export type IndicesExplainDataLifecycleDataStreamLifecycleExplain = z.infer<typeof IndicesExplainDataLifecycleDataStreamLifecycleExplain>

/**
 * Get the status for a data stream lifecycle.
 *
 * Get information about an index or data stream's current data stream lifecycle status, such as time since index creation, time since rollover, the lifecycle configuration managing the index, or any errors encountered during lifecycle execution.
 */
export const IndicesExplainDataLifecycleRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of index names to explain').meta({ found_in: 'path' }),
  include_defaults: z.boolean().describe('Indicates if the API should return the default values the system uses for the index\'s lifecycle').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesExplainDataLifecycleRequest' })
export type IndicesExplainDataLifecycleRequest = z.infer<typeof IndicesExplainDataLifecycleRequest>

export const IndicesExplainDataLifecycleResponse = z.object({
  indices: z.record(IndexName, IndicesExplainDataLifecycleDataStreamLifecycleExplain)
}).meta({ id: 'IndicesExplainDataLifecycleResponse' })
export type IndicesExplainDataLifecycleResponse = z.infer<typeof IndicesExplainDataLifecycleResponse>

export const IndicesFieldUsageStatsInvertedIndex = z.object({
  terms: uint,
  postings: uint,
  proximity: uint,
  positions: uint,
  term_frequencies: uint,
  offsets: uint,
  payloads: uint
}).meta({ id: 'IndicesFieldUsageStatsInvertedIndex' })
export type IndicesFieldUsageStatsInvertedIndex = z.infer<typeof IndicesFieldUsageStatsInvertedIndex>

export const IndicesFieldUsageStatsFieldSummary = z.object({
  any: uint,
  stored_fields: uint,
  doc_values: uint,
  points: uint,
  norms: uint,
  term_vectors: uint,
  knn_vectors: uint,
  inverted_index: IndicesFieldUsageStatsInvertedIndex
}).meta({ id: 'IndicesFieldUsageStatsFieldSummary' })
export type IndicesFieldUsageStatsFieldSummary = z.infer<typeof IndicesFieldUsageStatsFieldSummary>

export const IndicesFieldUsageStatsFieldsUsageBody = z.object({
  _shards: ShardStatistics
}).catchall(z.any()).meta({ id: 'IndicesFieldUsageStatsFieldsUsageBody' })
export type IndicesFieldUsageStatsFieldsUsageBody = z.infer<typeof IndicesFieldUsageStatsFieldsUsageBody>

/**
 * Get field usage stats.
 *
 * Get field usage information for each shard and field of an index.
 * Field usage statistics are automatically captured when queries are running on a cluster.
 * A shard-level search request that accesses a given field, even if multiple times during that request, is counted as a single use.
 *
 * The response body reports the per-shard usage count of the data structures that back the fields in the index.
 * A given request will increment each count by a maximum value of 1, even if the request accesses the same field multiple times.
 */
export const IndicesFieldUsageStatsRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list or wildcard expression of index names used to limit the request.').meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  fields: Fields.describe('Comma-separated list or wildcard expressions of fields to include in the statistics.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesFieldUsageStatsRequest' })
export type IndicesFieldUsageStatsRequest = z.infer<typeof IndicesFieldUsageStatsRequest>

export const IndicesFieldUsageStatsResponse = IndicesFieldUsageStatsFieldsUsageBody.meta({ id: 'IndicesFieldUsageStatsResponse' })
export type IndicesFieldUsageStatsResponse = z.infer<typeof IndicesFieldUsageStatsResponse>

export const IndicesFieldUsageStatsShardsStats = z.object({
  all_fields: IndicesFieldUsageStatsFieldSummary,
  fields: z.record(Field, IndicesFieldUsageStatsFieldSummary)
}).meta({ id: 'IndicesFieldUsageStatsShardsStats' })
export type IndicesFieldUsageStatsShardsStats = z.infer<typeof IndicesFieldUsageStatsShardsStats>

export const IndicesStatsShardRouting = z.object({
  node: z.string(),
  primary: z.boolean(),
  relocating_node: z.union([z.string(), z.null()]).optional(),
  state: IndicesStatsShardRoutingState
}).meta({ id: 'IndicesStatsShardRouting' })
export type IndicesStatsShardRouting = z.infer<typeof IndicesStatsShardRouting>

export const IndicesFieldUsageStatsUsageStatsShards = z.object({
  routing: IndicesStatsShardRouting,
  stats: IndicesFieldUsageStatsShardsStats,
  tracking_id: z.string(),
  tracking_started_at_millis: EpochTime
}).meta({ id: 'IndicesFieldUsageStatsUsageStatsShards' })
export type IndicesFieldUsageStatsUsageStatsShards = z.infer<typeof IndicesFieldUsageStatsUsageStatsShards>

export const IndicesFieldUsageStatsUsageStatsIndex = z.object({
  shards: z.array(IndicesFieldUsageStatsUsageStatsShards)
}).meta({ id: 'IndicesFieldUsageStatsUsageStatsIndex' })
export type IndicesFieldUsageStatsUsageStatsIndex = z.infer<typeof IndicesFieldUsageStatsUsageStatsIndex>

/**
 * Flush data streams or indices.
 *
 * Flushing a data stream or index is the process of making sure that any data that is currently only stored in the transaction log is also permanently stored in the Lucene index.
 * When restarting, Elasticsearch replays any unflushed operations from the transaction log into the Lucene index to bring it back into the state that it was in before the restart.
 * Elasticsearch automatically triggers flushes as needed, using heuristics that trade off the size of the unflushed transaction log against the cost of performing each flush.
 *
 * After each operation has been flushed it is permanently stored in the Lucene index.
 * This may mean that there is no need to maintain an additional copy of it in the transaction log.
 * The transaction log is made up of multiple files, called generations, and Elasticsearch will delete any generation files when they are no longer needed, freeing up disk space.
 *
 * It is also possible to trigger a flush on one or more indices using the flush API, although it is rare for users to need to call this API directly.
 * If you call the flush API after indexing some documents then a successful response indicates that Elasticsearch has flushed all the documents that were indexed before the flush API was called.
 */
export const IndicesFlushRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of data streams, indices, and aliases to flush. Supports wildcards (`*`). To flush all data streams and indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  force: z.boolean().describe('If `true`, the request forces a flush even if there are no changes to commit to the index.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  wait_if_ongoing: z.boolean().describe('If `true`, the flush operation blocks until execution when another flush operation is running. If `false`, Elasticsearch returns an error if you request a flush when another flush operation is running.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesFlushRequest' })
export type IndicesFlushRequest = z.infer<typeof IndicesFlushRequest>

export const IndicesFlushResponse = ShardsOperationResponseBase.meta({ id: 'IndicesFlushResponse' })
export type IndicesFlushResponse = z.infer<typeof IndicesFlushResponse>

/**
 * Force a merge.
 *
 * Perform the force merge operation on the shards of one or more indices.
 * For data streams, the API forces a merge on the shards of the stream's backing indices.
 *
 * Merging reduces the number of segments in each shard by merging some of them together and also frees up the space used by deleted documents.
 * Merging normally happens automatically, but sometimes it is useful to trigger a merge manually.
 *
 * WARNING: We recommend force merging only a read-only index (meaning the index is no longer receiving writes).
 * When documents are updated or deleted, the old version is not immediately removed but instead soft-deleted and marked with a "tombstone".
 * These soft-deleted documents are automatically cleaned up during regular segment merges.
 * But force merge can cause very large (greater than 5 GB) segments to be produced, which are not eligible for regular merges.
 * So the number of soft-deleted documents can then grow rapidly, resulting in higher disk usage and worse search performance.
 * If you regularly force merge an index receiving writes, this can also make snapshots more expensive, since the new documents can't be backed up incrementally.
 *
 * **Blocks during a force merge**
 *
 * Calls to this API block until the merge is complete (unless request contains `wait_for_completion=false`).
 * If the client connection is lost before completion then the force merge process will continue in the background.
 * Any new requests to force merge the same indices will also block until the ongoing force merge is complete.
 *
 * **Running force merge asynchronously**
 *
 * If the request contains `wait_for_completion=false`, Elasticsearch performs some preflight checks, launches the request, and returns a task you can use to get the status of the task.
 * However, you can not cancel this task as the force merge task is not cancelable.
 * Elasticsearch creates a record of this task as a document at `_tasks/<task_id>`.
 * When you are done with a task, you should delete the task document so Elasticsearch can reclaim the space.
 *
 * **Force merging multiple indices**
 *
 * You can force merge multiple indices with a single request by targeting:
 *
 * * One or more data streams that contain multiple backing indices
 * * Multiple indices
 * * One or more aliases
 * * All data streams and indices in a cluster
 *
 * Each targeted shard is force-merged separately using the force_merge threadpool.
 * By default each node only has a single `force_merge` thread which means that the shards on that node are force-merged one at a time.
 * If you expand the `force_merge` threadpool on a node then it will force merge its shards in parallel
 *
 * Force merge makes the storage for the shard being merged temporarily increase, as it may require free space up to triple its size in case `max_num_segments parameter` is set to `1`, to rewrite all segments into a new one.
 *
 * **Data streams and time-based indices**
 *
 * Force-merging is useful for managing a data stream's older backing indices and other time-based indices, particularly after a rollover.
 * In these cases, each index only receives indexing traffic for a certain period of time.
 * Once an index receive no more writes, its shards can be force-merged to a single segment.
 * This can be a good idea because single-segment shards can sometimes use simpler and more efficient data structures to perform searches.
 * For example:
 *
 * ```
 * POST /.ds-my-data-stream-2099.03.07-000001/_forcemerge?max_num_segments=1
 * ```
 */
export const IndicesForcemergeRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-separated list of index names; use `_all` or empty string to perform the operation on all indices').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Whether to expand wildcard expression to concrete indices that are open, closed or both.').optional().meta({ found_in: 'query' }),
  flush: z.boolean().describe('Specify whether the index should be flushed after performing the operation').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  max_num_segments: long.describe('The number of segments the index should be merged into (default: dynamic)').optional().meta({ found_in: 'query' }),
  only_expunge_deletes: z.boolean().describe('Specify whether the operation should only expunge deleted documents').optional().meta({ found_in: 'query' }),
  wait_for_completion: z.boolean().describe('Should the request wait until the force merge is completed').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesForcemergeRequest' })
export type IndicesForcemergeRequest = z.infer<typeof IndicesForcemergeRequest>

export const IndicesForcemergeForceMergeResponseBody = z.object({
  ...ShardsOperationResponseBase.shape,
  task: z.string().describe('task contains a task id returned when wait_for_completion=false, you can use the task_id to get the status of the task at _tasks/<task_id>').optional()
}).meta({ id: 'IndicesForcemergeForceMergeResponseBody' })
export type IndicesForcemergeForceMergeResponseBody = z.infer<typeof IndicesForcemergeForceMergeResponseBody>

export const IndicesForcemergeResponse = IndicesForcemergeForceMergeResponseBody.meta({ id: 'IndicesForcemergeResponse' })
export type IndicesForcemergeResponse = z.infer<typeof IndicesForcemergeResponse>

export const IndicesGetFeature = z.enum(['aliases', 'mappings', 'settings']).meta({ id: 'IndicesGetFeature' })
export type IndicesGetFeature = z.infer<typeof IndicesGetFeature>

export const IndicesGetFeatures = z.union([IndicesGetFeature, z.array(IndicesGetFeature)]).meta({ id: 'IndicesGetFeatures' })
export type IndicesGetFeatures = z.infer<typeof IndicesGetFeatures>

/**
 * Get index information.
 *
 * Get information about one or more indices. For data streams, the API returns information about the
 * stream’s backing indices.
 */
export const IndicesGetRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of data streams, indices, and index aliases used to limit the request. Wildcard expressions (*) are supported.').meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard expressions can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as open,hidden.').optional().meta({ found_in: 'query' }),
  flat_settings: z.boolean().describe('If true, returns settings in flat format.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  include_defaults: z.boolean().describe('If true, return all default settings in the response.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If true, the request retrieves information from the local node only. Defaults to false, which means information is retrieved from the master node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  features: IndicesGetFeatures.describe('Return only information on specified index features').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesGetRequest' })
export type IndicesGetRequest = z.infer<typeof IndicesGetRequest>

export const IndicesGetResponse = z.record(IndexName, IndicesIndexState).meta({ id: 'IndicesGetResponse' })
export type IndicesGetResponse = z.infer<typeof IndicesGetResponse>

/**
 * Get aliases.
 *
 * Retrieves information for one or more data stream or index aliases.
 */
export const IndicesGetAliasRequest = z.object({
  ...RequestBase.shape,
  name: Names.describe('Comma-separated list of aliases to retrieve. Supports wildcards (`*`). To retrieve all aliases, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  index: Indices.describe('Comma-separated list of data streams or indices used to limit the request. Supports wildcards (`*`). To target all data streams and indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesGetAliasRequest' })
export type IndicesGetAliasRequest = z.infer<typeof IndicesGetAliasRequest>

export const IndicesGetAliasIndexAliases = z.object({
  aliases: z.record(z.string(), IndicesAliasDefinition)
}).meta({ id: 'IndicesGetAliasIndexAliases' })
export type IndicesGetAliasIndexAliases = z.infer<typeof IndicesGetAliasIndexAliases>

export const IndicesGetAliasResponse = z.record(IndexName, IndicesGetAliasIndexAliases).meta({ id: 'IndicesGetAliasResponse' })
export type IndicesGetAliasResponse = z.infer<typeof IndicesGetAliasResponse>

export const IndicesGetAliasNotFoundAliases = z.object({
  error: z.string(),
  status: integer
}).catchall(z.any()).meta({ id: 'IndicesGetAliasNotFoundAliases' })
export type IndicesGetAliasNotFoundAliases = z.infer<typeof IndicesGetAliasNotFoundAliases>

export const IndicesGetDataLifecycleDataStreamWithLifecycle = z.object({
  name: DataStreamName,
  lifecycle: IndicesDataStreamLifecycleWithRollover.optional()
}).meta({ id: 'IndicesGetDataLifecycleDataStreamWithLifecycle' })
export type IndicesGetDataLifecycleDataStreamWithLifecycle = z.infer<typeof IndicesGetDataLifecycleDataStreamWithLifecycle>

/**
 * Get data stream lifecycles.
 *
 * Get the data stream lifecycle configuration of one or more data streams.
 */
export const IndicesGetDataLifecycleRequest = z.object({
  ...RequestBase.shape,
  name: DataStreamNames.describe('Comma-separated list of data streams to limit the request. Supports wildcards (`*`). To target all data streams, omit this parameter or use `*` or `_all`.').meta({ found_in: 'path' }),
  expand_wildcards: ExpandWildcards.describe('Type of data stream that wildcard patterns can match. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  include_defaults: z.boolean().describe('If `true`, return all default settings in the response.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesGetDataLifecycleRequest' })
export type IndicesGetDataLifecycleRequest = z.infer<typeof IndicesGetDataLifecycleRequest>

export const IndicesGetDataLifecycleResponse = z.object({
  data_streams: z.array(IndicesGetDataLifecycleDataStreamWithLifecycle)
}).meta({ id: 'IndicesGetDataLifecycleResponse' })
export type IndicesGetDataLifecycleResponse = z.infer<typeof IndicesGetDataLifecycleResponse>

export const IndicesGetDataLifecycleStatsDataStreamStats = z.object({
  backing_indices_in_error: integer.describe('The count of the backing indices for the data stream.'),
  backing_indices_in_total: integer.describe('The count of the backing indices for the data stream that have encountered an error.'),
  name: DataStreamName.describe('The name of the data stream.')
}).meta({ id: 'IndicesGetDataLifecycleStatsDataStreamStats' })
export type IndicesGetDataLifecycleStatsDataStreamStats = z.infer<typeof IndicesGetDataLifecycleStatsDataStreamStats>

/**
 * Get data stream lifecycle stats.
 *
 * Get statistics about the data streams that are managed by a data stream lifecycle.
 */
export const IndicesGetDataLifecycleStatsRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'IndicesGetDataLifecycleStatsRequest' })
export type IndicesGetDataLifecycleStatsRequest = z.infer<typeof IndicesGetDataLifecycleStatsRequest>

export const IndicesGetDataLifecycleStatsResponse = z.object({
  data_stream_count: integer.describe('The count of data streams currently being managed by the data stream lifecycle.'),
  data_streams: z.array(IndicesGetDataLifecycleStatsDataStreamStats).describe('Information about the data streams that are managed by the data stream lifecycle.'),
  last_run_duration_in_millis: DurationValue.describe('The duration of the last data stream lifecycle execution.').optional(),
  time_between_starts_in_millis: DurationValue.describe('The time that passed between the start of the last two data stream lifecycle executions. This value should amount approximately to `data_streams.lifecycle.poll_interval`.').optional()
}).meta({ id: 'IndicesGetDataLifecycleStatsResponse' })
export type IndicesGetDataLifecycleStatsResponse = z.infer<typeof IndicesGetDataLifecycleStatsResponse>

/**
 * Get data streams.
 *
 * Get information about one or more data streams.
 */
export const IndicesGetDataStreamRequest = z.object({
  ...RequestBase.shape,
  name: DataStreamNames.describe('Comma-separated list of data stream names used to limit the request. Wildcard (`*`) expressions are supported. If omitted, all data streams are returned.').optional().meta({ found_in: 'path' }),
  expand_wildcards: ExpandWildcards.describe('Type of data stream that wildcard patterns can match. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  include_defaults: z.boolean().describe('If true, returns all relevant default configurations for the index template.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  verbose: z.boolean().describe('Whether the maximum timestamp for each data stream should be calculated and returned.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesGetDataStreamRequest' })
export type IndicesGetDataStreamRequest = z.infer<typeof IndicesGetDataStreamRequest>

export const IndicesGetDataStreamResponse = z.object({
  data_streams: z.array(IndicesDataStream)
}).meta({ id: 'IndicesGetDataStreamResponse' })
export type IndicesGetDataStreamResponse = z.infer<typeof IndicesGetDataStreamResponse>

export const IndicesGetDataStreamMappingsDataStreamMappings = z.object({
  name: z.string().describe('The name of the data stream.'),
  mappings: z.lazy(() => MappingTypeMapping).describe('The settings specific to this data stream'),
  effective_mappings: z.lazy(() => MappingTypeMapping).describe('The settings specific to this data stream merged with the settings from its template. These `effective_settings` are the settings that will be used when a new index is created for this data stream.')
}).meta({ id: 'IndicesGetDataStreamMappingsDataStreamMappings' })
export type IndicesGetDataStreamMappingsDataStreamMappings = z.infer<typeof IndicesGetDataStreamMappingsDataStreamMappings>

/**
 * Get data stream mappings.
 *
 * Get mapping information for one or more data streams.
 */
export const IndicesGetDataStreamMappingsRequest = z.object({
  ...RequestBase.shape,
  name: Indices.describe('A comma-separated list of data streams or data stream patterns. Supports wildcards (`*`).').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesGetDataStreamMappingsRequest' })
export type IndicesGetDataStreamMappingsRequest = z.infer<typeof IndicesGetDataStreamMappingsRequest>

export const IndicesGetDataStreamMappingsResponse = z.object({
  data_streams: z.array(IndicesGetDataStreamMappingsDataStreamMappings)
}).meta({ id: 'IndicesGetDataStreamMappingsResponse' })
export type IndicesGetDataStreamMappingsResponse = z.infer<typeof IndicesGetDataStreamMappingsResponse>

export const IndicesGetDataStreamOptionsDataStreamWithOptions = z.object({
  name: DataStreamName,
  options: IndicesDataStreamOptions.optional()
}).meta({ id: 'IndicesGetDataStreamOptionsDataStreamWithOptions' })
export type IndicesGetDataStreamOptionsDataStreamWithOptions = z.infer<typeof IndicesGetDataStreamOptionsDataStreamWithOptions>

/**
 * Get data stream options.
 *
 * Get the data stream options configuration of one or more data streams.
 */
export const IndicesGetDataStreamOptionsRequest = z.object({
  ...RequestBase.shape,
  name: DataStreamNames.describe('Comma-separated list of data streams to limit the request. Supports wildcards (`*`). To target all data streams, omit this parameter or use `*` or `_all`.').meta({ found_in: 'path' }),
  expand_wildcards: ExpandWildcards.describe('Type of data stream that wildcard patterns can match. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesGetDataStreamOptionsRequest' })
export type IndicesGetDataStreamOptionsRequest = z.infer<typeof IndicesGetDataStreamOptionsRequest>

export const IndicesGetDataStreamOptionsResponse = z.object({
  data_streams: z.array(IndicesGetDataStreamOptionsDataStreamWithOptions)
}).meta({ id: 'IndicesGetDataStreamOptionsResponse' })
export type IndicesGetDataStreamOptionsResponse = z.infer<typeof IndicesGetDataStreamOptionsResponse>

export const IndicesGetDataStreamSettingsDataStreamSettings = z.object({
  name: z.string().describe('The name of the data stream.'),
  settings: z.lazy(() => IndicesIndexSettings).describe('The settings specific to this data stream'),
  effective_settings: z.lazy(() => IndicesIndexSettings).describe('The settings specific to this data stream merged with the settings from its template. These `effective_settings` are the settings that will be used when a new index is created for this data stream.')
}).meta({ id: 'IndicesGetDataStreamSettingsDataStreamSettings' })
export type IndicesGetDataStreamSettingsDataStreamSettings = z.infer<typeof IndicesGetDataStreamSettingsDataStreamSettings>

/**
 * Get data stream settings.
 *
 * Get setting information for one or more data streams.
 */
export const IndicesGetDataStreamSettingsRequest = z.object({
  ...RequestBase.shape,
  name: Indices.describe('A comma-separated list of data streams or data stream patterns. Supports wildcards (`*`).').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesGetDataStreamSettingsRequest' })
export type IndicesGetDataStreamSettingsRequest = z.infer<typeof IndicesGetDataStreamSettingsRequest>

export const IndicesGetDataStreamSettingsResponse = z.object({
  data_streams: z.array(IndicesGetDataStreamSettingsDataStreamSettings)
}).meta({ id: 'IndicesGetDataStreamSettingsResponse' })
export type IndicesGetDataStreamSettingsResponse = z.infer<typeof IndicesGetDataStreamSettingsResponse>

/**
 * Get mapping definitions.
 *
 * Retrieves mapping definitions for one or more fields.
 * For data streams, the API retrieves field mappings for the stream’s backing indices.
 *
 * This API is useful if you don't need a complete mapping or if an index mapping contains a large number of fields.
 */
export const IndicesGetFieldMappingRequest = z.object({
  ...RequestBase.shape,
  fields: Fields.describe('Comma-separated list or wildcard expression of fields used to limit returned information. Supports wildcards (`*`).').meta({ found_in: 'path' }),
  index: Indices.describe('Comma-separated list of data streams, indices, and aliases used to limit the request. Supports wildcards (`*`). To target all data streams and indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  include_defaults: z.boolean().describe('If `true`, return all default settings in the response.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesGetFieldMappingRequest' })
export type IndicesGetFieldMappingRequest = z.infer<typeof IndicesGetFieldMappingRequest>

export const IndicesGetFieldMappingTypeFieldMappings = z.object({
  mappings: z.record(Field, z.lazy(() => MappingFieldMapping))
}).meta({ id: 'IndicesGetFieldMappingTypeFieldMappings' })
export type IndicesGetFieldMappingTypeFieldMappings = z.infer<typeof IndicesGetFieldMappingTypeFieldMappings>

export const IndicesGetFieldMappingResponse = z.record(IndexName, IndicesGetFieldMappingTypeFieldMappings).meta({ id: 'IndicesGetFieldMappingResponse' })
export type IndicesGetFieldMappingResponse = z.infer<typeof IndicesGetFieldMappingResponse>

export const IndicesGetIndexTemplateIndexTemplateItem = z.object({
  name: Name,
  index_template: IndicesIndexTemplateWithRollover
}).meta({ id: 'IndicesGetIndexTemplateIndexTemplateItem' })
export type IndicesGetIndexTemplateIndexTemplateItem = z.infer<typeof IndicesGetIndexTemplateIndexTemplateItem>

/**
 * Get index templates.
 *
 * Get information about one or more index templates.
 */
export const IndicesGetIndexTemplateRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('Name of index template to retrieve. Wildcard (*) expressions are supported.').optional().meta({ found_in: 'path' }),
  local: z.boolean().describe('If true, the request retrieves information from the local node only. Defaults to false, which means information is retrieved from the master node.').optional().meta({ found_in: 'query' }),
  flat_settings: z.boolean().describe('If true, returns settings in flat format.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  include_defaults: z.boolean().describe('If true, returns all relevant default configurations for the index template.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesGetIndexTemplateRequest' })
export type IndicesGetIndexTemplateRequest = z.infer<typeof IndicesGetIndexTemplateRequest>

export const IndicesGetIndexTemplateResponse = z.object({
  index_templates: z.array(IndicesGetIndexTemplateIndexTemplateItem)
}).meta({ id: 'IndicesGetIndexTemplateResponse' })
export type IndicesGetIndexTemplateResponse = z.infer<typeof IndicesGetIndexTemplateResponse>

export const IndicesGetMappingIndexMappingRecord = z.object({
  item: z.lazy(() => MappingTypeMapping).optional(),
  mappings: z.lazy(() => MappingTypeMapping)
}).meta({ id: 'IndicesGetMappingIndexMappingRecord' })
export type IndicesGetMappingIndexMappingRecord = z.infer<typeof IndicesGetMappingIndexMappingRecord>

/**
 * Get mapping definitions.
 *
 * For data streams, the API retrieves mappings for the stream’s backing indices.
 */
export const IndicesGetMappingRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of data streams, indices, and aliases used to limit the request. Supports wildcards (`*`). To target all data streams and indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request retrieves information from the local node only.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesGetMappingRequest' })
export type IndicesGetMappingRequest = z.infer<typeof IndicesGetMappingRequest>

export const IndicesGetMappingResponse = z.record(IndexName, IndicesGetMappingIndexMappingRecord).meta({ id: 'IndicesGetMappingResponse' })
export type IndicesGetMappingResponse = z.infer<typeof IndicesGetMappingResponse>

/**
 * Get the migration reindexing status.
 *
 * Get the status of a migration reindex attempt for a data stream or index.
 */
export const IndicesGetMigrateReindexStatusRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('The index or data stream name.').meta({ found_in: 'path' })
}).meta({ id: 'IndicesGetMigrateReindexStatusRequest' })
export type IndicesGetMigrateReindexStatusRequest = z.infer<typeof IndicesGetMigrateReindexStatusRequest>

export const IndicesGetMigrateReindexStatusStatusInProgress = z.object({
  index: z.string(),
  total_doc_count: long,
  reindexed_doc_count: long
}).meta({ id: 'IndicesGetMigrateReindexStatusStatusInProgress' })
export type IndicesGetMigrateReindexStatusStatusInProgress = z.infer<typeof IndicesGetMigrateReindexStatusStatusInProgress>

export const IndicesGetMigrateReindexStatusStatusError = z.object({
  index: z.string(),
  message: z.string()
}).meta({ id: 'IndicesGetMigrateReindexStatusStatusError' })
export type IndicesGetMigrateReindexStatusStatusError = z.infer<typeof IndicesGetMigrateReindexStatusStatusError>

export const IndicesGetMigrateReindexStatusResponse = z.object({
  start_time: DateTime.optional(),
  start_time_millis: EpochTime,
  complete: z.boolean(),
  total_indices_in_data_stream: integer,
  total_indices_requiring_upgrade: integer,
  successes: integer,
  in_progress: z.array(IndicesGetMigrateReindexStatusStatusInProgress),
  pending: integer,
  errors: z.array(IndicesGetMigrateReindexStatusStatusError),
  exception: z.string().optional()
}).meta({ id: 'IndicesGetMigrateReindexStatusResponse' })
export type IndicesGetMigrateReindexStatusResponse = z.infer<typeof IndicesGetMigrateReindexStatusResponse>

/**
 * Get index settings.
 *
 * Get setting information for one or more indices.
 * For data streams, it returns setting information for the stream's backing indices.
 */
export const IndicesGetSettingsRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of data streams, indices, and aliases used to limit the request. Supports wildcards (`*`). To target all data streams and indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  name: Names.describe('Comma-separated list or wildcard expression of settings to retrieve.').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  flat_settings: z.boolean().describe('If `true`, returns settings in flat format.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  include_defaults: z.boolean().describe('If `true`, return all default settings in the response.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request retrieves information from the local node only. If `false`, information is retrieved from the master node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesGetSettingsRequest' })
export type IndicesGetSettingsRequest = z.infer<typeof IndicesGetSettingsRequest>

export const IndicesGetSettingsResponse = z.record(IndexName, IndicesIndexState).meta({ id: 'IndicesGetSettingsResponse' })
export type IndicesGetSettingsResponse = z.infer<typeof IndicesGetSettingsResponse>

/**
 * Get legacy index templates.
 *
 * Get information about one or more index templates.
 *
 * IMPORTANT: This documentation is about legacy index templates, which are deprecated and will be replaced by the composable templates introduced in Elasticsearch 7.8.
 * @deprecated
 */
export const IndicesGetTemplateRequest = z.object({
  ...RequestBase.shape,
  name: Names.describe('Comma-separated list of index template names used to limit the request. Wildcard (`*`) expressions are supported. To return all index templates, omit this parameter or use a value of `_all` or `*`.').optional().meta({ found_in: 'path' }),
  flat_settings: z.boolean().describe('If `true`, returns settings in flat format.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request retrieves information from the local node only.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesGetTemplateRequest' })
export type IndicesGetTemplateRequest = z.infer<typeof IndicesGetTemplateRequest>

export const IndicesGetTemplateResponse = z.record(z.string(), IndicesTemplateMapping).meta({ id: 'IndicesGetTemplateResponse' })
export type IndicesGetTemplateResponse = z.infer<typeof IndicesGetTemplateResponse>

export const IndicesMigrateReindexModeEnum = z.enum(['upgrade']).meta({ id: 'IndicesMigrateReindexModeEnum' })
export type IndicesMigrateReindexModeEnum = z.infer<typeof IndicesMigrateReindexModeEnum>

export const IndicesMigrateReindexSourceIndex = z.object({
  index: IndexName
}).meta({ id: 'IndicesMigrateReindexSourceIndex' })
export type IndicesMigrateReindexSourceIndex = z.infer<typeof IndicesMigrateReindexSourceIndex>

export const IndicesMigrateReindexMigrateReindex = z.object({
  mode: IndicesMigrateReindexModeEnum.describe('Reindex mode. Currently only \'upgrade\' is supported.'),
  source: IndicesMigrateReindexSourceIndex.describe('The source index or data stream (only data streams are currently supported).')
}).meta({ id: 'IndicesMigrateReindexMigrateReindex' })
export type IndicesMigrateReindexMigrateReindex = z.infer<typeof IndicesMigrateReindexMigrateReindex>

/**
 * Reindex legacy backing indices.
 *
 * Reindex all legacy backing indices for a data stream.
 * This operation occurs in a persistent task.
 * The persistent task ID is returned immediately and the reindexing work is completed in that task.
 */
export const IndicesMigrateReindexRequest = z.object({
  ...RequestBase.shape,
  reindex: IndicesMigrateReindexMigrateReindex.optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesMigrateReindexRequest' })
export type IndicesMigrateReindexRequest = z.infer<typeof IndicesMigrateReindexRequest>

export const IndicesMigrateReindexResponse = AcknowledgedResponseBase.meta({ id: 'IndicesMigrateReindexResponse' })
export type IndicesMigrateReindexResponse = z.infer<typeof IndicesMigrateReindexResponse>

/**
 * Convert an index alias to a data stream.
 *
 * Converts an index alias to a data stream.
 * You must have a matching index template that is data stream enabled.
 * The alias must meet the following criteria:
 * The alias must have a write index;
 * All indices for the alias must have a `@timestamp` field mapping of a `date` or `date_nanos` field type;
 * The alias must not have any filters;
 * The alias must not use custom routing.
 * If successful, the request removes the alias and creates a data stream with the same name.
 * The indices for the alias become hidden backing indices for the stream.
 * The write index for the alias becomes the write index for the stream.
 */
export const IndicesMigrateToDataStreamRequest = z.object({
  ...RequestBase.shape,
  name: IndexName.describe('Name of the index alias to convert to a data stream.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesMigrateToDataStreamRequest' })
export type IndicesMigrateToDataStreamRequest = z.infer<typeof IndicesMigrateToDataStreamRequest>

export const IndicesMigrateToDataStreamResponse = AcknowledgedResponseBase.meta({ id: 'IndicesMigrateToDataStreamResponse' })
export type IndicesMigrateToDataStreamResponse = z.infer<typeof IndicesMigrateToDataStreamResponse>

export const IndicesModifyDataStreamIndexAndDataStreamAction = z.object({
  data_stream: DataStreamName.describe('Data stream targeted by the action.'),
  index: IndexName.describe('Index for the action.')
}).meta({ id: 'IndicesModifyDataStreamIndexAndDataStreamAction' })
export type IndicesModifyDataStreamIndexAndDataStreamAction = z.infer<typeof IndicesModifyDataStreamIndexAndDataStreamAction>

const IndicesModifyDataStreamActionExclusiveProps = z.union([z.object({ add_backing_index: IndicesModifyDataStreamIndexAndDataStreamAction }), z.object({ remove_backing_index: IndicesModifyDataStreamIndexAndDataStreamAction })])

export const IndicesModifyDataStreamAction = IndicesModifyDataStreamActionExclusiveProps.meta({ id: 'IndicesModifyDataStreamAction' })
export type IndicesModifyDataStreamAction = z.infer<typeof IndicesModifyDataStreamAction>

/**
 * Update data streams.
 *
 * Performs one or more data stream modification actions in a single atomic operation.
 */
export const IndicesModifyDataStreamRequest = z.object({
  ...RequestBase.shape,
  actions: z.array(IndicesModifyDataStreamAction).describe('Actions to perform.').meta({ found_in: 'body' })
}).meta({ id: 'IndicesModifyDataStreamRequest' })
export type IndicesModifyDataStreamRequest = z.infer<typeof IndicesModifyDataStreamRequest>

export const IndicesModifyDataStreamResponse = AcknowledgedResponseBase.meta({ id: 'IndicesModifyDataStreamResponse' })
export type IndicesModifyDataStreamResponse = z.infer<typeof IndicesModifyDataStreamResponse>

/**
 * Open a closed index.
 *
 * For data streams, the API opens any closed backing indices.
 *
 * A closed index is blocked for read/write operations and does not allow all operations that opened indices allow.
 * It is not possible to index documents or to search for documents in a closed index.
 * This allows closed indices to not have to maintain internal data structures for indexing or searching documents, resulting in a smaller overhead on the cluster.
 *
 * When opening or closing an index, the master is responsible for restarting the index shards to reflect the new state of the index.
 * The shards will then go through the normal recovery process.
 * The data of opened or closed indices is automatically replicated by the cluster to ensure that enough shard copies are safely kept around at all times.
 *
 * You can open and close multiple indices.
 * An error is thrown if the request explicitly refers to a missing index.
 * This behavior can be turned off by using the `ignore_unavailable=true` parameter.
 *
 * By default, you must explicitly name the indices you are opening or closing.
 * To open or close indices with `_all`, `*`, or other wildcard expressions, change the `action.destructive_requires_name` setting to `false`.
 * This setting can also be changed with the cluster update settings API.
 *
 * Closed indices consume a significant amount of disk-space which can cause problems in managed environments.
 * Closing indices can be turned off with the cluster settings API by setting `cluster.indices.close.enable` to `false`.
 *
 * Because opening or closing an index allocates its shards, the `wait_for_active_shards` setting on index creation applies to the `_open` and `_close` index actions as well.
 */
export const IndicesOpenRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of data streams, indices, and aliases used to limit the request. Supports wildcards (`*`). By default, you must explicitly name the indices you using to limit the request. To limit a request using `_all`, `*`, or other wildcard expressions, change the `action.destructive_requires_name` setting to false. You can update this setting in the `elasticsearch.yml` file or using the cluster update settings API.').meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  wait_for_active_shards: WaitForActiveShards.describe('The number of shard copies that must be active before proceeding with the operation. Set to `all` or any positive integer up to the total number of shards in the index (`number_of_replicas+1`).').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesOpenRequest' })
export type IndicesOpenRequest = z.infer<typeof IndicesOpenRequest>

export const IndicesOpenResponse = z.object({
  acknowledged: z.boolean(),
  shards_acknowledged: z.boolean()
}).meta({ id: 'IndicesOpenResponse' })
export type IndicesOpenResponse = z.infer<typeof IndicesOpenResponse>

/**
 * Promote a data stream.
 *
 * Promote a data stream from a replicated data stream managed by cross-cluster replication (CCR) to a regular data stream.
 *
 * With CCR auto following, a data stream from a remote cluster can be replicated to the local cluster.
 * These data streams can't be rolled over in the local cluster.
 * These replicated data streams roll over only if the upstream data stream rolls over.
 * In the event that the remote cluster is no longer available, the data stream in the local cluster can be promoted to a regular data stream, which allows these data streams to be rolled over in the local cluster.
 *
 * NOTE: When promoting a data stream, ensure the local cluster has a data stream enabled index template that matches the data stream.
 * If this is missing, the data stream will not be able to roll over until a matching index template is created.
 * This will affect the lifecycle management of the data stream and interfere with the data stream size and retention.
 */
export const IndicesPromoteDataStreamRequest = z.object({
  ...RequestBase.shape,
  name: IndexName.describe('The name of the data stream to promote').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesPromoteDataStreamRequest' })
export type IndicesPromoteDataStreamRequest = z.infer<typeof IndicesPromoteDataStreamRequest>

export const IndicesPromoteDataStreamResponse = z.any().meta({ id: 'IndicesPromoteDataStreamResponse' })
export type IndicesPromoteDataStreamResponse = z.infer<typeof IndicesPromoteDataStreamResponse>

/**
 * Create or update an alias.
 *
 * Adds a data stream or index to an alias.
 */
export const IndicesPutAliasRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of data streams or indices to add. Supports wildcards (`*`). Wildcard patterns that match both data streams and indices return an error.').meta({ found_in: 'path' }),
  name: Name.describe('Alias to update. If the alias doesn’t exist, the request creates it. Index alias names support date math.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  filter: z.lazy(() => QueryDslQueryContainer).describe('Query used to limit documents the alias can access.').optional().meta({ found_in: 'body' }),
  index_routing: z.string().describe('Value used to route indexing operations to a specific shard. If specified, this overwrites the `routing` value for indexing operations. Data stream aliases don’t support this parameter.').optional().meta({ found_in: 'body' }),
  is_write_index: z.boolean().describe('If `true`, sets the write index or data stream for the alias. If an alias points to multiple indices or data streams and `is_write_index` isn’t set, the alias rejects write requests. If an index alias points to one index and `is_write_index` isn’t set, the index automatically acts as the write index. Data stream aliases don’t automatically set a write data stream, even if the alias points to one data stream.').optional().meta({ found_in: 'body' }),
  routing: z.string().describe('Value used to route indexing and search operations to a specific shard. Data stream aliases don’t support this parameter.').optional().meta({ found_in: 'body' }),
  search_routing: z.string().describe('Value used to route search operations to a specific shard. If specified, this overwrites the `routing` value for search operations. Data stream aliases don’t support this parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesPutAliasRequest' })
export type IndicesPutAliasRequest = z.infer<typeof IndicesPutAliasRequest>

export const IndicesPutAliasResponse = AcknowledgedResponseBase.meta({ id: 'IndicesPutAliasResponse' })
export type IndicesPutAliasResponse = z.infer<typeof IndicesPutAliasResponse>

/**
 * Update data stream lifecycles.
 *
 * Update the data stream lifecycle of the specified data streams.
 */
export const IndicesPutDataLifecycleRequest = z.object({
  ...RequestBase.shape,
  name: DataStreamNames.describe('Comma-separated list of data streams used to limit the request. Supports wildcards (`*`). To target all data streams use `*` or `_all`.').meta({ found_in: 'path' }),
  expand_wildcards: ExpandWildcards.describe('Type of data stream that wildcard patterns can match. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  data_retention: Duration.describe('If defined, every document added to this data stream will be stored at least for this time frame. Any time after this duration the document could be deleted. When empty, every document in this data stream will be stored indefinitely.').optional().meta({ found_in: 'body' }),
  downsampling: z.array(IndicesDownsamplingRound).describe('The downsampling configuration to execute for the managed backing index after rollover.').optional().meta({ found_in: 'body' }),
  downsampling_method: IndicesSamplingMethod.describe('The method used to downsample the data. There are two options `aggregate` and `last_value`. It requires `downsampling` to be defined. Defaults to `aggregate`.').optional().meta({ found_in: 'body' }),
  enabled: z.boolean().describe('If defined, it turns data stream lifecycle on/off (`true`/`false`) for this data stream. A data stream lifecycle that\'s disabled (enabled: `false`) will have no effect on the data stream.').optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesPutDataLifecycleRequest' })
export type IndicesPutDataLifecycleRequest = z.infer<typeof IndicesPutDataLifecycleRequest>

export const IndicesPutDataLifecycleResponse = AcknowledgedResponseBase.meta({ id: 'IndicesPutDataLifecycleResponse' })
export type IndicesPutDataLifecycleResponse = z.infer<typeof IndicesPutDataLifecycleResponse>

/**
 * Update data stream mappings.
 *
 * This API can be used to override mappings on specific data streams. These overrides will take precedence over what
 * is specified in the template that the data stream matches. The mapping change is only applied to new write indices
 * that are created during rollover after this API is called. No indices are changed by this API.
 */
export const IndicesPutDataStreamMappingsRequest = z.object({
  ...RequestBase.shape,
  name: Indices.describe('A comma-separated list of data streams or data stream patterns.').meta({ found_in: 'path' }),
  dry_run: z.boolean().describe('If `true`, the request does not actually change the mappings on any data streams. Instead, it simulates changing the settings and reports back to the user what would have happened had these settings actually been applied.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the  timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  mappings: z.lazy(() => MappingTypeMapping).optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesPutDataStreamMappingsRequest' })
export type IndicesPutDataStreamMappingsRequest = z.infer<typeof IndicesPutDataStreamMappingsRequest>

export const IndicesPutDataStreamMappingsUpdatedDataStreamMappings = z.object({
  name: IndexName.describe('The data stream name.'),
  applied_to_data_stream: z.boolean().describe('If the mappings were successfully applied to the data stream (or would have been, if running in `dry_run` mode), it is `true`. If an error occurred, it is `false`.'),
  error: z.string().describe('A message explaining why the mappings could not be applied to the data stream.').optional(),
  mappings: z.lazy(() => MappingTypeMapping).describe('The mappings that are specfic to this data stream that will override any mappings from the matching index template.').optional(),
  effective_mappings: z.lazy(() => MappingTypeMapping).describe('The mappings that are effective on this data stream, taking into account the mappings from the matching index template and the mappings specific to this data stream.').optional()
}).meta({ id: 'IndicesPutDataStreamMappingsUpdatedDataStreamMappings' })
export type IndicesPutDataStreamMappingsUpdatedDataStreamMappings = z.infer<typeof IndicesPutDataStreamMappingsUpdatedDataStreamMappings>

export const IndicesPutDataStreamMappingsResponse = z.object({
  data_streams: z.array(IndicesPutDataStreamMappingsUpdatedDataStreamMappings)
}).meta({ id: 'IndicesPutDataStreamMappingsResponse' })
export type IndicesPutDataStreamMappingsResponse = z.infer<typeof IndicesPutDataStreamMappingsResponse>

/**
 * Update data stream options.
 *
 * Update the data stream options of the specified data streams.
 */
export const IndicesPutDataStreamOptionsRequest = z.object({
  ...RequestBase.shape,
  name: DataStreamNames.describe('Comma-separated list of data streams used to limit the request. Supports wildcards (`*`). To target all data streams use `*` or `_all`.').meta({ found_in: 'path' }),
  expand_wildcards: ExpandWildcards.describe('Type of data stream that wildcard patterns can match. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  failure_store: IndicesDataStreamFailureStore.describe('If defined, it will update the failure store configuration of every data stream resolved by the name expression.').optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesPutDataStreamOptionsRequest' })
export type IndicesPutDataStreamOptionsRequest = z.infer<typeof IndicesPutDataStreamOptionsRequest>

export const IndicesPutDataStreamOptionsResponse = AcknowledgedResponseBase.meta({ id: 'IndicesPutDataStreamOptionsResponse' })
export type IndicesPutDataStreamOptionsResponse = z.infer<typeof IndicesPutDataStreamOptionsResponse>

export const IndicesPutDataStreamSettingsDataStreamSettingsError = z.object({
  index: IndexName,
  error: z.string().describe('A message explaining why the settings could not be applied to specific indices.')
}).meta({ id: 'IndicesPutDataStreamSettingsDataStreamSettingsError' })
export type IndicesPutDataStreamSettingsDataStreamSettingsError = z.infer<typeof IndicesPutDataStreamSettingsDataStreamSettingsError>

export const IndicesPutDataStreamSettingsIndexSettingResults = z.object({
  applied_to_data_stream_only: z.array(z.string()).describe('The list of settings that were applied to the data stream but not to backing indices. These will be applied to the write index the next time the data stream is rolled over.'),
  applied_to_data_stream_and_backing_indices: z.array(z.string()).describe('The list of settings that were applied to the data stream and to all of its backing indices. These settings will also be applied to the write index the next time the data stream is rolled over.'),
  errors: z.array(IndicesPutDataStreamSettingsDataStreamSettingsError).optional()
}).meta({ id: 'IndicesPutDataStreamSettingsIndexSettingResults' })
export type IndicesPutDataStreamSettingsIndexSettingResults = z.infer<typeof IndicesPutDataStreamSettingsIndexSettingResults>

/**
 * Update data stream settings.
 *
 * NOTE: Available in 8.19. Not available in earlier versions.
 *
 * This API can be used to override settings on specific data streams. These overrides will take precedence over what
 * is specified in the template that the data stream matches. To prevent your data stream from getting into an invalid state,
 * only certain settings are allowed. If possible, the setting change is applied to all
 * backing indices. Otherwise, it will be applied when the data stream is next rolled over.
 */
export const IndicesPutDataStreamSettingsRequest = z.object({
  ...RequestBase.shape,
  name: Indices.describe('A comma-separated list of data streams or data stream patterns.').meta({ found_in: 'path' }),
  dry_run: z.boolean().describe('If `true`, the request does not actually change the settings on any data streams or indices. Instead, it simulates changing the settings and reports back to the user what would have happened had these settings actually been applied.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the  timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  settings: z.lazy(() => IndicesIndexSettings).optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesPutDataStreamSettingsRequest' })
export type IndicesPutDataStreamSettingsRequest = z.infer<typeof IndicesPutDataStreamSettingsRequest>

export const IndicesPutDataStreamSettingsUpdatedDataStreamSettings = z.object({
  name: IndexName.describe('The data stream name.'),
  applied_to_data_stream: z.boolean().describe('If the settings were successfully applied to the data stream (or would have been, if running in `dry_run` mode), it is `true`. If an error occurred, it is `false`.'),
  error: z.string().describe('A message explaining why the settings could not be applied to the data stream.').optional(),
  settings: z.lazy(() => IndicesIndexSettings).describe('The settings that are specfic to this data stream that will override any settings from the matching index template.'),
  effective_settings: z.lazy(() => IndicesIndexSettings).describe('The settings that are effective on this data stream, taking into account the settings from the matching index template and the settings specific to this data stream.'),
  index_settings_results: IndicesPutDataStreamSettingsIndexSettingResults.describe('Information about whether and where each setting was applied.')
}).meta({ id: 'IndicesPutDataStreamSettingsUpdatedDataStreamSettings' })
export type IndicesPutDataStreamSettingsUpdatedDataStreamSettings = z.infer<typeof IndicesPutDataStreamSettingsUpdatedDataStreamSettings>

export const IndicesPutDataStreamSettingsResponse = z.object({
  data_streams: z.array(IndicesPutDataStreamSettingsUpdatedDataStreamSettings)
}).meta({ id: 'IndicesPutDataStreamSettingsResponse' })
export type IndicesPutDataStreamSettingsResponse = z.infer<typeof IndicesPutDataStreamSettingsResponse>

/**
 * Create or update an index template.
 *
 * Index templates define settings, mappings, and aliases that can be applied automatically to new indices.
 *
 * Elasticsearch applies templates to new indices based on an wildcard pattern that matches the index name.
 * Index templates are applied during data stream or index creation.
 * For data streams, these settings and mappings are applied when the stream's backing indices are created.
 * Settings and mappings specified in a create index API request override any settings or mappings specified in an index template.
 * Changes to index templates do not affect existing indices, including the existing backing indices of a data stream.
 *
 * You can use C-style `/* *\/` block comments in index templates.
 * You can include comments anywhere in the request body, except before the opening curly bracket.
 *
 * **Multiple matching templates**
 *
 * If multiple index templates match the name of a new index or data stream, the template with the highest priority is used.
 *
 * Multiple templates with overlapping index patterns at the same priority are not allowed and an error will be thrown when attempting to create a template matching an existing index template at identical priorities.
 *
 * **Composing aliases, mappings, and settings**
 *
 * When multiple component templates are specified in the `composed_of` field for an index template, they are merged in the order specified, meaning that later component templates override earlier component templates.
 * Any mappings, settings, or aliases from the parent index template are merged in next.
 * Finally, any configuration on the index request itself is merged.
 * Mapping definitions are merged recursively, which means that later mapping components can introduce new field mappings and update the mapping configuration.
 * If a field mapping is already contained in an earlier component, its definition will be completely overwritten by the later one.
 * This recursive merging strategy applies not only to field mappings, but also root options like `dynamic_templates` and `meta`.
 * If an earlier component contains a `dynamic_templates` block, then by default new `dynamic_templates` entries are appended onto the end.
 * If an entry already exists with the same key, then it is overwritten by the new definition.
 */
export const IndicesPutIndexTemplateRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('Index or template name').meta({ found_in: 'path' }),
  create: z.boolean().describe('If `true`, this request cannot replace or update existing index templates.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  cause: z.string().describe('User defined reason for creating or updating the index template').optional().meta({ found_in: 'query' }),
  index_patterns: Indices.describe('Array of wildcard (`*`) expressions used to match the names of data streams and indices during creation.').optional().meta({ found_in: 'body' }),
  composed_of: z.array(Name).describe('An ordered list of component template names. Component templates are merged in the order specified, meaning that the last component template specified has the highest precedence.').optional().meta({ found_in: 'body' }),
  template: IndicesPutIndexTemplateIndexTemplateMapping.describe('Template to be applied. It may optionally include an `aliases`, `mappings`, or `settings` configuration.').optional().meta({ found_in: 'body' }),
  data_stream: IndicesDataStreamVisibility.describe('If this object is included, the template is used to create data streams and their backing indices. Supports an empty object. Data streams require a matching index template with a `data_stream` object.').optional().meta({ found_in: 'body' }),
  priority: long.describe('Priority to determine index template precedence when a new data stream or index is created. The index template with the highest priority is chosen. If no priority is specified the template is treated as though it is of priority 0 (lowest priority). This number is not automatically generated by Elasticsearch.').optional().meta({ found_in: 'body' }),
  version: VersionNumber.describe('Version number used to manage index templates externally. This number is not automatically generated by Elasticsearch. External systems can use these version numbers to simplify template management. To unset a version, replace the template without specifying one.').optional().meta({ found_in: 'body' }),
  _meta: Metadata.describe('Optional user metadata about the index template. It may have any contents. It is not automatically generated or used by Elasticsearch. This user-defined object is stored in the cluster state, so keeping it short is preferable To unset the metadata, replace the template without specifying it.').optional().meta({ found_in: 'body' }),
  allow_auto_create: z.boolean().describe('This setting overrides the value of the `action.auto_create_index` cluster setting. If set to `true` in a template, then indices can be automatically created using that template even if auto-creation of indices is disabled via `actions.auto_create_index`. If set to `false`, then indices or data streams matching the template must always be explicitly created, and may never be automatically created.').optional().meta({ found_in: 'body' }),
  ignore_missing_component_templates: z.array(z.string()).describe('The configuration option ignore_missing_component_templates can be used when an index template references a component template that might not exist').optional().meta({ found_in: 'body' }),
  deprecated: z.boolean().describe('Marks this index template as deprecated. When creating or updating a non-deprecated index template that uses deprecated components, Elasticsearch will emit a deprecation warning.').optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesPutIndexTemplateRequest' })
export type IndicesPutIndexTemplateRequest = z.infer<typeof IndicesPutIndexTemplateRequest>

export const IndicesPutIndexTemplateResponse = AcknowledgedResponseBase.meta({ id: 'IndicesPutIndexTemplateResponse' })
export type IndicesPutIndexTemplateResponse = z.infer<typeof IndicesPutIndexTemplateResponse>

/**
 * Update field mappings.
 *
 * Add new fields to an existing data stream or index.
 * You can use the update mapping API to:
 *
 * - Add a new field to an existing index
 * - Update mappings for multiple indices in a single request
 * - Add new properties to an object field
 * - Enable multi-fields for an existing field
 * - Update supported mapping parameters
 * - Change a field's mapping using reindexing
 * - Rename a field using a field alias
 *
 * Learn how to use the update mapping API with practical examples in the [Update mapping API examples](https://www.elastic.co/docs/manage-data/data-store/mapping/update-mappings-examples) guide.
 */
export const IndicesPutMappingRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-separated list of index names the mapping should be added to (supports wildcards). Use `_all` or omit to add the mapping on all indices.').meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  write_index_only: z.boolean().describe('If `true`, the mappings are applied only to the current write index for the target.').optional().meta({ found_in: 'query' }),
  date_detection: z.boolean().describe('Controls whether dynamic date detection is enabled.').optional().meta({ found_in: 'body' }),
  dynamic: z.lazy(() => MappingDynamicMapping).describe('Controls whether new fields are added dynamically.').optional().meta({ found_in: 'body' }),
  dynamic_date_formats: z.array(z.string()).describe('If date detection is enabled then new string fields are checked against \'dynamic_date_formats\' and if the value matches then a new date field is added instead of string.').optional().meta({ found_in: 'body' }),
  dynamic_templates: z.array(z.record(z.string(), z.lazy(() => MappingDynamicTemplate))).describe('Specify dynamic templates for the mapping.').optional().meta({ found_in: 'body' }),
  _field_names: z.lazy(() => MappingFieldNamesField).describe('Control whether field names are enabled for the index.').optional().meta({ found_in: 'body' }),
  _meta: Metadata.describe('A mapping type can have custom meta data associated with it. These are not used at all by Elasticsearch, but can be used to store application-specific metadata.').optional().meta({ found_in: 'body' }),
  numeric_detection: z.boolean().describe('Automatically map strings into numeric data types for all fields.').optional().meta({ found_in: 'body' }),
  properties: z.record(PropertyName, z.lazy(() => MappingProperty)).describe('Mapping for a field. For new fields, this mapping can include: - Field name - Field data type - Mapping parameters').optional().meta({ found_in: 'body' }),
  _routing: z.lazy(() => MappingRoutingField).describe('Enable making a routing value required on indexed documents.').optional().meta({ found_in: 'body' }),
  _source: z.lazy(() => MappingSourceField).describe('Control whether the _source field is enabled on the index.').optional().meta({ found_in: 'body' }),
  runtime: z.lazy(() => MappingRuntimeFields).describe('Mapping of runtime fields for the index.').optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesPutMappingRequest' })
export type IndicesPutMappingRequest = z.infer<typeof IndicesPutMappingRequest>

export const IndicesPutMappingResponse = IndicesResponseBase.meta({ id: 'IndicesPutMappingResponse' })
export type IndicesPutMappingResponse = z.infer<typeof IndicesPutMappingResponse>

/**
 * Update index settings.
 *
 * Changes dynamic index settings in real time.
 * For data streams, index setting changes are applied to all backing indices by default.
 *
 * To revert a setting to the default value, use a null value.
 * The list of per-index settings that can be updated dynamically on live indices can be found in index settings documentation.
 * To preserve existing settings from being updated, set the `preserve_existing` parameter to `true`.
 *
 * For performance optimization during bulk indexing, you can disable the refresh interval.
 * Refer to [disable refresh interval](https://www.elastic.co/docs/deploy-manage/production-guidance/optimize-performance/indexing-speed#disable-refresh-interval) for an example.
 * There are multiple valid ways to represent index settings in the request body. You can specify only the setting, for example:
 *
 * ```
 * {
 *   "number_of_replicas": 1
 * }
 * ```
 *
 * Or you can use an `index` setting object:
 * ```
 * {
 *   "index": {
 *     "number_of_replicas": 1
 *   }
 * }
 * ```
 *
 * Or you can use dot annotation:
 * ```
 * {
 *   "index.number_of_replicas": 1
 * }
 * ```
 *
 * Or you can embed any of the aforementioned options in a `settings` object. For example:
 *
 * ```
 * {
 *   "settings": {
 *     "index": {
 *       "number_of_replicas": 1
 *     }
 *   }
 * }
 * ```
 *
 * NOTE: You can only define new analyzers on closed indices.
 * To add an analyzer, you must close the index, define the analyzer, and reopen the index.
 * You cannot close the write index of a data stream.
 * To update the analyzer for a data stream's write index and future backing indices, update the analyzer in the index template used by the stream.
 * Then roll over the data stream to apply the new analyzer to the stream's write index and future backing indices.
 * This affects searches and any new data added to the stream after the rollover.
 * However, it does not affect the data stream's backing indices or their existing data.
 * To change the analyzer for existing backing indices, you must create a new data stream and reindex your data into it.
 * Refer to [updating analyzers on existing indices](https://www.elastic.co/docs/manage-data/data-store/text-analysis/specify-an-analyzer#update-analyzers-on-existing-indices) for step-by-step examples.
 */
export const IndicesPutSettingsRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of data streams, indices, and aliases used to limit the request. Supports wildcards (`*`). To target all data streams and indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  flat_settings: z.boolean().describe('If `true`, returns settings in flat format.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  preserve_existing: z.boolean().describe('If `true`, existing index settings remain unchanged.').optional().meta({ found_in: 'query' }),
  reopen: z.boolean().describe('Whether to close and reopen the index to apply non-dynamic settings. If set to `true` the indices to which the settings are being applied will be closed temporarily and then reopened in order to apply the changes.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the  timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  settings: z.lazy(() => IndicesIndexSettings).optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesPutSettingsRequest' })
export type IndicesPutSettingsRequest = z.infer<typeof IndicesPutSettingsRequest>

export const IndicesPutSettingsResponse = AcknowledgedResponseBase.meta({ id: 'IndicesPutSettingsResponse' })
export type IndicesPutSettingsResponse = z.infer<typeof IndicesPutSettingsResponse>

/**
 * Create or update a legacy index template.
 *
 * Index templates define settings, mappings, and aliases that can be applied automatically to new indices.
 * Elasticsearch applies templates to new indices based on an index pattern that matches the index name.
 *
 * IMPORTANT: This documentation is about legacy index templates, which are deprecated and will be replaced by the composable templates introduced in Elasticsearch 7.8.
 *
 * Composable templates always take precedence over legacy templates.
 * If no composable template matches a new index, matching legacy templates are applied according to their order.
 *
 * Index templates are only applied during index creation.
 * Changes to index templates do not affect existing indices.
 * Settings and mappings specified in create index API requests override any settings or mappings specified in an index template.
 *
 * You can use C-style `/* *\/` block comments in index templates.
 * You can include comments anywhere in the request body, except before the opening curly bracket.
 *
 * **Indices matching multiple templates**
 *
 * Multiple index templates can potentially match an index, in this case, both the settings and mappings are merged into the final configuration of the index.
 * The order of the merging can be controlled using the order parameter, with lower order being applied first, and higher orders overriding them.
 * NOTE: Multiple matching templates with the same order value will result in a non-deterministic merging order.
 * @deprecated
 */
export const IndicesPutTemplateRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the template').meta({ found_in: 'path' }),
  create: z.boolean().describe('If true, this request cannot replace or update existing index templates.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  cause: z.string().describe('User defined reason for creating or updating the index template').optional().meta({ found_in: 'query' }),
  aliases: z.record(IndexName, IndicesAlias).describe('Aliases for the index.').optional().meta({ found_in: 'body' }),
  index_patterns: z.union([z.string(), z.array(z.string())]).describe('Array of wildcard expressions used to match the names of indices during creation.').optional().meta({ found_in: 'body' }),
  mappings: z.lazy(() => MappingTypeMapping).describe('Mapping for fields in the index.').optional().meta({ found_in: 'body' }),
  order: integer.describe('Order in which Elasticsearch applies this template if index matches multiple templates. Templates with lower \'order\' values are merged first. Templates with higher \'order\' values are merged later, overriding templates with lower values.').optional().meta({ found_in: 'body' }),
  settings: z.lazy(() => IndicesIndexSettings).describe('Configuration options for the index.').optional().meta({ found_in: 'body' }),
  version: VersionNumber.describe('Version number used to manage index templates externally. This number is not automatically generated by Elasticsearch. To unset a version, replace the template without specifying one.').optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesPutTemplateRequest' })
export type IndicesPutTemplateRequest = z.infer<typeof IndicesPutTemplateRequest>

export const IndicesPutTemplateResponse = AcknowledgedResponseBase.meta({ id: 'IndicesPutTemplateResponse' })
export type IndicesPutTemplateResponse = z.infer<typeof IndicesPutTemplateResponse>

export const IndicesRecoveryFileDetails = z.object({
  length: long,
  name: z.string(),
  recovered: long
}).meta({ id: 'IndicesRecoveryFileDetails' })
export type IndicesRecoveryFileDetails = z.infer<typeof IndicesRecoveryFileDetails>

export const IndicesRecoveryRecoveryBytes = z.object({
  percent: Percentage,
  recovered: ByteSize.optional(),
  recovered_in_bytes: ByteSize,
  recovered_from_snapshot: ByteSize.optional(),
  recovered_from_snapshot_in_bytes: ByteSize.optional(),
  reused: ByteSize.optional(),
  reused_in_bytes: ByteSize,
  total: ByteSize.optional(),
  total_in_bytes: ByteSize
}).meta({ id: 'IndicesRecoveryRecoveryBytes' })
export type IndicesRecoveryRecoveryBytes = z.infer<typeof IndicesRecoveryRecoveryBytes>

export const IndicesRecoveryRecoveryFiles = z.object({
  details: z.array(IndicesRecoveryFileDetails).optional(),
  percent: Percentage,
  recovered: long,
  reused: long,
  total: long
}).meta({ id: 'IndicesRecoveryRecoveryFiles' })
export type IndicesRecoveryRecoveryFiles = z.infer<typeof IndicesRecoveryRecoveryFiles>

export const IndicesRecoveryRecoveryIndexStatus = z.object({
  bytes: IndicesRecoveryRecoveryBytes.optional(),
  files: IndicesRecoveryRecoveryFiles,
  size: IndicesRecoveryRecoveryBytes,
  source_throttle_time: Duration.optional(),
  source_throttle_time_in_millis: DurationValue,
  target_throttle_time: Duration.optional(),
  target_throttle_time_in_millis: DurationValue,
  total_time: Duration.optional(),
  total_time_in_millis: DurationValue
}).meta({ id: 'IndicesRecoveryRecoveryIndexStatus' })
export type IndicesRecoveryRecoveryIndexStatus = z.infer<typeof IndicesRecoveryRecoveryIndexStatus>

export const IndicesRecoveryRecoveryOrigin = z.object({
  hostname: z.string().optional(),
  host: Host.optional(),
  transport_address: TransportAddress.optional(),
  id: Id.optional(),
  ip: Ip.optional(),
  name: Name.optional(),
  bootstrap_new_history_uuid: z.boolean().optional(),
  repository: Name.optional(),
  snapshot: Name.optional(),
  version: VersionString.optional(),
  restoreUUID: Uuid.optional(),
  index: IndexName.optional()
}).meta({ id: 'IndicesRecoveryRecoveryOrigin' })
export type IndicesRecoveryRecoveryOrigin = z.infer<typeof IndicesRecoveryRecoveryOrigin>

export const IndicesRecoveryRecoveryStage = z.enum(['INIT', 'INDEX', 'VERIFY_INDEX', 'TRANSLOG', 'FINALIZE', 'DONE']).meta({ id: 'IndicesRecoveryRecoveryStage' })
export type IndicesRecoveryRecoveryStage = z.infer<typeof IndicesRecoveryRecoveryStage>

export const IndicesRecoveryRecoveryStartStatus = z.object({
  check_index_time: Duration.optional(),
  check_index_time_in_millis: DurationValue,
  total_time: Duration.optional(),
  total_time_in_millis: DurationValue
}).meta({ id: 'IndicesRecoveryRecoveryStartStatus' })
export type IndicesRecoveryRecoveryStartStatus = z.infer<typeof IndicesRecoveryRecoveryStartStatus>

export const IndicesRecoveryTranslogStatus = z.object({
  percent: Percentage,
  recovered: long,
  total: long,
  total_on_start: long,
  total_time: Duration.optional(),
  total_time_in_millis: DurationValue
}).meta({ id: 'IndicesRecoveryTranslogStatus' })
export type IndicesRecoveryTranslogStatus = z.infer<typeof IndicesRecoveryTranslogStatus>

export const IndicesRecoveryRecoveryType = z.enum(['EMPTY_STORE', 'EXISTING_STORE', 'LOCAL_SHARDS', 'PEER', 'SNAPSHOT']).meta({ id: 'IndicesRecoveryRecoveryType' })
export type IndicesRecoveryRecoveryType = z.infer<typeof IndicesRecoveryRecoveryType>

export const IndicesRecoveryVerifyIndex = z.object({
  check_index_time: Duration.optional(),
  check_index_time_in_millis: DurationValue,
  total_time: Duration.optional(),
  total_time_in_millis: DurationValue
}).meta({ id: 'IndicesRecoveryVerifyIndex' })
export type IndicesRecoveryVerifyIndex = z.infer<typeof IndicesRecoveryVerifyIndex>

export const IndicesRecoveryShardRecovery = z.object({
  id: long,
  index: IndicesRecoveryRecoveryIndexStatus,
  primary: z.boolean(),
  source: IndicesRecoveryRecoveryOrigin,
  stage: IndicesRecoveryRecoveryStage.describe('The recovery stage.'),
  start: IndicesRecoveryRecoveryStartStatus.optional(),
  start_time: DateTime.optional(),
  start_time_in_millis: EpochTime,
  stop_time: DateTime.optional(),
  stop_time_in_millis: EpochTime.optional(),
  target: IndicesRecoveryRecoveryOrigin,
  total_time: Duration.optional(),
  total_time_in_millis: DurationValue,
  translog: IndicesRecoveryTranslogStatus,
  type: IndicesRecoveryRecoveryType.describe('The recovery source type.'),
  verify_index: IndicesRecoveryVerifyIndex
}).meta({ id: 'IndicesRecoveryShardRecovery' })
export type IndicesRecoveryShardRecovery = z.infer<typeof IndicesRecoveryShardRecovery>

export const IndicesRecoveryRecoveryStatus = z.object({
  shards: z.array(IndicesRecoveryShardRecovery)
}).meta({ id: 'IndicesRecoveryRecoveryStatus' })
export type IndicesRecoveryRecoveryStatus = z.infer<typeof IndicesRecoveryRecoveryStatus>

/**
 * Get index recovery information.
 *
 * Get information about ongoing and completed shard recoveries for one or more indices.
 * For data streams, the API returns information for the stream's backing indices.
 *
 * All recoveries, whether ongoing or complete, are kept in the cluster state and may be reported on at any time.
 *
 * Shard recovery is the process of initializing a shard copy, such as restoring a primary shard from a snapshot or creating a replica shard from a primary shard.
 * When a shard recovery completes, the recovered shard is available for search and indexing.
 *
 * Recovery automatically occurs during the following processes:
 *
 * * When creating an index for the first time.
 * * When a node rejoins the cluster and starts up any missing primary shard copies using the data that it holds in its data path.
 * * Creation of new replica shard copies from the primary.
 * * Relocation of a shard copy to a different node in the same cluster.
 * * A snapshot restore operation.
 * * A clone, shrink, or split operation.
 *
 * You can determine the cause of a shard recovery using the recovery or cat recovery APIs.
 *
 * The index recovery API reports information about completed recoveries only for shard copies that currently exist in the cluster.
 * It only reports the last recovery for each shard copy and does not report historical information about earlier recoveries, nor does it report information about the recoveries of shard copies that no longer exist.
 * This means that if a shard copy completes a recovery and then Elasticsearch relocates it onto a different node then the information about the original recovery will not be shown in the recovery API.
 */
export const IndicesRecoveryRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of data streams, indices, and aliases used to limit the request. Supports wildcards (`*`). To target all data streams and indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  active_only: z.boolean().describe('If `true`, the response only includes ongoing shard recoveries.').optional().meta({ found_in: 'query' }),
  detailed: z.boolean().describe('If `true`, the response includes detailed information about shard recoveries.').optional().meta({ found_in: 'query' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesRecoveryRequest' })
export type IndicesRecoveryRequest = z.infer<typeof IndicesRecoveryRequest>

export const IndicesRecoveryResponse = z.record(IndexName, IndicesRecoveryRecoveryStatus).meta({ id: 'IndicesRecoveryResponse' })
export type IndicesRecoveryResponse = z.infer<typeof IndicesRecoveryResponse>

/**
 * Refresh an index.
 *
 * A refresh makes recent operations performed on one or more indices available for search.
 * For data streams, the API runs the refresh operation on the stream’s backing indices.
 *
 * By default, Elasticsearch periodically refreshes indices every second, but only on indices that have received one search request or more in the last 30 seconds.
 * You can change this default interval with the `index.refresh_interval` setting.
 *
 * In Elastic Cloud Serverless, the default refresh interval is 5 seconds across all indices.
 *
 * Refresh requests are synchronous and do not return a response until the refresh operation completes.
 *
 * Refreshes are resource-intensive.
 * To ensure good cluster performance, it's recommended to wait for Elasticsearch's periodic refresh rather than performing an explicit refresh when possible.
 *
 * If your application workflow indexes documents and then runs a search to retrieve the indexed document, it's recommended to use the index API's `refresh=wait_for` query parameter option.
 * This option ensures the indexing operation waits for a periodic refresh before running the search.
 */
export const IndicesRefreshRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of data streams, indices, and aliases used to limit the request. Supports wildcards (`*`). To target all data streams and indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesRefreshRequest' })
export type IndicesRefreshRequest = z.infer<typeof IndicesRefreshRequest>

export const IndicesRefreshResponse = ShardsOperationResponseBase.meta({ id: 'IndicesRefreshResponse' })
export type IndicesRefreshResponse = z.infer<typeof IndicesRefreshResponse>

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

export const IndicesRemoveBlockRemoveIndicesBlockStatus = z.object({
  name: IndexName,
  unblocked: z.boolean().optional(),
  exception: z.lazy(() => ErrorCause).optional()
}).meta({ id: 'IndicesRemoveBlockRemoveIndicesBlockStatus' })
export type IndicesRemoveBlockRemoveIndicesBlockStatus = z.infer<typeof IndicesRemoveBlockRemoveIndicesBlockStatus>

/**
 * Remove an index block.
 *
 * Remove an index block from an index.
 * Index blocks limit the operations allowed on an index by blocking specific operation types.
 */
export const IndicesRemoveBlockRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-separated list or wildcard expression of index names used to limit the request. By default, you must explicitly name the indices you are removing blocks from. To allow the removal of blocks from indices with `_all`, `*`, or other wildcard expressions, change the `action.destructive_requires_name` setting to `false`. You can update this setting in the `elasticsearch.yml` file or by using the cluster update settings API.').meta({ found_in: 'path' }),
  block: IndicesIndicesBlockOptions.describe('The block type to remove from the index.').meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('The type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. It supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for the master node. If the master node is not available before the timeout expires, the request fails and returns an error. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response from all relevant nodes in the cluster after updating the cluster metadata. If no response is received before the timeout expires, the cluster metadata update still applies but the response will indicate that it was not completely acknowledged. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesRemoveBlockRequest' })
export type IndicesRemoveBlockRequest = z.infer<typeof IndicesRemoveBlockRequest>

export const IndicesRemoveBlockResponse = z.object({
  acknowledged: z.boolean(),
  indices: z.array(IndicesRemoveBlockRemoveIndicesBlockStatus)
}).meta({ id: 'IndicesRemoveBlockResponse' })
export type IndicesRemoveBlockResponse = z.infer<typeof IndicesRemoveBlockResponse>

/**
 * Resolve the cluster.
 *
 * Resolve the specified index expressions to return information about each cluster, including the local "querying" cluster, if included.
 * If no index expression is provided, the API will return information about all the remote clusters that are configured on the querying cluster.
 *
 * This endpoint is useful before doing a cross-cluster search in order to determine which remote clusters should be included in a search.
 *
 * You use the same index expression with this endpoint as you would for cross-cluster search.
 * Index and cluster exclusions are also supported with this endpoint.
 *
 * For each cluster in the index expression, information is returned about:
 *
 * * Whether the querying ("local") cluster is currently connected to each remote cluster specified in the index expression. Note that this endpoint actively attempts to contact the remote clusters, unlike the `remote/info` endpoint.
 * * Whether each remote cluster is configured with `skip_unavailable` as `true` or `false`.
 * * Whether there are any indices, aliases, or data streams on that cluster that match the index expression.
 * * Whether the search is likely to have errors returned when you do the cross-cluster search (including any authorization errors if you do not have permission to query the index).
 * * Cluster version information, including the Elasticsearch server version.
 *
 * For example, `GET /_resolve/cluster/my-index-*,cluster*:my-index-*` returns information about the local cluster and all remotely configured clusters that start with the alias `cluster*`.
 * Each cluster returns information about whether it has any indices, aliases or data streams that match `my-index-*`.
 *
 * ## Note on backwards compatibility
 * The ability to query without an index expression was added in version 8.18, so when
 * querying remote clusters older than that, the local cluster will send the index
 * expression `dummy*` to those remote clusters. Thus, if an errors occur, you may see a reference
 * to that index expression even though you didn't request it. If it causes a problem, you can
 * instead include an index expression like `*:*` to bypass the issue.
 *
 * ## Advantages of using this endpoint before a cross-cluster search
 *
 * You may want to exclude a cluster or index from a search when:
 *
 * * A remote cluster is not currently connected and is configured with `skip_unavailable=false`. Running a cross-cluster search under those conditions will cause the entire search to fail.
 * * A cluster has no matching indices, aliases or data streams for the index expression (or your user does not have permissions to search them). For example, suppose your index expression is `logs*,remote1:logs*` and the remote1 cluster has no indices, aliases or data streams that match `logs*`. In that case, that cluster will return no results from that cluster if you include it in a cross-cluster search.
 * * The index expression (combined with any query parameters you specify) will likely cause an exception to be thrown when you do the search. In these cases, the "error" field in the `_resolve/cluster` response will be present. (This is also where security/permission errors will be shown.)
 * * A remote cluster is an older version that does not support the feature you want to use in your search.
 *
 * ## Test availability of remote clusters
 *
 * The `remote/info` endpoint is commonly used to test whether the "local" cluster (the cluster being queried) is connected to its remote clusters, but it does not necessarily reflect whether the remote cluster is available or not.
 * The remote cluster may be available, while the local cluster is not currently connected to it.
 *
 * You can use the `_resolve/cluster` API to attempt to reconnect to remote clusters.
 * For example with `GET _resolve/cluster` or `GET _resolve/cluster/*:*`.
 * The `connected` field in the response will indicate whether it was successful.
 * If a connection was (re-)established, this will also cause the `remote/info` endpoint to now indicate a connected status.
 */
export const IndicesResolveClusterRequest = z.object({
  ...RequestBase.shape,
  name: Names.describe('A comma-separated list of names or index patterns for the indices, aliases, and data streams to resolve. Resources on remote clusters can be specified using the `<cluster>`:`<name>` syntax. Index and cluster exclusions (e.g., `-cluster1:*`) are also supported. If no index expression is specified, information about all remote clusters configured on the local cluster is returned without doing any index matching').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result. NOTE: This option is only supported when specifying an index expression. You will get an error if you specify index options to the `_resolve/cluster` API endpoint that takes no index expression.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`. NOTE: This option is only supported when specifying an index expression. You will get an error if you specify index options to the `_resolve/cluster` API endpoint that takes no index expression.').optional().meta({ found_in: 'query' }),
  ignore_throttled: z.boolean().describe('If true, concrete, expanded, or aliased indices are ignored when frozen. NOTE: This option is only supported when specifying an index expression. You will get an error if you specify index options to the `_resolve/cluster` API endpoint that takes no index expression.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored. NOTE: This option is only supported when specifying an index expression. You will get an error if you specify index options to the `_resolve/cluster` API endpoint that takes no index expression.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The maximum time to wait for remote clusters to respond. If a remote cluster does not respond within this timeout period, the API response will show the cluster as not connected and include an error message that the request timed out. The default timeout is unset and the query can take as long as the networking layer is configured to wait for remote clusters that are not responding (typically 30 seconds).').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesResolveClusterRequest' })
export type IndicesResolveClusterRequest = z.infer<typeof IndicesResolveClusterRequest>

/** Provides information about each cluster request relevant to doing a cross-cluster search. */
export const IndicesResolveClusterResolveClusterInfo = z.object({
  connected: z.boolean().describe('Whether the remote cluster is connected to the local (querying) cluster.'),
  skip_unavailable: z.boolean().describe('The `skip_unavailable` setting for a remote cluster.'),
  matching_indices: z.boolean().describe('Whether the index expression provided in the request matches any indices, aliases or data streams on the cluster.').optional(),
  error: z.string().describe('Provides error messages that are likely to occur if you do a search with this index expression on the specified cluster (for example, lack of security privileges to query an index).').optional(),
  version: ElasticsearchVersionMinInfo.describe('Provides version information about the cluster.').optional()
}).meta({ id: 'IndicesResolveClusterResolveClusterInfo' })
export type IndicesResolveClusterResolveClusterInfo = z.infer<typeof IndicesResolveClusterResolveClusterInfo>

export const IndicesResolveClusterResponse = z.record(ClusterAlias, IndicesResolveClusterResolveClusterInfo).meta({ id: 'IndicesResolveClusterResponse' })
export type IndicesResolveClusterResponse = z.infer<typeof IndicesResolveClusterResponse>

/**
 * Resolve indices.
 *
 * Resolve the names and/or index patterns for indices, aliases, and data streams.
 * Multiple patterns and remote clusters are supported.
 */
export const IndicesResolveIndexRequest = z.object({
  ...RequestBase.shape,
  name: Names.describe('Comma-separated name(s) or index pattern(s) of the indices, aliases, and data streams to resolve. Resources on remote clusters can be specified using the `<cluster>`:`<name>` syntax.').meta({ found_in: 'path' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  mode: z.union([IndicesIndexMode, z.array(IndicesIndexMode)]).describe('Filter indices by index mode - standard, lookup, time_series, etc. Comma-separated list of IndexMode. Empty means no filter.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesResolveIndexRequest' })
export type IndicesResolveIndexRequest = z.infer<typeof IndicesResolveIndexRequest>

export const IndicesResolveIndexResolveIndexAliasItem = z.object({
  name: Name,
  indices: Indices
}).meta({ id: 'IndicesResolveIndexResolveIndexAliasItem' })
export type IndicesResolveIndexResolveIndexAliasItem = z.infer<typeof IndicesResolveIndexResolveIndexAliasItem>

export const IndicesResolveIndexResolveIndexDataStreamsItem = z.object({
  name: DataStreamName,
  timestamp_field: Field,
  backing_indices: Indices
}).meta({ id: 'IndicesResolveIndexResolveIndexDataStreamsItem' })
export type IndicesResolveIndexResolveIndexDataStreamsItem = z.infer<typeof IndicesResolveIndexResolveIndexDataStreamsItem>

export const IndicesResolveIndexResolveIndexItem = z.object({
  name: Name,
  aliases: z.array(z.string()).optional(),
  attributes: z.array(z.string()),
  data_stream: DataStreamName.optional(),
  mode: IndicesIndexMode.optional()
}).meta({ id: 'IndicesResolveIndexResolveIndexItem' })
export type IndicesResolveIndexResolveIndexItem = z.infer<typeof IndicesResolveIndexResolveIndexItem>

export const IndicesResolveIndexResponse = z.object({
  indices: z.array(IndicesResolveIndexResolveIndexItem),
  aliases: z.array(IndicesResolveIndexResolveIndexAliasItem),
  data_streams: z.array(IndicesResolveIndexResolveIndexDataStreamsItem)
}).meta({ id: 'IndicesResolveIndexResponse' })
export type IndicesResolveIndexResponse = z.infer<typeof IndicesResolveIndexResponse>

export const IndicesRolloverRolloverConditions = z.object({
  min_age: Duration.optional(),
  max_age: Duration.optional(),
  max_age_millis: DurationValue.optional(),
  min_docs: long.optional(),
  max_docs: long.optional(),
  max_size: ByteSize.describe('The `max_size` condition has been deprecated in 9.3.0 and `max_primary_shard_size` should be used instead').optional(),
  max_size_bytes: long.optional(),
  min_size: ByteSize.optional(),
  min_size_bytes: long.optional(),
  max_primary_shard_size: ByteSize.optional(),
  max_primary_shard_size_bytes: long.optional(),
  min_primary_shard_size: ByteSize.optional(),
  min_primary_shard_size_bytes: long.optional(),
  max_primary_shard_docs: long.optional(),
  min_primary_shard_docs: long.optional()
}).meta({ id: 'IndicesRolloverRolloverConditions' })
export type IndicesRolloverRolloverConditions = z.infer<typeof IndicesRolloverRolloverConditions>

/**
 * Roll over to a new index.
 *
 * TIP: We recommend using the index lifecycle rollover action to automate rollovers. However, Serverless does not support Index Lifecycle Management (ILM), so don't use this approach in the Serverless context.
 *
 * The rollover API creates a new index for a data stream or index alias.
 * The API behavior depends on the rollover target.
 *
 * **Roll over a data stream**
 *
 * If you roll over a data stream, the API creates a new write index for the stream.
 * The stream's previous write index becomes a regular backing index.
 * A rollover also increments the data stream's generation.
 *
 * **Roll over an index alias with a write index**
 *
 * TIP: Prior to Elasticsearch 7.9, you'd typically use an index alias with a write index to manage time series data.
 * Data streams replace this functionality, require less maintenance, and automatically integrate with data tiers.
 *
 * If an index alias points to multiple indices, one of the indices must be a write index.
 * The rollover API creates a new write index for the alias with `is_write_index` set to `true`.
 * The API also `sets is_write_index` to `false` for the previous write index.
 *
 * **Roll over an index alias with one index**
 *
 * If you roll over an index alias that points to only one index, the API creates a new index for the alias and removes the original index from the alias.
 *
 * NOTE: A rollover creates a new index and is subject to the `wait_for_active_shards` setting.
 *
 * **Increment index names for an alias**
 *
 * When you roll over an index alias, you can specify a name for the new index.
 * If you don't specify a name and the current index ends with `-` and a number, such as `my-index-000001` or `my-index-3`, the new index name increments that number.
 * For example, if you roll over an alias with a current index of `my-index-000001`, the rollover creates a new index named `my-index-000002`.
 * This number is always six characters and zero-padded, regardless of the previous index's name.
 *
 * If you use an index alias for time series data, you can use date math in the index name to track the rollover date.
 * For example, you can create an alias that points to an index named `<my-index-{now/d}-000001>`.
 * If you create the index on May 6, 2099, the index's name is `my-index-2099.05.06-000001`.
 * If you roll over the alias on May 7, 2099, the new index's name is `my-index-2099.05.07-000002`.
 */
export const IndicesRolloverRequest = z.object({
  ...RequestBase.shape,
  alias: IndexAlias.describe('Name of the data stream or index alias to roll over.').meta({ found_in: 'path' }),
  new_index: IndexName.describe('Name of the index to create. Supports date math. Data streams do not support this parameter.').optional().meta({ found_in: 'path' }),
  dry_run: z.boolean().describe('If `true`, checks whether the current index satisfies the specified conditions but does not perform a rollover.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  wait_for_active_shards: WaitForActiveShards.describe('The number of shard copies that must be active before proceeding with the operation. Set to all or any positive integer up to the total number of shards in the index (`number_of_replicas+1`).').optional().meta({ found_in: 'query' }),
  lazy: z.boolean().describe('If set to true, the rollover action will only mark a data stream to signal that it needs to be rolled over at the next write. Only allowed on data streams.').optional().meta({ found_in: 'query' }),
  aliases: z.record(IndexName, IndicesAlias).describe('Aliases for the target index. Data streams do not support this parameter.').optional().meta({ found_in: 'body' }),
  conditions: IndicesRolloverRolloverConditions.describe('Conditions for the rollover. If specified, Elasticsearch only performs the rollover if the current index satisfies these conditions. If this parameter is not specified, Elasticsearch performs the rollover unconditionally. If conditions are specified, at least one of them must be a `max_*` condition. The index will rollover if any `max_*` condition is satisfied and all `min_*` conditions are satisfied.').optional().meta({ found_in: 'body' }),
  mappings: z.lazy(() => MappingTypeMapping).describe('Mapping for fields in the index. If specified, this mapping can include field names, field data types, and mapping paramaters.').optional().meta({ found_in: 'body' }),
  settings: z.record(z.string(), z.any()).describe('Configuration options for the index. Data streams do not support this parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesRolloverRequest' })
export type IndicesRolloverRequest = z.infer<typeof IndicesRolloverRequest>

export const IndicesRolloverResponse = z.object({
  acknowledged: z.boolean(),
  conditions: z.record(z.string(), z.boolean()),
  dry_run: z.boolean(),
  new_index: z.string(),
  old_index: z.string(),
  rolled_over: z.boolean(),
  shards_acknowledged: z.boolean()
}).meta({ id: 'IndicesRolloverResponse' })
export type IndicesRolloverResponse = z.infer<typeof IndicesRolloverResponse>

export const IndicesSegmentsShardSegmentRouting = z.object({
  node: z.string().describe('The node ID of the node that holds the shard.'),
  primary: z.boolean().describe('If `true`, the shard is a primary shard.'),
  state: z.string().describe('The state of the shard, such as `STARTED` or `RELOCATING`.')
}).meta({ id: 'IndicesSegmentsShardSegmentRouting' })
export type IndicesSegmentsShardSegmentRouting = z.infer<typeof IndicesSegmentsShardSegmentRouting>

export const IndicesSegmentsSegment = z.object({
  attributes: z.record(z.string(), z.string()).describe('Contains information about whether high compression was enabled and per-field vector formats.'),
  committed: z.boolean().describe('If `true`, the segment is synced to disk. Segments that are synced can survive a hard reboot. If `false`, the data from uncommitted segments is also stored in the transaction log so that Elasticsearch is able to replay changes on the next start.'),
  compound: z.boolean().describe('If `true`, Lucene merged all files from the segment into a single file to save file descriptors.'),
  deleted_docs: long.describe('The number of deleted documents as reported by Lucene, which may be higher or lower than the number of delete operations you have performed. This number excludes deletes that were performed recently and do not yet belong to a segment. Deleted documents are cleaned up by the automatic merge process if it makes sense to do so. Also, Elasticsearch creates extra deleted documents to internally track the recent history of operations on a shard.'),
  generation: integer.describe('Generation number, such as `0`. Elasticsearch increments this generation number for each segment written then uses this number to derive the segment name.'),
  search: z.boolean().describe('If `true`, the segment is searchable. If `false`, the segment has most likely been written to disk but needs a refresh to be searchable.'),
  size_in_bytes: double.describe('Disk space used by the segment, in bytes.'),
  num_docs: long.describe('The number of documents as reported by Lucene. This excludes deleted documents and counts any nested documents separately from their parents. It also excludes documents which were indexed recently and do not yet belong to a segment.'),
  version: VersionString.describe('Version of Lucene used to write the segment.')
}).meta({ id: 'IndicesSegmentsSegment' })
export type IndicesSegmentsSegment = z.infer<typeof IndicesSegmentsSegment>

export const IndicesSegmentsShardsSegment = z.object({
  num_committed_segments: integer,
  routing: IndicesSegmentsShardSegmentRouting,
  num_search_segments: integer,
  segments: z.record(z.string(), IndicesSegmentsSegment)
}).meta({ id: 'IndicesSegmentsShardsSegment' })
export type IndicesSegmentsShardsSegment = z.infer<typeof IndicesSegmentsShardsSegment>

export const IndicesSegmentsIndexSegment = z.object({
  shards: z.record(z.string(), z.union([IndicesSegmentsShardsSegment, z.array(IndicesSegmentsShardsSegment)]))
}).meta({ id: 'IndicesSegmentsIndexSegment' })
export type IndicesSegmentsIndexSegment = z.infer<typeof IndicesSegmentsIndexSegment>

/**
 * Get index segments.
 *
 * Get low-level information about the Lucene segments in index shards.
 * For data streams, the API returns information about the stream's backing indices.
 */
export const IndicesSegmentsRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of data streams, indices, and aliases used to limit the request. Supports wildcards (`*`). To target all data streams and indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesSegmentsRequest' })
export type IndicesSegmentsRequest = z.infer<typeof IndicesSegmentsRequest>

export const IndicesSegmentsResponse = z.object({
  indices: z.record(z.string(), IndicesSegmentsIndexSegment),
  _shards: ShardStatistics
}).meta({ id: 'IndicesSegmentsResponse' })
export type IndicesSegmentsResponse = z.infer<typeof IndicesSegmentsResponse>

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

export const IndicesShardStoresShardStoreNode = z.object({
  attributes: z.record(z.string(), z.string()),
  ephemeral_id: z.string().optional(),
  external_id: z.string().optional(),
  name: Name,
  roles: z.array(z.string()),
  transport_address: TransportAddress
}).meta({ id: 'IndicesShardStoresShardStoreNode' })
export type IndicesShardStoresShardStoreNode = z.infer<typeof IndicesShardStoresShardStoreNode>

/**
 * Shrink an index.
 *
 * Shrink an index into a new index with fewer primary shards.
 *
 * Before you can shrink an index:
 *
 * * The index must be read-only.
 * * A copy of every shard in the index must reside on the same node.
 * * The index must have a green health status.
 *
 * To make shard allocation easier, we recommend you also remove the index's replica shards.
 * You can later re-add replica shards as part of the shrink operation.
 *
 * The requested number of primary shards in the target index must be a factor of the number of shards in the source index.
 * For example an index with 8 primary shards can be shrunk into 4, 2 or 1 primary shards or an index with 15 primary shards can be shrunk into 5, 3 or 1.
 * If the number of shards in the index is a prime number it can only be shrunk into a single primary shard
 *  Before shrinking, a (primary or replica) copy of every shard in the index must be present on the same node.
 *
 * IMPORTANT: If the source index already has one primary shard, configuring the shrink operation with 'index.number_of_shards: 1' will cause the request to fail. An index with one primary shard cannot be shrunk further.
 *
 * The current write index on a data stream cannot be shrunk. In order to shrink the current write index, the data stream must first be rolled over so that a new write index is created and then the previous write index can be shrunk.
 *
 * A shrink operation:
 *
 * * Creates a new target index with the same definition as the source index, but with a smaller number of primary shards.
 * * Hard-links segments from the source index into the target index. If the file system does not support hard-linking, then all segments are copied into the new index, which is a much more time consuming process. Also if using multiple data paths, shards on different data paths require a full copy of segment files if they are not on the same disk since hardlinks do not work across disks.
 * * Recovers the target index as though it were a closed index which had just been re-opened. Recovers shards to the `.routing.allocation.initial_recovery._id` index setting.
 *
 * IMPORTANT: Indices can only be shrunk if they satisfy the following requirements:
 *
 * * The target index must not exist.
 * * The source index must have more primary shards than the target index.
 * * The number of primary shards in the target index must be a factor of the number of primary shards in the source index. The source index must have more primary shards than the target index.
 * * The index must not contain more than 2,147,483,519 documents in total across all shards that will be shrunk into a single shard on the target index as this is the maximum number of docs that can fit into a single shard.
 * * The node handling the shrink process must have sufficient free disk space to accommodate a second copy of the existing index.
 */
export const IndicesShrinkRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('Name of the source index to shrink.').meta({ found_in: 'path' }),
  target: IndexName.describe('Name of the target index to create.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  wait_for_active_shards: WaitForActiveShards.describe('The number of shard copies that must be active before proceeding with the operation. Set to `all` or any positive integer up to the total number of shards in the index (`number_of_replicas+1`).').optional().meta({ found_in: 'query' }),
  aliases: z.record(IndexName, IndicesAlias).describe('The key is the alias name. Index alias names support date math.').optional().meta({ found_in: 'body' }),
  settings: z.record(z.string(), z.any()).describe('Configuration options for the target index.').optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesShrinkRequest' })
export type IndicesShrinkRequest = z.infer<typeof IndicesShrinkRequest>

export const IndicesShrinkResponse = z.object({
  acknowledged: z.boolean(),
  shards_acknowledged: z.boolean(),
  index: IndexName
}).meta({ id: 'IndicesShrinkResponse' })
export type IndicesShrinkResponse = z.infer<typeof IndicesShrinkResponse>

/**
 * Simulate an index.
 *
 * Get the index configuration that would be applied to the specified index from an existing index template.
 */
export const IndicesSimulateIndexTemplateRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('Name of the index to simulate').meta({ found_in: 'path' }),
  create: z.boolean().describe('Whether the index template we optionally defined in the body should only be dry-run added if new or can also replace an existing one').optional().meta({ found_in: 'query' }),
  cause: z.string().describe('User defined reason for dry-run creating the new template for simulation purposes').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  include_defaults: z.boolean().describe('If true, returns all relevant default configurations for the index template.').optional().meta({ found_in: 'query' }),
  index_template: IndicesIndexTemplate.optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesSimulateIndexTemplateRequest' })
export type IndicesSimulateIndexTemplateRequest = z.infer<typeof IndicesSimulateIndexTemplateRequest>

export const IndicesSimulateTemplateOverlapping = z.object({
  name: Name,
  index_patterns: z.array(z.string())
}).meta({ id: 'IndicesSimulateTemplateOverlapping' })
export type IndicesSimulateTemplateOverlapping = z.infer<typeof IndicesSimulateTemplateOverlapping>

export const IndicesSimulateTemplateTemplate = z.object({
  aliases: z.record(IndexName, IndicesAlias),
  mappings: z.lazy(() => MappingTypeMapping),
  settings: z.lazy(() => IndicesIndexSettings)
}).meta({ id: 'IndicesSimulateTemplateTemplate' })
export type IndicesSimulateTemplateTemplate = z.infer<typeof IndicesSimulateTemplateTemplate>

export const IndicesSimulateIndexTemplateResponse = z.object({
  overlapping: z.array(IndicesSimulateTemplateOverlapping).optional(),
  template: IndicesSimulateTemplateTemplate
}).meta({ id: 'IndicesSimulateIndexTemplateResponse' })
export type IndicesSimulateIndexTemplateResponse = z.infer<typeof IndicesSimulateIndexTemplateResponse>

/**
 * Simulate an index template.
 *
 * Get the index configuration that would be applied by a particular index template.
 */
export const IndicesSimulateTemplateRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('Name of the index template to simulate. To test a template configuration before you add it to the cluster, omit this parameter and specify the template configuration in the request body.').optional().meta({ found_in: 'path' }),
  create: z.boolean().describe('If true, the template passed in the body is only used if no existing templates match the same index patterns. If false, the simulation uses the template with the highest priority. Note that the template is not permanently added or updated in either case; it is only used for the simulation.').optional().meta({ found_in: 'query' }),
  cause: z.string().describe('User defined reason for dry-run creating the new template for simulation purposes').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  include_defaults: z.boolean().describe('If true, returns all relevant default configurations for the index template.').optional().meta({ found_in: 'query' }),
  allow_auto_create: z.boolean().describe('This setting overrides the value of the `action.auto_create_index` cluster setting. If set to `true` in a template, then indices can be automatically created using that template even if auto-creation of indices is disabled via `actions.auto_create_index`. If set to `false`, then indices or data streams matching the template must always be explicitly created, and may never be automatically created.').optional().meta({ found_in: 'body' }),
  index_patterns: Indices.describe('Array of wildcard (`*`) expressions used to match the names of data streams and indices during creation.').optional().meta({ found_in: 'body' }),
  composed_of: z.array(Name).describe('An ordered list of component template names. Component templates are merged in the order specified, meaning that the last component template specified has the highest precedence.').optional().meta({ found_in: 'body' }),
  template: IndicesPutIndexTemplateIndexTemplateMapping.describe('Template to be applied. It may optionally include an `aliases`, `mappings`, or `settings` configuration.').optional().meta({ found_in: 'body' }),
  data_stream: IndicesDataStreamVisibility.describe('If this object is included, the template is used to create data streams and their backing indices. Supports an empty object. Data streams require a matching index template with a `data_stream` object.').optional().meta({ found_in: 'body' }),
  priority: long.describe('Priority to determine index template precedence when a new data stream or index is created. The index template with the highest priority is chosen. If no priority is specified the template is treated as though it is of priority 0 (lowest priority). This number is not automatically generated by Elasticsearch.').optional().meta({ found_in: 'body' }),
  version: VersionNumber.describe('Version number used to manage index templates externally. This number is not automatically generated by Elasticsearch.').optional().meta({ found_in: 'body' }),
  _meta: Metadata.describe('Optional user metadata about the index template. May have any contents. This map is not automatically generated by Elasticsearch.').optional().meta({ found_in: 'body' }),
  ignore_missing_component_templates: z.array(z.string()).describe('The configuration option ignore_missing_component_templates can be used when an index template references a component template that might not exist').optional().meta({ found_in: 'body' }),
  deprecated: z.boolean().describe('Marks this index template as deprecated. When creating or updating a non-deprecated index template that uses deprecated components, Elasticsearch will emit a deprecation warning.').optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesSimulateTemplateRequest' })
export type IndicesSimulateTemplateRequest = z.infer<typeof IndicesSimulateTemplateRequest>

export const IndicesSimulateTemplateResponse = z.object({
  overlapping: z.array(IndicesSimulateTemplateOverlapping).optional(),
  template: IndicesSimulateTemplateTemplate
}).meta({ id: 'IndicesSimulateTemplateResponse' })
export type IndicesSimulateTemplateResponse = z.infer<typeof IndicesSimulateTemplateResponse>

/**
 * Split an index.
 *
 * Split an index into a new index with more primary shards.
 * * Before you can split an index:
 *
 * * The index must be read-only.
 * * The cluster health status must be green.
 *
 * You can do make an index read-only with the following request using the add index block API:
 *
 * ```
 * PUT /my_source_index/_block/write
 * ```
 *
 * The current write index on a data stream cannot be split.
 * In order to split the current write index, the data stream must first be rolled over so that a new write index is created and then the previous write index can be split.
 *
 * The number of times the index can be split (and the number of shards that each original shard can be split into) is determined by the `index.number_of_routing_shards` setting.
 * The number of routing shards specifies the hashing space that is used internally to distribute documents across shards with consistent hashing.
 * For instance, a 5 shard index with `number_of_routing_shards` set to 30 (5 x 2 x 3) could be split by a factor of 2 or 3.
 *
 * A split operation:
 *
 * * Creates a new target index with the same definition as the source index, but with a larger number of primary shards.
 * * Hard-links segments from the source index into the target index. If the file system doesn't support hard-linking, all segments are copied into the new index, which is a much more time consuming process.
 * * Hashes all documents again, after low level files are created, to delete documents that belong to a different shard.
 * * Recovers the target index as though it were a closed index which had just been re-opened.
 *
 * IMPORTANT: Indices can only be split if they satisfy the following requirements:
 *
 * * The target index must not exist.
 * * The source index must have fewer primary shards than the target index.
 * * The number of primary shards in the target index must be a multiple of the number of primary shards in the source index.
 * * The node handling the split process must have sufficient free disk space to accommodate a second copy of the existing index.
 */
export const IndicesSplitRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('Name of the source index to split.').meta({ found_in: 'path' }),
  target: IndexName.describe('Name of the target index to create.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  wait_for_active_shards: WaitForActiveShards.describe('The number of shard copies that must be active before proceeding with the operation. Set to `all` or any positive integer up to the total number of shards in the index (`number_of_replicas+1`).').optional().meta({ found_in: 'query' }),
  aliases: z.record(IndexName, IndicesAlias).describe('Aliases for the resulting index.').optional().meta({ found_in: 'body' }),
  settings: z.record(z.string(), z.any()).describe('Configuration options for the target index.').optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesSplitRequest' })
export type IndicesSplitRequest = z.infer<typeof IndicesSplitRequest>

export const IndicesSplitResponse = z.object({
  acknowledged: z.boolean(),
  shards_acknowledged: z.boolean(),
  index: IndexName
}).meta({ id: 'IndicesSplitResponse' })
export type IndicesSplitResponse = z.infer<typeof IndicesSplitResponse>

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

export const IndicesUpdateAliasesAddAction = z.object({
  alias: IndexAlias.describe('Alias for the action. Index alias names support date math.').optional(),
  aliases: z.union([IndexAlias, z.array(IndexAlias)]).describe('Aliases for the action. Index alias names support date math.').optional(),
  filter: z.lazy(() => QueryDslQueryContainer).describe('Query used to limit documents the alias can access.').optional(),
  index: IndexName.describe('Data stream or index for the action. Supports wildcards (`*`).').optional(),
  indices: Indices.describe('Data streams or indices for the action. Supports wildcards (`*`).').optional(),
  index_routing: z.string().describe('Value used to route indexing operations to a specific shard. If specified, this overwrites the `routing` value for indexing operations. Data stream aliases don’t support this parameter.').optional(),
  is_hidden: z.boolean().describe('If `true`, the alias is hidden.').optional(),
  is_write_index: z.boolean().describe('If `true`, sets the write index or data stream for the alias.').optional(),
  routing: z.string().describe('Value used to route indexing and search operations to a specific shard. Data stream aliases don’t support this parameter.').optional(),
  search_routing: z.string().describe('Value used to route search operations to a specific shard. If specified, this overwrites the `routing` value for search operations. Data stream aliases don’t support this parameter.').optional(),
  must_exist: z.boolean().describe('If `true`, the alias must exist to perform the action.').optional()
}).meta({ id: 'IndicesUpdateAliasesAddAction' })
export type IndicesUpdateAliasesAddAction = z.infer<typeof IndicesUpdateAliasesAddAction>

export const IndicesUpdateAliasesRemoveAction = z.object({
  alias: IndexAlias.describe('Alias for the action. Index alias names support date math.').optional(),
  aliases: z.union([IndexAlias, z.array(IndexAlias)]).describe('Aliases for the action. Index alias names support date math.').optional(),
  index: IndexName.describe('Data stream or index for the action. Supports wildcards (`*`).').optional(),
  indices: Indices.describe('Data streams or indices for the action. Supports wildcards (`*`).').optional(),
  must_exist: z.boolean().describe('If `true`, the alias must exist to perform the action.').optional()
}).meta({ id: 'IndicesUpdateAliasesRemoveAction' })
export type IndicesUpdateAliasesRemoveAction = z.infer<typeof IndicesUpdateAliasesRemoveAction>

export const IndicesUpdateAliasesRemoveIndexAction = z.object({
  index: IndexName.describe('Data stream or index for the action. Supports wildcards (`*`).').optional(),
  indices: Indices.describe('Data streams or indices for the action. Supports wildcards (`*`).').optional(),
  must_exist: z.boolean().describe('If `true`, the alias must exist to perform the action.').optional()
}).meta({ id: 'IndicesUpdateAliasesRemoveIndexAction' })
export type IndicesUpdateAliasesRemoveIndexAction = z.infer<typeof IndicesUpdateAliasesRemoveIndexAction>

const IndicesUpdateAliasesActionExclusiveProps = z.union([z.object({ add: IndicesUpdateAliasesAddAction }), z.object({ remove: IndicesUpdateAliasesRemoveAction }), z.object({ remove_index: IndicesUpdateAliasesRemoveIndexAction })])

export const IndicesUpdateAliasesAction = IndicesUpdateAliasesActionExclusiveProps.meta({ id: 'IndicesUpdateAliasesAction' })
export type IndicesUpdateAliasesAction = z.infer<typeof IndicesUpdateAliasesAction>

/**
 * Create or update an alias.
 *
 * Adds a data stream or index to an alias.
 */
export const IndicesUpdateAliasesRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  actions: z.array(IndicesUpdateAliasesAction).describe('Actions to perform.').optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesUpdateAliasesRequest' })
export type IndicesUpdateAliasesRequest = z.infer<typeof IndicesUpdateAliasesRequest>

export const IndicesUpdateAliasesResponse = AcknowledgedResponseBase.meta({ id: 'IndicesUpdateAliasesResponse' })
export type IndicesUpdateAliasesResponse = z.infer<typeof IndicesUpdateAliasesResponse>

export const IndicesValidateQueryIndicesValidationExplanation = z.object({
  error: z.string().optional(),
  explanation: z.string().optional(),
  index: IndexName.optional(),
  shard: integer.optional(),
  valid: z.boolean()
}).meta({ id: 'IndicesValidateQueryIndicesValidationExplanation' })
export type IndicesValidateQueryIndicesValidationExplanation = z.infer<typeof IndicesValidateQueryIndicesValidationExplanation>

/**
 * Validate a query.
 *
 * Validates a query without running it.
 */
export const IndicesValidateQueryRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of data streams, indices, and aliases to search. Supports wildcards (`*`). To search all data streams or indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  all_shards: z.boolean().describe('If `true`, the validation is executed on all shards instead of one random shard per index.').optional().meta({ found_in: 'query' }),
  analyzer: z.string().describe('Analyzer to use for the query string. This parameter can only be used when the `q` query string parameter is specified.').optional().meta({ found_in: 'query' }),
  analyze_wildcard: z.boolean().describe('If `true`, wildcard and prefix queries are analyzed.').optional().meta({ found_in: 'query' }),
  default_operator: z.lazy(() => QueryDslOperator).describe('The default operator for query string query: `and` or `or`.').optional().meta({ found_in: 'query' }),
  df: z.string().describe('Field to use as default where no field prefix is given in the query string. This parameter can only be used when the `q` query string parameter is specified.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  explain: z.boolean().describe('If `true`, the response returns detailed information if an error has occurred.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  lenient: z.boolean().describe('If `true`, format-based query failures (such as providing text to a numeric field) in the query string will be ignored.').optional().meta({ found_in: 'query' }),
  rewrite: z.boolean().describe('If `true`, returns a more detailed explanation showing the actual Lucene query that will be executed.').optional().meta({ found_in: 'query' }),
  q: z.string().describe('Query in the Lucene query string syntax.').optional().meta({ found_in: 'query' }),
  query: z.lazy(() => QueryDslQueryContainer).describe('Query in the Lucene query string syntax.').optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesValidateQueryRequest' })
export type IndicesValidateQueryRequest = z.infer<typeof IndicesValidateQueryRequest>

export const IndicesValidateQueryResponse = z.object({
  explanations: z.array(IndicesValidateQueryIndicesValidationExplanation).optional(),
  _shards: ShardStatistics.optional(),
  valid: z.boolean(),
  error: z.string().optional()
}).meta({ id: 'IndicesValidateQueryResponse' })
export type IndicesValidateQueryResponse = z.infer<typeof IndicesValidateQueryResponse>
