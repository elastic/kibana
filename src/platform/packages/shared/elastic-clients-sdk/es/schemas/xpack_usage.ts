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

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

/** Path to field or array of paths. Some API's support wildcards in the path to select multiple fields. */
export const Field = z.string().meta({ id: 'Field' })
export type Field = z.infer<typeof Field>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const double = z.number().meta({ id: 'double' })
export type double = z.infer<typeof double>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const uint = z.number().meta({ id: 'uint' })
export type uint = z.infer<typeof uint>

export const ulong = z.number().meta({ id: 'ulong' })
export type ulong = z.infer<typeof ulong>

export const MlJobStatistics = z.object({
  avg: double,
  max: double,
  min: double,
  total: double
}).meta({ id: 'MlJobStatistics' })
export type MlJobStatistics = z.infer<typeof MlJobStatistics>

export const SlmStatistics = z.object({
  retention_deletion_time: Duration.optional(),
  retention_deletion_time_millis: DurationValue.optional(),
  retention_failed: long.optional(),
  retention_runs: long.optional(),
  retention_timed_out: long.optional(),
  policy: Id.optional(),
  total_snapshots_deleted: long.optional(),
  snapshots_deleted: long.optional(),
  total_snapshot_deletion_failures: long.optional(),
  snapshot_deletion_failures: long.optional(),
  total_snapshots_failed: long.optional(),
  snapshots_failed: long.optional(),
  total_snapshots_taken: long.optional(),
  snapshots_taken: long.optional()
}).meta({ id: 'SlmStatistics' })
export type SlmStatistics = z.infer<typeof SlmStatistics>

export const XpackUsageBase = z.object({
  available: z.boolean(),
  enabled: z.boolean()
}).meta({ id: 'XpackUsageBase' })
export type XpackUsageBase = z.infer<typeof XpackUsageBase>

export const XpackUsageAnalyticsStatistics = z.object({
  boxplot_usage: long,
  cumulative_cardinality_usage: long,
  string_stats_usage: long,
  top_metrics_usage: long,
  t_test_usage: long,
  moving_percentiles_usage: long,
  normalize_usage: long,
  rate_usage: long,
  multi_terms_usage: long.optional()
}).meta({ id: 'XpackUsageAnalyticsStatistics' })
export type XpackUsageAnalyticsStatistics = z.infer<typeof XpackUsageAnalyticsStatistics>

export const XpackUsageAnalytics = z.object({
  ...XpackUsageBase.shape,
  stats: XpackUsageAnalyticsStatistics
}).meta({ id: 'XpackUsageAnalytics' })
export type XpackUsageAnalytics = z.infer<typeof XpackUsageAnalytics>

export const XpackUsageArchive = z.object({
  ...XpackUsageBase.shape,
  indices_count: long
}).meta({ id: 'XpackUsageArchive' })
export type XpackUsageArchive = z.infer<typeof XpackUsageArchive>

export const XpackUsageFeatureToggle = z.object({
  enabled: z.boolean()
}).meta({ id: 'XpackUsageFeatureToggle' })
export type XpackUsageFeatureToggle = z.infer<typeof XpackUsageFeatureToggle>

export const XpackUsageAudit = z.object({
  ...XpackUsageFeatureToggle.shape,
  outputs: z.array(z.string()).optional()
}).meta({ id: 'XpackUsageAudit' })
export type XpackUsageAudit = z.infer<typeof XpackUsageAudit>

export const XpackUsageCcr = z.object({
  ...XpackUsageBase.shape,
  auto_follow_patterns_count: integer,
  follower_indices_count: integer
}).meta({ id: 'XpackUsageCcr' })
export type XpackUsageCcr = z.infer<typeof XpackUsageCcr>

export const XpackUsageCounter = z.object({
  active: long,
  total: long
}).meta({ id: 'XpackUsageCounter' })
export type XpackUsageCounter = z.infer<typeof XpackUsageCounter>

