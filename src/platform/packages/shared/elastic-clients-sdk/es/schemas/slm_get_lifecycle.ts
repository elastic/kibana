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

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Uuid = z.string().meta({ id: 'Uuid' })
export type Uuid = z.infer<typeof Uuid>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const VersionNumber = long.meta({ id: 'VersionNumber' })
export type VersionNumber = z.infer<typeof VersionNumber>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const SlmConfiguration = z.object({
  ignore_unavailable: z.boolean().describe('If false, the snapshot fails if any data stream or index in indices is missing or closed. If true, the snapshot ignores missing or closed data streams and indices.').optional(),
  indices: Indices.describe('A comma-separated list of data streams and indices to include in the snapshot. Multi-index syntax is supported. By default, a snapshot includes all data streams and indices in the cluster. If this argument is provided, the snapshot only includes the specified data streams and clusters.').optional(),
  include_global_state: z.boolean().describe('If true, the current global state is included in the snapshot.').optional(),
  feature_states: z.array(z.string()).describe('A list of feature states to be included in this snapshot. A list of features available for inclusion in the snapshot and their descriptions be can be retrieved using the get features API. Each feature state includes one or more system indices containing data necessary for the function of that feature. Providing an empty array will include no feature states in the snapshot, regardless of the value of include_global_state. By default, all available feature states will be included in the snapshot if include_global_state is true, or no feature states if include_global_state is false.').optional(),
  metadata: Metadata.describe('Attaches arbitrary metadata to the snapshot, such as a record of who took the snapshot, why it was taken, or any other useful data. Metadata must be less than 1024 bytes.').optional(),
  partial: z.boolean().describe('If false, the entire snapshot will fail if one or more indices included in the snapshot do not have all primary shards available.').optional()
}).meta({ id: 'SlmConfiguration' })
export type SlmConfiguration = z.infer<typeof SlmConfiguration>

export const SlmInProgress = z.object({
  name: Name,
  start_time_millis: EpochTime,
  state: z.string(),
  uuid: Uuid
}).meta({ id: 'SlmInProgress' })
export type SlmInProgress = z.infer<typeof SlmInProgress>

export const SlmInvocation = z.object({
  snapshot_name: Name,
  time: DateTime
}).meta({ id: 'SlmInvocation' })
export type SlmInvocation = z.infer<typeof SlmInvocation>

export const SlmRetention = z.object({
  expire_after: Duration.describe('Time period after which a snapshot is considered expired and eligible for deletion. SLM deletes expired snapshots based on the slm.retention_schedule.'),
  max_count: integer.describe('Maximum number of snapshots to retain, even if the snapshots have not yet expired. If the number of snapshots in the repository exceeds this limit, the policy retains the most recent snapshots and deletes older snapshots.'),
  min_count: integer.describe('Minimum number of snapshots to retain, even if the snapshots have expired.')
}).meta({ id: 'SlmRetention' })
export type SlmRetention = z.infer<typeof SlmRetention>

export const WatcherCronExpression = z.string().meta({ id: 'WatcherCronExpression' })
export type WatcherCronExpression = z.infer<typeof WatcherCronExpression>

export const SlmPolicy = z.object({
  config: SlmConfiguration.optional(),
  name: Name,
  repository: z.string(),
  retention: SlmRetention.optional(),
  schedule: WatcherCronExpression
}).meta({ id: 'SlmPolicy' })
export type SlmPolicy = z.infer<typeof SlmPolicy>

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

export const SlmSnapshotLifecycle = z.object({
  in_progress: SlmInProgress.optional(),
  last_failure: SlmInvocation.optional(),
  last_success: SlmInvocation.optional(),
  modified_date: DateTime.describe('The last time the policy was modified.').optional(),
  modified_date_millis: EpochTime,
  next_execution: DateTime.describe('The next time the policy will run.').optional(),
  next_execution_millis: EpochTime,
  policy: SlmPolicy,
  version: VersionNumber.describe('The version of the snapshot policy. Only the latest version is stored and incremented when the policy is updated.'),
  stats: SlmStatistics
}).meta({ id: 'SlmSnapshotLifecycle' })
export type SlmSnapshotLifecycle = z.infer<typeof SlmSnapshotLifecycle>

/**
 * Get policy information.
 *
 * Get snapshot lifecycle policy definitions and information about the latest snapshot attempts.
 */
export const SlmGetLifecycleRequest = z.object({
  ...RequestBase.shape,
  policy_id: Names.describe('A comma-separated list of snapshot lifecycle policy identifiers.').optional().meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SlmGetLifecycleRequest' })
export type SlmGetLifecycleRequest = z.infer<typeof SlmGetLifecycleRequest>

export const SlmGetLifecycleResponse = z.record(Id, SlmSnapshotLifecycle).meta({ id: 'SlmGetLifecycleResponse' })
export type SlmGetLifecycleResponse = z.infer<typeof SlmGetLifecycleResponse>
