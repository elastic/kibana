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

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

/**
 * A date and time, either as a string whose format can depend on the context (defaulting to ISO 8601), or a
 * number of milliseconds since the Epoch. Elasticsearch accepts both as input, but will generally output a string
 * representation.
 */
export const DateTime = z.union([z.string(), EpochTime]).meta({ id: 'DateTime' })
export type DateTime = z.infer<typeof DateTime>

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

export const Metadata = z.record(z.string(), z.any()).meta({ id: 'Metadata' })
export type Metadata = z.infer<typeof Metadata>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

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

export const Uuid = z.string().meta({ id: 'Uuid' })
export type Uuid = z.infer<typeof Uuid>

export const VersionNumber = long.meta({ id: 'VersionNumber' })
export type VersionNumber = z.infer<typeof VersionNumber>

export const VersionString = z.string().meta({ id: 'VersionString' })
export type VersionString = z.infer<typeof VersionString>

export const SnapshotIndexDetails = z.object({
  shard_count: integer,
  size: ByteSize.optional(),
  size_in_bytes: long,
  max_segments_per_shard: long
}).meta({ id: 'SnapshotIndexDetails' })
export type SnapshotIndexDetails = z.infer<typeof SnapshotIndexDetails>

export const SnapshotInfoFeatureState = z.object({
  feature_name: z.string(),
  indices: Indices
}).meta({ id: 'SnapshotInfoFeatureState' })
export type SnapshotInfoFeatureState = z.infer<typeof SnapshotInfoFeatureState>

export const SnapshotSnapshotShardFailure = z.object({
  index: IndexName,
  node_id: Id.optional(),
  reason: z.string(),
  shard_id: integer,
  index_uuid: Id,
  status: z.string()
}).meta({ id: 'SnapshotSnapshotShardFailure' })
export type SnapshotSnapshotShardFailure = z.infer<typeof SnapshotSnapshotShardFailure>

export const SnapshotSnapshotInfo = z.object({
  data_streams: z.array(z.string()),
  duration: Duration.optional(),
  duration_in_millis: DurationValue.optional(),
  end_time: DateTime.optional(),
  end_time_in_millis: EpochTime.optional(),
  failures: z.array(SnapshotSnapshotShardFailure).optional(),
  include_global_state: z.boolean().optional(),
  indices: z.array(IndexName).optional(),
  index_details: z.record(IndexName, SnapshotIndexDetails).optional(),
  metadata: Metadata.optional(),
  reason: z.string().optional(),
  repository: Name.optional(),
  snapshot: Name,
  shards: ShardStatistics.optional(),
  start_time: DateTime.optional(),
  start_time_in_millis: EpochTime.optional(),
  state: z.string().optional(),
  uuid: Uuid,
  version: VersionString.optional(),
  version_id: VersionNumber.optional(),
  feature_states: z.array(SnapshotInfoFeatureState).optional()
}).meta({ id: 'SnapshotSnapshotInfo' })
export type SnapshotSnapshotInfo = z.infer<typeof SnapshotSnapshotInfo>

/**
 * Create a snapshot.
 *
 * Take a snapshot of a cluster or of data streams and indices.
 */
export const SnapshotCreateRequest = z.object({
  ...RequestBase.shape,
  repository: Name.describe('The name of the repository for the snapshot.').meta({ found_in: 'path' }),
  snapshot: Name.describe('The name of the snapshot. It supportes date math. It must be unique in the repository.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  wait_for_completion: z.boolean().describe('If `true`, the request returns a response when the snapshot is complete. If `false`, the request returns a response when the snapshot initializes.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Determines how wildcard patterns in the `indices` parameter match data streams and indices. It supports comma-separated values such as `open,hidden`.').optional().meta({ found_in: 'body' }),
  feature_states: z.array(z.string()).describe('The feature states to include in the snapshot. Each feature state includes one or more system indices containing related data. You can view a list of eligible features using the get features API. If `include_global_state` is `true`, all current feature states are included by default. If `include_global_state` is `false`, no feature states are included by default. Note that specifying an empty array will result in the default behavior. To exclude all feature states, regardless of the `include_global_state` value, specify an array with only the value `none` (`["none"]`).').optional().meta({ found_in: 'body' }),
  ignore_unavailable: z.boolean().describe('If `true`, the request ignores data streams and indices in `indices` that are missing or closed. If `false`, the request returns an error for any data stream or index that is missing or closed.').optional().meta({ found_in: 'body' }),
  include_global_state: z.boolean().describe('If `true`, the current cluster state is included in the snapshot. The cluster state includes persistent cluster settings, composable index templates, legacy index templates, ingest pipelines, and ILM policies. It also includes data stored in system indices, such as Watches and task records (configurable via `feature_states`).').optional().meta({ found_in: 'body' }),
  indices: Indices.describe('A comma-separated list of data streams and indices to include in the snapshot. It supports a multi-target syntax. The default is an empty array (`[]`), which includes all regular data streams and regular indices. To exclude all data streams and indices, use `-*`. You can\'t use this parameter to include or exclude system indices or system data streams from a snapshot. Use `feature_states` instead.').optional().meta({ found_in: 'body' }),
  metadata: Metadata.describe('Arbitrary metadata to the snapshot, such as a record of who took the snapshot, why it was taken, or any other useful data. It can have any contents but it must be less than 1024 bytes. This information is not automatically generated by Elasticsearch.').optional().meta({ found_in: 'body' }),
  partial: z.boolean().describe('If `true`, it enables you to restore a partial snapshot of indices with unavailable shards. Only shards that were successfully included in the snapshot will be restored. All missing shards will be recreated as empty. If `false`, the entire restore operation will fail if one or more indices included in the snapshot do not have all primary shards available.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SnapshotCreateRequest' })
export type SnapshotCreateRequest = z.infer<typeof SnapshotCreateRequest>

export const SnapshotCreateResponse = z.object({
  accepted: z.boolean().describe('Equals `true` if the snapshot was accepted. Present when the request had `wait_for_completion` set to `false`').optional(),
  snapshot: SnapshotSnapshotInfo.describe('Snapshot information. Present when the request had `wait_for_completion` set to `true`').optional()
}).meta({ id: 'SnapshotCreateResponse' })
export type SnapshotCreateResponse = z.infer<typeof SnapshotCreateResponse>