export const XpackUsageDataStreams = z.object({
  ...XpackUsageBase.shape,
  data_streams: long,
  indices_count: long
}).meta({ id: 'XpackUsageDataStreams' })
export type XpackUsageDataStreams = z.infer<typeof XpackUsageDataStreams>

export const XpackUsageDataTierPhaseStatistics = z.object({
  node_count: long,
  index_count: long,
  total_shard_count: long,
  primary_shard_count: long,
  doc_count: long,
  total_size_bytes: long,
  primary_size_bytes: long,
  primary_shard_size_avg_bytes: long,
  primary_shard_size_median_bytes: long,
  primary_shard_size_mad_bytes: long
}).meta({ id: 'XpackUsageDataTierPhaseStatistics' })
export type XpackUsageDataTierPhaseStatistics = z.infer<typeof XpackUsageDataTierPhaseStatistics>

export const XpackUsageDataTiers = z.object({
  ...XpackUsageBase.shape,
  data_warm: XpackUsageDataTierPhaseStatistics,
  data_frozen: XpackUsageDataTierPhaseStatistics.optional(),
  data_cold: XpackUsageDataTierPhaseStatistics,
  data_content: XpackUsageDataTierPhaseStatistics,
  data_hot: XpackUsageDataTierPhaseStatistics
}).meta({ id: 'XpackUsageDataTiers' })
export type XpackUsageDataTiers = z.infer<typeof XpackUsageDataTiers>

export const XpackUsageDatafeed = z.object({
  count: long
}).meta({ id: 'XpackUsageDatafeed' })
export type XpackUsageDatafeed = z.infer<typeof XpackUsageDatafeed>

export const XpackUsageEqlFeaturesJoin = z.object({
  join_queries_two: uint,
  join_queries_three: uint,
  join_until: uint,
  join_queries_five_or_more: uint,
  join_queries_four: uint
}).meta({ id: 'XpackUsageEqlFeaturesJoin' })
export type XpackUsageEqlFeaturesJoin = z.infer<typeof XpackUsageEqlFeaturesJoin>

export const XpackUsageEqlFeaturesKeys = z.object({
  join_keys_two: uint,
  join_keys_one: uint,
  join_keys_three: uint,
  join_keys_five_or_more: uint,
  join_keys_four: uint
}).meta({ id: 'XpackUsageEqlFeaturesKeys' })
export type XpackUsageEqlFeaturesKeys = z.infer<typeof XpackUsageEqlFeaturesKeys>

export const XpackUsageEqlFeaturesPipes = z.object({
  pipe_tail: uint,
  pipe_head: uint
}).meta({ id: 'XpackUsageEqlFeaturesPipes' })
export type XpackUsageEqlFeaturesPipes = z.infer<typeof XpackUsageEqlFeaturesPipes>

export const XpackUsageEqlFeaturesSequences = z.object({
  sequence_queries_three: uint,
  sequence_queries_four: uint,
  sequence_queries_two: uint,
  sequence_until: uint,
  sequence_queries_five_or_more: uint,
  sequence_maxspan: uint
}).meta({ id: 'XpackUsageEqlFeaturesSequences' })
export type XpackUsageEqlFeaturesSequences = z.infer<typeof XpackUsageEqlFeaturesSequences>

export const XpackUsageEqlFeatures = z.object({
  join: uint,
  joins: XpackUsageEqlFeaturesJoin,
  keys: XpackUsageEqlFeaturesKeys,
  event: uint,
  pipes: XpackUsageEqlFeaturesPipes,
  sequence: uint,
  sequences: XpackUsageEqlFeaturesSequences
}).meta({ id: 'XpackUsageEqlFeatures' })
export type XpackUsageEqlFeatures = z.infer<typeof XpackUsageEqlFeatures>

export const XpackUsageQuery = z.object({
  count: integer.optional(),
  failed: integer.optional(),
  paging: integer.optional(),
  total: integer.optional()
}).meta({ id: 'XpackUsageQuery' })
export type XpackUsageQuery = z.infer<typeof XpackUsageQuery>

