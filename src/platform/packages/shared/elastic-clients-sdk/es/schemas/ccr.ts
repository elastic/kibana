/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { AcknowledgedResponseBase, ByteSize, Duration, DurationValue, ErrorCause, IndexName, IndexPattern, IndexPatterns, Indices, Name, RequestBase, SequenceNumber, ShardStatistics, Uuid, VersionNumber, WaitForActiveShards, integer, long } from './_types'
import { IndicesIndexSettings } from './indices'

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

/**
 * Delete auto-follow patterns.
 *
 * Delete a collection of cross-cluster replication auto-follow patterns.
 */
export const CcrDeleteAutoFollowPatternRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The auto-follow pattern collection to delete.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If the master node is not available before the timeout expires, the request fails and returns an error. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CcrDeleteAutoFollowPatternRequest' })
export type CcrDeleteAutoFollowPatternRequest = z.infer<typeof CcrDeleteAutoFollowPatternRequest>

export const CcrDeleteAutoFollowPatternResponse = AcknowledgedResponseBase.meta({ id: 'CcrDeleteAutoFollowPatternResponse' })
export type CcrDeleteAutoFollowPatternResponse = z.infer<typeof CcrDeleteAutoFollowPatternResponse>

/**
 * Create a follower.
 *
 * Create a cross-cluster replication follower index that follows a specific leader index.
 * When the API returns, the follower index exists and cross-cluster replication starts replicating operations from the leader index to the follower index.
 */
export const CcrFollowRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('The name of the follower index.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  wait_for_active_shards: WaitForActiveShards.describe('Specifies the number of shards to wait on being active before responding. This defaults to waiting on none of the shards to be active. A shard must be restored from the leader index before being active. Restoring a follower shard requires transferring all the remote Lucene segment files to the follower index.').optional().meta({ found_in: 'query' }),
  data_stream_name: z.string().describe('If the leader index is part of a data stream, the name to which the local data stream for the followed index should be renamed.').optional().meta({ found_in: 'body' }),
  leader_index: IndexName.describe('The name of the index in the leader cluster to follow.').meta({ found_in: 'body' }),
  max_outstanding_read_requests: long.describe('The maximum number of outstanding reads requests from the remote cluster.').optional().meta({ found_in: 'body' }),
  max_outstanding_write_requests: integer.describe('The maximum number of outstanding write requests on the follower.').optional().meta({ found_in: 'body' }),
  max_read_request_operation_count: integer.describe('The maximum number of operations to pull per read from the remote cluster.').optional().meta({ found_in: 'body' }),
  max_read_request_size: ByteSize.describe('The maximum size in bytes of per read of a batch of operations pulled from the remote cluster.').optional().meta({ found_in: 'body' }),
  max_retry_delay: Duration.describe('The maximum time to wait before retrying an operation that failed exceptionally. An exponential backoff strategy is employed when retrying.').optional().meta({ found_in: 'body' }),
  max_write_buffer_count: integer.describe('The maximum number of operations that can be queued for writing. When this limit is reached, reads from the remote cluster will be deferred until the number of queued operations goes below the limit.').optional().meta({ found_in: 'body' }),
  max_write_buffer_size: ByteSize.describe('The maximum total bytes of operations that can be queued for writing. When this limit is reached, reads from the remote cluster will be deferred until the total bytes of queued operations goes below the limit.').optional().meta({ found_in: 'body' }),
  max_write_request_operation_count: integer.describe('The maximum number of operations per bulk write request executed on the follower.').optional().meta({ found_in: 'body' }),
  max_write_request_size: ByteSize.describe('The maximum total bytes of operations per bulk write request executed on the follower.').optional().meta({ found_in: 'body' }),
  read_poll_timeout: Duration.describe('The maximum time to wait for new operations on the remote cluster when the follower index is synchronized with the leader index. When the timeout has elapsed, the poll for operations will return to the follower so that it can update some statistics. Then the follower will immediately attempt to read from the leader again.').optional().meta({ found_in: 'body' }),
  remote_cluster: z.string().describe('The remote cluster containing the leader index.').meta({ found_in: 'body' }),
  settings: z.lazy(() => IndicesIndexSettings).describe('Settings to override from the leader index.').optional().meta({ found_in: 'body' })
}).meta({ id: 'CcrFollowRequest' })
export type CcrFollowRequest = z.infer<typeof CcrFollowRequest>

