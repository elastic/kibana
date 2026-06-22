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

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

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