export const XpackUsageEql = z.object({
  ...XpackUsageBase.shape,
  features: XpackUsageEqlFeatures,
  queries: z.record(z.string(), XpackUsageQuery)
}).meta({ id: 'XpackUsageEql' })
export type XpackUsageEql = z.infer<typeof XpackUsageEql>

export const XpackUsageFlattened = z.object({
  ...XpackUsageBase.shape,
  field_count: integer
}).meta({ id: 'XpackUsageFlattened' })
export type XpackUsageFlattened = z.infer<typeof XpackUsageFlattened>

export const XpackUsageInvocations = z.object({
  total: long
}).meta({ id: 'XpackUsageInvocations' })
export type XpackUsageInvocations = z.infer<typeof XpackUsageInvocations>

export const XpackUsageHealthStatistics = z.object({
  ...XpackUsageBase.shape,
  invocations: XpackUsageInvocations
}).meta({ id: 'XpackUsageHealthStatistics' })
export type XpackUsageHealthStatistics = z.infer<typeof XpackUsageHealthStatistics>

export const XpackUsagePhase = z.object({
  actions: z.array(z.string()),
  min_age: DurationValue
}).meta({ id: 'XpackUsagePhase' })
export type XpackUsagePhase = z.infer<typeof XpackUsagePhase>

export const XpackUsagePhases = z.object({
  cold: XpackUsagePhase.optional(),
  delete: XpackUsagePhase.optional(),
  frozen: XpackUsagePhase.optional(),
  hot: XpackUsagePhase.optional(),
  warm: XpackUsagePhase.optional()
}).meta({ id: 'XpackUsagePhases' })
export type XpackUsagePhases = z.infer<typeof XpackUsagePhases>

export const XpackUsageIlmPolicyStatistics = z.object({
  indices_managed: integer,
  phases: XpackUsagePhases
}).meta({ id: 'XpackUsageIlmPolicyStatistics' })
export type XpackUsageIlmPolicyStatistics = z.infer<typeof XpackUsageIlmPolicyStatistics>

export const XpackUsageIlm = z.object({
  policy_count: integer,
  policy_stats: z.array(XpackUsageIlmPolicyStatistics)
}).meta({ id: 'XpackUsageIlm' })
export type XpackUsageIlm = z.infer<typeof XpackUsageIlm>

export const XpackUsageIpFilter = z.object({
  http: z.boolean(),
  transport: z.boolean()
}).meta({ id: 'XpackUsageIpFilter' })
export type XpackUsageIpFilter = z.infer<typeof XpackUsageIpFilter>

export const XpackUsageMlJobForecasts = z.object({
  total: long,
  forecasted_jobs: long
}).meta({ id: 'XpackUsageMlJobForecasts' })
export type XpackUsageMlJobForecasts = z.infer<typeof XpackUsageMlJobForecasts>

export const XpackUsageJobUsage = z.object({
  count: integer,
  created_by: z.record(z.string(), long),
  detectors: MlJobStatistics,
  forecasts: XpackUsageMlJobForecasts,
  model_size: MlJobStatistics
}).meta({ id: 'XpackUsageJobUsage' })
export type XpackUsageJobUsage = z.infer<typeof XpackUsageJobUsage>

export const XpackUsageMlDataFrameAnalyticsJobsMemory = z.object({
  peak_usage_bytes: MlJobStatistics
}).meta({ id: 'XpackUsageMlDataFrameAnalyticsJobsMemory' })
export type XpackUsageMlDataFrameAnalyticsJobsMemory = z.infer<typeof XpackUsageMlDataFrameAnalyticsJobsMemory>

export const XpackUsageMlDataFrameAnalyticsJobsCount = z.object({
  count: long
}).meta({ id: 'XpackUsageMlDataFrameAnalyticsJobsCount' })
export type XpackUsageMlDataFrameAnalyticsJobsCount = z.infer<typeof XpackUsageMlDataFrameAnalyticsJobsCount>