export const CcrFollowResponse = z.object({
  follow_index_created: z.boolean(),
  follow_index_shards_acked: z.boolean(),
  index_following_started: z.boolean()
}).meta({ id: 'CcrFollowResponse' })
export type CcrFollowResponse = z.infer<typeof CcrFollowResponse>

export const CcrFollowInfoFollowerIndexParameters = z.object({
  max_outstanding_read_requests: long.describe('The maximum number of outstanding reads requests from the remote cluster.').optional(),
  max_outstanding_write_requests: integer.describe('The maximum number of outstanding write requests on the follower.').optional(),
  max_read_request_operation_count: integer.describe('The maximum number of operations to pull per read from the remote cluster.').optional(),
  max_read_request_size: ByteSize.describe('The maximum size in bytes of per read of a batch of operations pulled from the remote cluster.').optional(),
  max_retry_delay: Duration.describe('The maximum time to wait before retrying an operation that failed exceptionally. An exponential backoff strategy is employed when retrying.').optional(),
  max_write_buffer_count: integer.describe('The maximum number of operations that can be queued for writing. When this limit is reached, reads from the remote cluster will be deferred until the number of queued operations goes below the limit.').optional(),
  max_write_buffer_size: ByteSize.describe('The maximum total bytes of operations that can be queued for writing. When this limit is reached, reads from the remote cluster will be deferred until the total bytes of queued operations goes below the limit.').optional(),
  max_write_request_operation_count: integer.describe('The maximum number of operations per bulk write request executed on the follower.').optional(),
  max_write_request_size: ByteSize.describe('The maximum total bytes of operations per bulk write request executed on the follower.').optional(),
  read_poll_timeout: Duration.describe('The maximum time to wait for new operations on the remote cluster when the follower index is synchronized with the leader index. When the timeout has elapsed, the poll for operations will return to the follower so that it can update some statistics. Then the follower will immediately attempt to read from the leader again.').optional()
}).meta({ id: 'CcrFollowInfoFollowerIndexParameters' })
export type CcrFollowInfoFollowerIndexParameters = z.infer<typeof CcrFollowInfoFollowerIndexParameters>

export const CcrFollowInfoFollowerIndexStatus = z.enum(['active', 'paused']).meta({ id: 'CcrFollowInfoFollowerIndexStatus' })
export type CcrFollowInfoFollowerIndexStatus = z.infer<typeof CcrFollowInfoFollowerIndexStatus>

export const CcrFollowInfoFollowerIndex = z.object({
  follower_index: IndexName.describe('The name of the follower index.'),
  leader_index: IndexName.describe('The name of the index in the leader cluster that is followed.'),
  parameters: CcrFollowInfoFollowerIndexParameters.describe('An object that encapsulates cross-cluster replication parameters. If the follower index\'s status is paused, this object is omitted.').optional(),
  remote_cluster: Name.describe('The remote cluster that contains the leader index.'),
  status: CcrFollowInfoFollowerIndexStatus.describe('The status of the index following: `active` or `paused`.')
}).meta({ id: 'CcrFollowInfoFollowerIndex' })
export type CcrFollowInfoFollowerIndex = z.infer<typeof CcrFollowInfoFollowerIndex>

/**
 * Get follower information.
 *
 * Get information about all cross-cluster replication follower indices.
 * For example, the results include follower index names, leader index names, replication options, and whether the follower indices are active or paused.
 */
export const CcrFollowInfoRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-delimited list of follower index patterns.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If the master node is not available before the timeout expires, the request fails and returns an error. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CcrFollowInfoRequest' })
export type CcrFollowInfoRequest = z.infer<typeof CcrFollowInfoRequest>

export const CcrFollowInfoResponse = z.object({
  follower_indices: z.array(CcrFollowInfoFollowerIndex)
}).meta({ id: 'CcrFollowInfoResponse' })
export type CcrFollowInfoResponse = z.infer<typeof CcrFollowInfoResponse>

/**
 * Get follower stats.
 *
 * Get cross-cluster replication follower stats.
 * The API returns shard-level stats about the "following tasks" associated with each shard for the specified indices.
 */
export const CcrFollowStatsRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-delimited list of index patterns.').meta({ found_in: 'path' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CcrFollowStatsRequest' })
export type CcrFollowStatsRequest = z.infer<typeof CcrFollowStatsRequest>

export const CcrFollowStatsResponse = z.object({
  indices: z.array(CcrFollowIndexStats).describe('An array of follower index statistics.')
}).meta({ id: 'CcrFollowStatsResponse' })
export type CcrFollowStatsResponse = z.infer<typeof CcrFollowStatsResponse>

