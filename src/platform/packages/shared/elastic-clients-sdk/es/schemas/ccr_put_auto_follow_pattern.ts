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

export const AcknowledgedResponseBase = z.object({
  acknowledged: z.boolean().describe('For a successful response, this value is always true. On failure, an exception is returned instead.')
}).meta({ id: 'AcknowledgedResponseBase' })
export type AcknowledgedResponseBase = z.infer<typeof AcknowledgedResponseBase>

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

export const IndexPattern = z.string().meta({ id: 'IndexPattern' })
export type IndexPattern = z.infer<typeof IndexPattern>

export const IndexPatterns = z.array(IndexPattern).meta({ id: 'IndexPatterns' })
export type IndexPatterns = z.infer<typeof IndexPatterns>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

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