export const XpackUsageMlDataFrameAnalyticsJobsAnalysis = z.object({
  classification: integer.optional(),
  outlier_detection: integer.optional(),
  regression: integer.optional()
}).meta({ id: 'XpackUsageMlDataFrameAnalyticsJobsAnalysis' })
export type XpackUsageMlDataFrameAnalyticsJobsAnalysis = z.infer<typeof XpackUsageMlDataFrameAnalyticsJobsAnalysis>

export const XpackUsageMlDataFrameAnalyticsJobs = z.object({
  memory_usage: XpackUsageMlDataFrameAnalyticsJobsMemory.optional(),
  _all: XpackUsageMlDataFrameAnalyticsJobsCount,
  analysis_counts: XpackUsageMlDataFrameAnalyticsJobsAnalysis.optional(),
  stopped: XpackUsageMlDataFrameAnalyticsJobsCount.optional()
}).meta({ id: 'XpackUsageMlDataFrameAnalyticsJobs' })
export type XpackUsageMlDataFrameAnalyticsJobs = z.infer<typeof XpackUsageMlDataFrameAnalyticsJobs>

export const XpackUsageMlInferenceIngestProcessorCount = z.object({
  max: long,
  sum: long,
  min: long
}).meta({ id: 'XpackUsageMlInferenceIngestProcessorCount' })
export type XpackUsageMlInferenceIngestProcessorCount = z.infer<typeof XpackUsageMlInferenceIngestProcessorCount>

export const XpackUsageMlCounter = z.object({
  count: long
}).meta({ id: 'XpackUsageMlCounter' })
export type XpackUsageMlCounter = z.infer<typeof XpackUsageMlCounter>

export const XpackUsageMlInferenceIngestProcessor = z.object({
  num_docs_processed: XpackUsageMlInferenceIngestProcessorCount,
  pipelines: XpackUsageMlCounter,
  num_failures: XpackUsageMlInferenceIngestProcessorCount,
  time_ms: XpackUsageMlInferenceIngestProcessorCount
}).meta({ id: 'XpackUsageMlInferenceIngestProcessor' })
export type XpackUsageMlInferenceIngestProcessor = z.infer<typeof XpackUsageMlInferenceIngestProcessor>

export const XpackUsageMlInferenceTrainedModelsCount = z.object({
  total: long,
  prepackaged: long,
  other: long,
  pass_through: long.optional(),
  regression: long.optional(),
  classification: long.optional(),
  ner: long.optional(),
  text_embedding: long.optional()
}).meta({ id: 'XpackUsageMlInferenceTrainedModelsCount' })
export type XpackUsageMlInferenceTrainedModelsCount = z.infer<typeof XpackUsageMlInferenceTrainedModelsCount>

export const XpackUsageMlInferenceTrainedModels = z.object({
  estimated_operations: MlJobStatistics.optional(),
  estimated_heap_memory_usage_bytes: MlJobStatistics.optional(),
  count: XpackUsageMlInferenceTrainedModelsCount.optional(),
  _all: XpackUsageMlCounter,
  model_size_bytes: MlJobStatistics.optional()
}).meta({ id: 'XpackUsageMlInferenceTrainedModels' })
export type XpackUsageMlInferenceTrainedModels = z.infer<typeof XpackUsageMlInferenceTrainedModels>

export const XpackUsageMlInferenceDeploymentsTimeMs = z.object({
  avg: double
}).meta({ id: 'XpackUsageMlInferenceDeploymentsTimeMs' })
export type XpackUsageMlInferenceDeploymentsTimeMs = z.infer<typeof XpackUsageMlInferenceDeploymentsTimeMs>

export const XpackUsageMlInferenceDeployments = z.object({
  count: integer,
  inference_counts: MlJobStatistics,
  model_sizes_bytes: MlJobStatistics,
  time_ms: XpackUsageMlInferenceDeploymentsTimeMs
}).meta({ id: 'XpackUsageMlInferenceDeployments' })
export type XpackUsageMlInferenceDeployments = z.infer<typeof XpackUsageMlInferenceDeployments>