/**
 * Forget a follower.
 *
 * Remove the cross-cluster replication follower retention leases from the leader.
 *
 * A following index takes out retention leases on its leader index.
 * These leases are used to increase the likelihood that the shards of the leader index retain the history of operations that the shards of the following index need to run replication.
 * When a follower index is converted to a regular index by the unfollow API (either by directly calling the API or by index lifecycle management tasks), these leases are removed.
 * However, removal of the leases can fail, for example when the remote cluster containing the leader index is unavailable.
 * While the leases will eventually expire on their own, their extended existence can cause the leader index to hold more history than necessary and prevent index lifecycle management from performing some operations on the leader index.
 * This API exists to enable manually removing the leases when the unfollow API is unable to do so.
 *
 * NOTE: This API does not stop replication by a following index. If you use this API with a follower index that is still actively following, the following index will add back retention leases on the leader.
 * The only purpose of this API is to handle the case of failure to remove the following retention leases after the unfollow API is invoked.
 */
export const CcrForgetFollowerRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('Name of the leader index for which specified follower retention leases should be removed').meta({ found_in: 'path' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  follower_cluster: z.string().optional().meta({ found_in: 'body' }),
  follower_index: IndexName.optional().meta({ found_in: 'body' }),
  follower_index_uuid: Uuid.optional().meta({ found_in: 'body' }),
  leader_remote_cluster: z.string().optional().meta({ found_in: 'body' })
}).meta({ id: 'CcrForgetFollowerRequest' })
export type CcrForgetFollowerRequest = z.infer<typeof CcrForgetFollowerRequest>

export const CcrForgetFollowerResponse = z.object({
  _shards: ShardStatistics
}).meta({ id: 'CcrForgetFollowerResponse' })
export type CcrForgetFollowerResponse = z.infer<typeof CcrForgetFollowerResponse>

export const CcrGetAutoFollowPatternAutoFollowPatternSummary = z.object({
  active: z.boolean(),
  remote_cluster: z.string().describe('The remote cluster containing the leader indices to match against.'),
  follow_index_pattern: IndexPattern.describe('The name of follower index.').optional(),
  leader_index_patterns: IndexPatterns.describe('An array of simple index patterns to match against indices in the remote cluster specified by the remote_cluster field.'),
  leader_index_exclusion_patterns: IndexPatterns.describe('An array of simple index patterns that can be used to exclude indices from being auto-followed.'),
  max_outstanding_read_requests: integer.describe('The maximum number of outstanding reads requests from the remote cluster.')
}).meta({ id: 'CcrGetAutoFollowPatternAutoFollowPatternSummary' })
export type CcrGetAutoFollowPatternAutoFollowPatternSummary = z.infer<typeof CcrGetAutoFollowPatternAutoFollowPatternSummary>

export const CcrGetAutoFollowPatternAutoFollowPattern = z.object({
  name: Name,
  pattern: CcrGetAutoFollowPatternAutoFollowPatternSummary
}).meta({ id: 'CcrGetAutoFollowPatternAutoFollowPattern' })
export type CcrGetAutoFollowPatternAutoFollowPattern = z.infer<typeof CcrGetAutoFollowPatternAutoFollowPattern>

/**
 * Get auto-follow patterns.
 *
 * Get cross-cluster replication auto-follow patterns.
 */
export const CcrGetAutoFollowPatternRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The auto-follow pattern collection that you want to retrieve. If you do not specify a name, the API returns information for all collections.').optional().meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If the master node is not available before the timeout expires, the request fails and returns an error. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CcrGetAutoFollowPatternRequest' })
export type CcrGetAutoFollowPatternRequest = z.infer<typeof CcrGetAutoFollowPatternRequest>

export const CcrGetAutoFollowPatternResponse = z.object({
  patterns: z.array(CcrGetAutoFollowPatternAutoFollowPattern)
}).meta({ id: 'CcrGetAutoFollowPatternResponse' })
export type CcrGetAutoFollowPatternResponse = z.infer<typeof CcrGetAutoFollowPatternResponse>

/**
 * Pause an auto-follow pattern.
 *
 * Pause a cross-cluster replication auto-follow pattern.
 * When the API returns, the auto-follow pattern is inactive.
 * New indices that are created on the remote cluster and match the auto-follow patterns are ignored.
 *
 * You can resume auto-following with the resume auto-follow pattern API.
 * When it resumes, the auto-follow pattern is active again and automatically configures follower indices for newly created indices on the remote cluster that match its patterns.
 * Remote indices that were created while the pattern was paused will also be followed, unless they have been deleted or closed in the interim.
 */
export const CcrPauseAutoFollowPatternRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the auto-follow pattern to pause.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If the master node is not available before the timeout expires, the request fails and returns an error. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CcrPauseAutoFollowPatternRequest' })
export type CcrPauseAutoFollowPatternRequest = z.infer<typeof CcrPauseAutoFollowPatternRequest>

export const CcrPauseAutoFollowPatternResponse = AcknowledgedResponseBase.meta({ id: 'CcrPauseAutoFollowPatternResponse' })
export type CcrPauseAutoFollowPatternResponse = z.infer<typeof CcrPauseAutoFollowPatternResponse>

/**
 * Pause a follower.
 *
 * Pause a cross-cluster replication follower index.
 * The follower index will not fetch any additional operations from the leader index.
 * You can resume following with the resume follower API.
 * You can pause and resume a follower index to change the configuration of the following task.
 */
export const CcrPauseFollowRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('The name of the follower index.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If the master node is not available before the timeout expires, the request fails and returns an error. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CcrPauseFollowRequest' })
export type CcrPauseFollowRequest = z.infer<typeof CcrPauseFollowRequest>

export const CcrPauseFollowResponse = AcknowledgedResponseBase.meta({ id: 'CcrPauseFollowResponse' })
export type CcrPauseFollowResponse = z.infer<typeof CcrPauseFollowResponse>

/**
 * Create or update auto-follow patterns.
 *
 * Create a collection of cross-cluster replication auto-follow patterns for a remote cluster.
 * Newly created indices on the remote cluster that match any of the patterns are automatically configured as follower indices.
 * Indices on the remote cluster that were created before the auto-follow pattern was created will not be auto-followed even if they match the pattern.
 *
 * This API can also be used to update auto-follow patterns.
 * NOTE: Follower indices that were configured automatically before updating an auto-follow pattern will remain unchanged even if they do not match against the new patterns.
 */
export const CcrPutAutoFollowPatternRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the collection of auto-follow patterns.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  remote_cluster: z.string().describe('The remote cluster containing the leader indices to match against.').meta({ found_in: 'body' }),
  follow_index_pattern: IndexPattern.describe('The name of follower index. The template {{leader_index}} can be used to derive the name of the follower index from the name of the leader index. When following a data stream, use {{leader_index}}; CCR does not support changes to the names of a follower data stream’s backing indices.').optional().meta({ found_in: 'body' }),
  leader_index_patterns: IndexPatterns.describe('An array of simple index patterns to match against indices in the remote cluster specified by the remote_cluster field.').optional().meta({ found_in: 'body' }),
  leader_index_exclusion_patterns: IndexPatterns.describe('An array of simple index patterns that can be used to exclude indices from being auto-followed. Indices in the remote cluster whose names are matching one or more leader_index_patterns and one or more leader_index_exclusion_patterns won’t be followed.').optional().meta({ found_in: 'body' }),
  max_outstanding_read_requests: integer.describe('The maximum number of outstanding reads requests from the remote cluster.').optional().meta({ found_in: 'body' }),
  settings: z.record(z.string(), z.any()).describe('Settings to override from the leader index. Note that certain settings can not be overrode (e.g., index.number_of_shards).').optional().meta({ found_in: 'body' }),
  max_outstanding_write_requests: integer.describe('The maximum number of outstanding reads requests from the remote cluster.').optional().meta({ found_in: 'body' }),
  read_poll_timeout: Duration.describe('The maximum time to wait for new operations on the remote cluster when the follower index is synchronized with the leader index. When the timeout has elapsed, the poll for operations will return to the follower so that it can update some statistics. Then the follower will immediately attempt to read from the leader again.').optional().meta({ found_in: 'body' }),
  max_read_request_operation_count: integer.describe('The maximum number of operations to pull per read from the remote cluster.').optional().meta({ found_in: 'body' }),
  max_read_request_size: ByteSize.describe('The maximum size in bytes of per read of a batch of operations pulled from the remote cluster.').optional().meta({ found_in: 'body' }),
  max_retry_delay: Duration.describe('The maximum time to wait before retrying an operation that failed exceptionally. An exponential backoff strategy is employed when retrying.').optional().meta({ found_in: 'body' }),
  max_write_buffer_count: integer.describe('The maximum number of operations that can be queued for writing. When this limit is reached, reads from the remote cluster will be deferred until the number of queued operations goes below the limit.').optional().meta({ found_in: 'body' }),
  max_write_buffer_size: ByteSize.describe('The maximum total bytes of operations that can be queued for writing. When this limit is reached, reads from the remote cluster will be deferred until the total bytes of queued operations goes below the limit.').optional().meta({ found_in: 'body' }),
  max_write_request_operation_count: integer.describe('The maximum number of operations per bulk write request executed on the follower.').optional().meta({ found_in: 'body' }),
  max_write_request_size: ByteSize.describe('The maximum total bytes of operations per bulk write request executed on the follower.').optional().meta({ found_in: 'body' })
}).meta({ id: 'CcrPutAutoFollowPatternRequest' })
export type CcrPutAutoFollowPatternRequest = z.infer<typeof CcrPutAutoFollowPatternRequest>

