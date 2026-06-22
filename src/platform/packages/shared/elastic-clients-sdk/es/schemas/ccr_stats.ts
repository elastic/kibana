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

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const SequenceNumber = long.meta({ id: 'SequenceNumber' })
export type SequenceNumber = z.infer<typeof SequenceNumber>

export const VersionNumber = long.meta({ id: 'VersionNumber' })
export type VersionNumber = z.infer<typeof VersionNumber>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const CcrReadException = z.object({
  exception: z.lazy(() => ErrorCause).describe('The exception that caused the read to fail.'),
  from_seq_no: SequenceNumber.describe('The starting sequence number of the batch requested from the leader.'),
  retries: integer.describe('The number of times the batch has been retried.')
}).meta({ id: 'CcrReadException' })
export type CcrReadException = z.infer<typeof CcrReadException>

export const CcrShardStats = z.object({
  bytes_read: long.describe('The total of transferred bytes read from the leader. This is only an estimate and does not account for compression if enabled.'),
  failed_read_requests: long.describe('The number of failed reads.'),
  failed_write_requests: long.describe('The number of failed bulk write requests on the follower.'),
  fatal_exception: z.lazy(() => ErrorCause).optional(),
  follower_aliases_version: VersionNumber.describe('The index aliases version the follower is synced up to.'),
  follower_global_checkpoint: long.describe('The current global checkpoint on the follower. The difference between the `leader_global_checkpoint` and the `follower_global_checkpoint` is an indication of how much the follower is lagging the leader.'),
  follower_index: z.string().describe('The name of the follower index.'),
  follower_mapping_version: VersionNumber.describe('The mapping version the follower is synced up to.'),
  follower_max_seq_no: SequenceNumber.describe('The current maximum sequence number on the follower.'),
  follower_settings_version: VersionNumber.describe('The index settings version the follower is synced up to.'),
  last_requested_seq_no: SequenceNumber.describe('The starting sequence number of the last batch of operations requested from the leader.'),
  leader_global_checkpoint: long.describe('The current global checkpoint on the leader known to the follower task.'),
  leader_index: z.string().describe('The name of the index in the leader cluster being followed.'),
  leader_max_seq_no: SequenceNumber.describe('The current maximum sequence number on the leader known to the follower task.'),
  operations_read: long.describe('The total number of operations read from the leader.'),
  operations_written: long.describe('The number of operations written on the follower.'),
  outstanding_read_requests: integer.describe('The number of active read requests from the follower.'),
  outstanding_write_requests: integer.describe('The number of active bulk write requests on the follower.'),
  read_exceptions: z.array(CcrReadException).describe('An array of objects representing failed reads.'),
  remote_cluster: z.string().describe('The remote cluster containing the leader index.'),
  shard_id: integer.describe('The numerical shard ID, with values from 0 to one less than the number of replicas.'),
  successful_read_requests: long.describe('The number of successful fetches.'),
  successful_write_requests: long.describe('The number of bulk write requests run on the follower.'),
  time_since_last_read: Duration.optional(),
  time_since_last_read_millis: DurationValue.describe('The number of milliseconds since a read request was sent to the leader. When the follower is caught up to the leader, this number will increase up to the configured `read_poll_timeout` at which point another read request will be sent to the leader.'),
  total_read_remote_exec_time: Duration.optional(),
  total_read_remote_exec_time_millis: DurationValue.describe('The total time reads spent running on the remote cluster.'),
  total_read_time: Duration.optional(),
  total_read_time_millis: DurationValue.describe('The total time reads were outstanding, measured from the time a read was sent to the leader to the time a reply was returned to the follower.'),
  total_write_time: Duration.optional(),
  total_write_time_millis: DurationValue.describe('The total time spent writing on the follower.'),
  write_buffer_operation_count: long.describe('The number of write operations queued on the follower.'),
  write_buffer_size_in_bytes: ByteSize.describe('The total number of bytes of operations currently queued for writing.')
}).meta({ id: 'CcrShardStats' })
export type CcrShardStats = z.infer<typeof CcrShardStats>

export const CcrFollowIndexStats = z.object({
  index: IndexName.describe('The name of the follower index.'),
  shards: z.array(CcrShardStats).describe('An array of shard-level following task statistics.')
}).meta({ id: 'CcrFollowIndexStats' })
export type CcrFollowIndexStats = z.infer<typeof CcrFollowIndexStats>

export const CcrStatsAutoFollowedCluster = z.object({
  cluster_name: Name,
  last_seen_metadata_version: VersionNumber,
  time_since_last_check_millis: DurationValue
}).meta({ id: 'CcrStatsAutoFollowedCluster' })
export type CcrStatsAutoFollowedCluster = z.infer<typeof CcrStatsAutoFollowedCluster>

export const CcrStatsAutoFollowStats = z.object({
  auto_followed_clusters: z.array(CcrStatsAutoFollowedCluster),
  number_of_failed_follow_indices: long.describe('The number of indices that the auto-follow coordinator failed to automatically follow. The causes of recent failures are captured in the logs of the elected master node and in the `auto_follow_stats.recent_auto_follow_errors` field.'),
  number_of_failed_remote_cluster_state_requests: long.describe('The number of times that the auto-follow coordinator failed to retrieve the cluster state from a remote cluster registered in a collection of auto-follow patterns.'),
  number_of_successful_follow_indices: long.describe('The number of indices that the auto-follow coordinator successfully followed.'),
  recent_auto_follow_errors: z.array(z.lazy(() => ErrorCause)).describe('An array of objects representing failures by the auto-follow coordinator.')
}).meta({ id: 'CcrStatsAutoFollowStats' })
export type CcrStatsAutoFollowStats = z.infer<typeof CcrStatsAutoFollowStats>

export const CcrStatsFollowStats = z.object({
  indices: z.array(CcrFollowIndexStats)
}).meta({ id: 'CcrStatsFollowStats' })
export type CcrStatsFollowStats = z.infer<typeof CcrStatsFollowStats>

/**
 * Get cross-cluster replication stats.
 *
 * This API returns stats about auto-following and the same shard-level stats as the get follower stats API.
 */
export const CcrStatsRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If the master node is not available before the timeout expires, the request fails and returns an error. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CcrStatsRequest' })
export type CcrStatsRequest = z.infer<typeof CcrStatsRequest>

export const CcrStatsResponse = z.object({
  auto_follow_stats: CcrStatsAutoFollowStats.describe('Statistics for the auto-follow coordinator.'),
  follow_stats: CcrStatsFollowStats.describe('Shard-level statistics for follower indices.')
}).meta({ id: 'CcrStatsResponse' })
export type CcrStatsResponse = z.infer<typeof CcrStatsResponse>