export const XpackUsageMlInference = z.object({
  ingest_processors: z.record(z.string(), XpackUsageMlInferenceIngestProcessor),
  trained_models: XpackUsageMlInferenceTrainedModels,
  deployments: XpackUsageMlInferenceDeployments.optional()
}).meta({ id: 'XpackUsageMlInference' })
export type XpackUsageMlInference = z.infer<typeof XpackUsageMlInference>

export const XpackUsageMachineLearning = z.object({
  ...XpackUsageBase.shape,
  datafeeds: z.record(z.string(), XpackUsageDatafeed),
  jobs: z.record(z.string(), XpackUsageJobUsage).describe('Job usage statistics. The `_all` entry is always present and gathers statistics for all jobs.'),
  node_count: integer,
  data_frame_analytics_jobs: XpackUsageMlDataFrameAnalyticsJobs,
  inference: XpackUsageMlInference
}).meta({ id: 'XpackUsageMachineLearning' })
export type XpackUsageMachineLearning = z.infer<typeof XpackUsageMachineLearning>

export const XpackUsageMonitoring = z.object({
  ...XpackUsageBase.shape,
  collection_enabled: z.boolean(),
  enabled_exporters: z.record(z.string(), long)
}).meta({ id: 'XpackUsageMonitoring' })
export type XpackUsageMonitoring = z.infer<typeof XpackUsageMonitoring>

export const XpackUsageRealmCache = z.object({
  size: long
}).meta({ id: 'XpackUsageRealmCache' })
export type XpackUsageRealmCache = z.infer<typeof XpackUsageRealmCache>

export const XpackUsageRealm = z.object({
  ...XpackUsageBase.shape,
  name: z.array(z.string()).optional(),
  order: z.array(long).optional(),
  size: z.array(long).optional(),
  cache: z.array(XpackUsageRealmCache).optional(),
  has_authorization_realms: z.array(z.boolean()).optional(),
  has_default_username_pattern: z.array(z.boolean()).optional(),
  has_truststore: z.array(z.boolean()).optional(),
  is_authentication_delegated: z.array(z.boolean()).optional()
}).meta({ id: 'XpackUsageRealm' })
export type XpackUsageRealm = z.infer<typeof XpackUsageRealm>

/**
 * Get usage information.
 *
 * Get information about the features that are currently enabled and available under the current license.
 * The API also provides some usage statistics.
 */
export const XpackUsageRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'XpackUsageRequest' })
export type XpackUsageRequest = z.infer<typeof XpackUsageRequest>

export const XpackUsageWatcherActionTotals = z.object({
  total: Duration,
  total_time_in_ms: DurationValue
}).meta({ id: 'XpackUsageWatcherActionTotals' })
export type XpackUsageWatcherActionTotals = z.infer<typeof XpackUsageWatcherActionTotals>

export const XpackUsageWatcherActions = z.object({
  actions: z.record(Name, XpackUsageWatcherActionTotals)
}).meta({ id: 'XpackUsageWatcherActions' })
export type XpackUsageWatcherActions = z.infer<typeof XpackUsageWatcherActions>

export const XpackUsageWatcherWatchTriggerSchedule = z.object({
  ...XpackUsageCounter.shape,
  cron: XpackUsageCounter,
  _all: XpackUsageCounter
}).meta({ id: 'XpackUsageWatcherWatchTriggerSchedule' })
export type XpackUsageWatcherWatchTriggerSchedule = z.infer<typeof XpackUsageWatcherWatchTriggerSchedule>

export const XpackUsageWatcherWatchTrigger = z.object({
  schedule: XpackUsageWatcherWatchTriggerSchedule.optional(),
  _all: XpackUsageCounter
}).meta({ id: 'XpackUsageWatcherWatchTrigger' })
export type XpackUsageWatcherWatchTrigger = z.infer<typeof XpackUsageWatcherWatchTrigger>