export const CcrPutAutoFollowPatternResponse = AcknowledgedResponseBase.meta({ id: 'CcrPutAutoFollowPatternResponse' })
export type CcrPutAutoFollowPatternResponse = z.infer<typeof CcrPutAutoFollowPatternResponse>

/**
 * Resume an auto-follow pattern.
 *
 * Resume a cross-cluster replication auto-follow pattern that was paused.
 * The auto-follow pattern will resume configuring following indices for newly created indices that match its patterns on the remote cluster.
 * Remote indices created while the pattern was paused will also be followed unless they have been deleted or closed in the interim.
 */
export const CcrResumeAutoFollowPatternRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the auto-follow pattern to resume.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If the master node is not available before the timeout expires, the request fails and returns an error. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CcrResumeAutoFollowPatternRequest' })
export type CcrResumeAutoFollowPatternRequest = z.infer<typeof CcrResumeAutoFollowPatternRequest>

export const CcrResumeAutoFollowPatternResponse = AcknowledgedResponseBase.meta({ id: 'CcrResumeAutoFollowPatternResponse' })
export type CcrResumeAutoFollowPatternResponse = z.infer<typeof CcrResumeAutoFollowPatternResponse>

/**
 * Resume a follower.
 *
 * Resume a cross-cluster replication follower index that was paused.
 * The follower index could have been paused with the pause follower API.
 * Alternatively it could be paused due to replication that cannot be retried due to failures during following tasks.
 * When this API returns, the follower index will resume fetching operations from the leader index.
 */
export const CcrResumeFollowRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('Name of the follow index to resume following').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  max_outstanding_read_requests: long.optional().meta({ found_in: 'body' }),
  max_outstanding_write_requests: long.optional().meta({ found_in: 'body' }),
  max_read_request_operation_count: long.optional().meta({ found_in: 'body' }),
  max_read_request_size: z.string().optional().meta({ found_in: 'body' }),
  max_retry_delay: Duration.optional().meta({ found_in: 'body' }),
  max_write_buffer_count: long.optional().meta({ found_in: 'body' }),
  max_write_buffer_size: z.string().optional().meta({ found_in: 'body' }),
  max_write_request_operation_count: long.optional().meta({ found_in: 'body' }),
  max_write_request_size: z.string().optional().meta({ found_in: 'body' }),
  read_poll_timeout: Duration.optional().meta({ found_in: 'body' })
}).meta({ id: 'CcrResumeFollowRequest' })
export type CcrResumeFollowRequest = z.infer<typeof CcrResumeFollowRequest>

export const CcrResumeFollowResponse = AcknowledgedResponseBase.meta({ id: 'CcrResumeFollowResponse' })
export type CcrResumeFollowResponse = z.infer<typeof CcrResumeFollowResponse>

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

/**
 * Unfollow an index.
 *
 * Convert a cross-cluster replication follower index to a regular index.
 * The API stops the following task associated with a follower index and removes index metadata and settings associated with cross-cluster replication.
 * The follower index must be paused and closed before you call the unfollow API.
 *
 * > info
 * > Currently cross-cluster replication does not support converting an existing regular index to a follower index. Converting a follower index to a regular index is an irreversible operation.
 */
export const CcrUnfollowRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('The name of the follower index.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If the master node is not available before the timeout expires, the request fails and returns an error. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CcrUnfollowRequest' })
export type CcrUnfollowRequest = z.infer<typeof CcrUnfollowRequest>

export const CcrUnfollowResponse = AcknowledgedResponseBase.meta({ id: 'CcrUnfollowResponse' })
export type CcrUnfollowResponse = z.infer<typeof CcrUnfollowResponse>
