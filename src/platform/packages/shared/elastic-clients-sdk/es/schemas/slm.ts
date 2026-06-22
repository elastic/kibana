/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { AcknowledgedResponseBase, DateTime, Duration, DurationValue, EpochTime, Id, Indices, LifecycleOperationMode, Metadata, Name, Names, RequestBase, Uuid, VersionNumber, integer, long } from './_types'
import { WatcherCronExpression } from './watcher'

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

export const SlmSnapshotPolicyStats = z.object({
  policy: z.string(),
  snapshots_taken: long,
  snapshots_failed: long,
  snapshots_deleted: long,
  snapshot_deletion_failures: long
}).meta({ id: 'SlmSnapshotPolicyStats' })
export type SlmSnapshotPolicyStats = z.infer<typeof SlmSnapshotPolicyStats>

/**
 * Delete a policy.
 *
 * Delete a snapshot lifecycle policy definition.
 * This operation prevents any future snapshots from being taken but does not cancel in-progress snapshots or remove previously-taken snapshots.
 */
export const SlmDeleteLifecycleRequest = z.object({
  ...RequestBase.shape,
  policy_id: Name.describe('The id of the snapshot lifecycle policy to remove').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SlmDeleteLifecycleRequest' })
export type SlmDeleteLifecycleRequest = z.infer<typeof SlmDeleteLifecycleRequest>

export const SlmDeleteLifecycleResponse = AcknowledgedResponseBase.meta({ id: 'SlmDeleteLifecycleResponse' })
export type SlmDeleteLifecycleResponse = z.infer<typeof SlmDeleteLifecycleResponse>

/**
 * Run a policy.
 *
 * Immediately create a snapshot according to the snapshot lifecycle policy without waiting for the scheduled time.
 * The snapshot policy is normally applied according to its schedule, but you might want to manually run a policy before performing an upgrade or other maintenance.
 */
export const SlmExecuteLifecycleRequest = z.object({
  ...RequestBase.shape,
  policy_id: Name.describe('The id of the snapshot lifecycle policy to be executed').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SlmExecuteLifecycleRequest' })
export type SlmExecuteLifecycleRequest = z.infer<typeof SlmExecuteLifecycleRequest>

export const SlmExecuteLifecycleResponse = z.object({
  snapshot_name: Name
}).meta({ id: 'SlmExecuteLifecycleResponse' })
export type SlmExecuteLifecycleResponse = z.infer<typeof SlmExecuteLifecycleResponse>

/**
 * Run a retention policy.
 *
 * Manually apply the retention policy to force immediate removal of snapshots that are expired according to the snapshot lifecycle policy retention rules.
 * The retention policy is normally applied according to its schedule.
 */
export const SlmExecuteRetentionRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SlmExecuteRetentionRequest' })
export type SlmExecuteRetentionRequest = z.infer<typeof SlmExecuteRetentionRequest>

export const SlmExecuteRetentionResponse = AcknowledgedResponseBase.meta({ id: 'SlmExecuteRetentionResponse' })
export type SlmExecuteRetentionResponse = z.infer<typeof SlmExecuteRetentionResponse>

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

/**
 * Get snapshot lifecycle management statistics.
 *
 * Get global and policy-level statistics about actions taken by snapshot lifecycle management.
 */
export const SlmGetStatsRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SlmGetStatsRequest' })
export type SlmGetStatsRequest = z.infer<typeof SlmGetStatsRequest>

export const SlmGetStatsResponse = z.object({
  retention_deletion_time: Duration,
  retention_deletion_time_millis: DurationValue,
  retention_failed: long,
  retention_runs: long,
  retention_timed_out: long,
  total_snapshots_deleted: long,
  total_snapshot_deletion_failures: long,
  total_snapshots_failed: long,
  total_snapshots_taken: long,
  policy_stats: z.array(SlmSnapshotPolicyStats)
}).meta({ id: 'SlmGetStatsResponse' })
export type SlmGetStatsResponse = z.infer<typeof SlmGetStatsResponse>

/** Get the snapshot lifecycle management status. */
export const SlmGetStatusRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SlmGetStatusRequest' })
export type SlmGetStatusRequest = z.infer<typeof SlmGetStatusRequest>

export const SlmGetStatusResponse = z.object({
  operation_mode: LifecycleOperationMode
}).meta({ id: 'SlmGetStatusResponse' })
export type SlmGetStatusResponse = z.infer<typeof SlmGetStatusResponse>

/**
 * Create or update a policy.
 *
 * Create or update a snapshot lifecycle policy.
 * If the policy already exists, this request increments the policy version.
 * Only the latest version of a policy is stored.
 */
export const SlmPutLifecycleRequest = z.object({
  ...RequestBase.shape,
  policy_id: Name.describe('The identifier for the snapshot lifecycle policy you want to create or update.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' }),
  config: SlmConfiguration.describe('Configuration for each snapshot created by the policy.').optional().meta({ found_in: 'body' }),
  name: Name.describe('Name automatically assigned to each snapshot created by the policy. Date math is supported. To prevent conflicting snapshot names, a UUID is automatically appended to each snapshot name.').optional().meta({ found_in: 'body' }),
  repository: z.string().describe('Repository used to store snapshots created by this policy. This repository must exist prior to the policy’s creation. You can create a repository using the snapshot repository API.').optional().meta({ found_in: 'body' }),
  retention: SlmRetention.describe('Retention rules used to retain and delete snapshots created by the policy.').optional().meta({ found_in: 'body' }),
  schedule: WatcherCronExpression.describe('Periodic or absolute schedule at which the policy creates snapshots. SLM applies schedule changes immediately.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SlmPutLifecycleRequest' })
export type SlmPutLifecycleRequest = z.infer<typeof SlmPutLifecycleRequest>

export const SlmPutLifecycleResponse = AcknowledgedResponseBase.meta({ id: 'SlmPutLifecycleResponse' })
export type SlmPutLifecycleResponse = z.infer<typeof SlmPutLifecycleResponse>

/**
 * Start snapshot lifecycle management.
 *
 * Snapshot lifecycle management (SLM) starts automatically when a cluster is formed.
 * Manually starting SLM is necessary only if it has been stopped using the stop SLM API.
 */
export const SlmStartRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SlmStartRequest' })
export type SlmStartRequest = z.infer<typeof SlmStartRequest>

export const SlmStartResponse = AcknowledgedResponseBase.meta({ id: 'SlmStartResponse' })
export type SlmStartResponse = z.infer<typeof SlmStartResponse>

/**
 * Stop snapshot lifecycle management.
 *
 * Stop all snapshot lifecycle management (SLM) operations and the SLM plugin.
 * This API is useful when you are performing maintenance on a cluster and need to prevent SLM from performing any actions on your data streams or indices.
 * Stopping SLM does not stop any snapshots that are in progress.
 * You can manually trigger snapshots with the run snapshot lifecycle policy API even if SLM is stopped.
 *
 * The API returns a response as soon as the request is acknowledged, but the plugin might continue to run until in-progress operations complete and it can be safely stopped.
 * Use the get snapshot lifecycle management status API to see if SLM is running.
 */
export const SlmStopRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SlmStopRequest' })
export type SlmStopRequest = z.infer<typeof SlmStopRequest>

export const SlmStopResponse = AcknowledgedResponseBase.meta({ id: 'SlmStopResponse' })
export type SlmStopResponse = z.infer<typeof SlmStopResponse>