export const XpackUsageWatcherWatch = z.object({
  input: z.record(Name, XpackUsageCounter),
  condition: z.record(Name, XpackUsageCounter).optional(),
  action: z.record(Name, XpackUsageCounter).optional(),
  trigger: XpackUsageWatcherWatchTrigger
}).meta({ id: 'XpackUsageWatcherWatch' })
export type XpackUsageWatcherWatch = z.infer<typeof XpackUsageWatcherWatch>

export const XpackUsageWatcher = z.object({
  ...XpackUsageBase.shape,
  execution: XpackUsageWatcherActions,
  watch: XpackUsageWatcherWatch,
  count: XpackUsageCounter
}).meta({ id: 'XpackUsageWatcher' })
export type XpackUsageWatcher = z.infer<typeof XpackUsageWatcher>

export const XpackUsageRuntimeFieldsType = z.object({
  chars_max: long,
  chars_total: long,
  count: long,
  doc_max: long,
  doc_total: long,
  index_count: long,
  lang: z.array(z.string()),
  lines_max: long,
  lines_total: long,
  name: Field,
  scriptless_count: long,
  shadowed_count: long,
  source_max: long,
  source_total: long
}).meta({ id: 'XpackUsageRuntimeFieldsType' })
export type XpackUsageRuntimeFieldsType = z.infer<typeof XpackUsageRuntimeFieldsType>

export const XpackUsageRuntimeFieldTypes = z.object({
  ...XpackUsageBase.shape,
  field_types: z.array(XpackUsageRuntimeFieldsType)
}).meta({ id: 'XpackUsageRuntimeFieldTypes' })
export type XpackUsageRuntimeFieldTypes = z.infer<typeof XpackUsageRuntimeFieldTypes>

export const XpackUsageSearchableSnapshots = z.object({
  ...XpackUsageBase.shape,
  indices_count: integer,
  full_copy_indices_count: integer.optional(),
  shared_cache_indices_count: integer.optional()
}).meta({ id: 'XpackUsageSearchableSnapshots' })
export type XpackUsageSearchableSnapshots = z.infer<typeof XpackUsageSearchableSnapshots>

export const XpackUsageRoleMapping = z.object({
  enabled: integer,
  size: integer
}).meta({ id: 'XpackUsageRoleMapping' })
export type XpackUsageRoleMapping = z.infer<typeof XpackUsageRoleMapping>

export const XpackUsageSecurityRolesNative = z.object({
  dls: z.boolean(),
  fls: z.boolean(),
  size: long
}).meta({ id: 'XpackUsageSecurityRolesNative' })
export type XpackUsageSecurityRolesNative = z.infer<typeof XpackUsageSecurityRolesNative>

export const XpackUsageSecurityRolesDlsBitSetCache = z.object({
  count: integer.describe('Number of entries in the cache.'),
  memory: ByteSize.describe('Human-readable amount of memory taken up by the cache.').optional(),
  memory_in_bytes: ulong.describe('Memory taken up by the cache in bytes.'),
  hits: long.describe('Total number of cache hits.'),
  misses: long.describe('Total number of cache misses.'),
  evictions: long.describe('Total number of cache evictions.'),
  hits_time_in_millis: DurationValue.describe('Total combined time spent in cache for hits in milliseconds.'),
  misses_time_in_millis: DurationValue.describe('Total combined time spent in cache for misses in milliseconds.')
}).meta({ id: 'XpackUsageSecurityRolesDlsBitSetCache' })
export type XpackUsageSecurityRolesDlsBitSetCache = z.infer<typeof XpackUsageSecurityRolesDlsBitSetCache>

export const XpackUsageSecurityRolesDls = z.object({
  bit_set_cache: XpackUsageSecurityRolesDlsBitSetCache
}).meta({ id: 'XpackUsageSecurityRolesDls' })
export type XpackUsageSecurityRolesDls = z.infer<typeof XpackUsageSecurityRolesDls>

export const XpackUsageSecurityRolesFile = z.object({
  dls: z.boolean(),
  fls: z.boolean(),
  size: long
}).meta({ id: 'XpackUsageSecurityRolesFile' })
export type XpackUsageSecurityRolesFile = z.infer<typeof XpackUsageSecurityRolesFile>

export const XpackUsageSecurityRoles = z.object({
  native: XpackUsageSecurityRolesNative,
  dls: XpackUsageSecurityRolesDls,
  file: XpackUsageSecurityRolesFile
}).meta({ id: 'XpackUsageSecurityRoles' })
export type XpackUsageSecurityRoles = z.infer<typeof XpackUsageSecurityRoles>

export const XpackUsageSsl = z.object({
  http: XpackUsageFeatureToggle,
  transport: XpackUsageFeatureToggle
}).meta({ id: 'XpackUsageSsl' })
export type XpackUsageSsl = z.infer<typeof XpackUsageSsl>

export const XpackUsageSecurity = z.object({
  ...XpackUsageBase.shape,
  api_key_service: XpackUsageFeatureToggle,
  anonymous: XpackUsageFeatureToggle,
  audit: XpackUsageAudit,
  fips_140: XpackUsageFeatureToggle,
  ipfilter: XpackUsageIpFilter,
  realms: z.record(z.string(), XpackUsageRealm),
  role_mapping: z.record(z.string(), XpackUsageRoleMapping),
  roles: XpackUsageSecurityRoles,
  ssl: XpackUsageSsl,
  system_key: XpackUsageFeatureToggle.optional(),
  token_service: XpackUsageFeatureToggle,
  operator_privileges: XpackUsageBase
}).meta({ id: 'XpackUsageSecurity' })
export type XpackUsageSecurity = z.infer<typeof XpackUsageSecurity>

export const XpackUsageSlm = z.object({
  ...XpackUsageBase.shape,
  policy_count: integer.optional(),
  policy_stats: SlmStatistics.optional()
}).meta({ id: 'XpackUsageSlm' })
export type XpackUsageSlm = z.infer<typeof XpackUsageSlm>

export const XpackUsageSql = z.object({
  ...XpackUsageBase.shape,
  features: z.record(z.string(), integer),
  queries: z.record(z.string(), XpackUsageQuery)
}).meta({ id: 'XpackUsageSql' })
export type XpackUsageSql = z.infer<typeof XpackUsageSql>

export const XpackUsageVector = z.object({
  ...XpackUsageBase.shape,
  dense_vector_dims_avg_count: integer,
  dense_vector_fields_count: integer,
  sparse_vector_fields_count: integer.optional()
}).meta({ id: 'XpackUsageVector' })
export type XpackUsageVector = z.infer<typeof XpackUsageVector>

export const XpackUsageResponse = z.object({
  aggregate_metric: XpackUsageBase,
  analytics: XpackUsageAnalytics,
  archive: XpackUsageArchive,
  watcher: XpackUsageWatcher,
  ccr: XpackUsageCcr,
  data_frame: XpackUsageBase.optional(),
  data_science: XpackUsageBase.optional(),
  data_streams: XpackUsageDataStreams.optional(),
  data_tiers: XpackUsageDataTiers,
  enrich: XpackUsageBase.optional(),
  eql: XpackUsageEql,
  flattened: XpackUsageFlattened.optional(),
  graph: XpackUsageBase,
  health_api: XpackUsageHealthStatistics.optional(),
  ilm: XpackUsageIlm,
  logstash: XpackUsageBase,
  ml: XpackUsageMachineLearning,
  monitoring: XpackUsageMonitoring,
  rollup: XpackUsageBase,
  runtime_fields: XpackUsageRuntimeFieldTypes.optional(),
  spatial: XpackUsageBase,
  searchable_snapshots: XpackUsageSearchableSnapshots,
  security: XpackUsageSecurity,
  slm: XpackUsageSlm,
  sql: XpackUsageSql,
  transform: XpackUsageBase,
  vectors: XpackUsageVector.optional(),
  voting_only: XpackUsageBase
}).meta({ id: 'XpackUsageResponse' })
export type XpackUsageResponse = z.infer<typeof XpackUsageResponse>
