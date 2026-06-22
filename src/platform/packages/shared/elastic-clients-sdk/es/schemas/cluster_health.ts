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

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

export const ExpandWildcard = z.enum(['all', 'open', 'closed', 'hidden', 'none']).meta({ id: 'ExpandWildcard' })
export type ExpandWildcard = z.infer<typeof ExpandWildcard>

export const ExpandWildcards = z.union([ExpandWildcard, z.array(ExpandWildcard)]).meta({ id: 'ExpandWildcards' })
export type ExpandWildcards = z.infer<typeof ExpandWildcards>

export const HealthStatus = z.enum(['green', 'GREEN', 'yellow', 'YELLOW', 'red', 'RED', 'unknown', 'unavailable']).meta({ id: 'HealthStatus' })
export type HealthStatus = z.infer<typeof HealthStatus>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const Level = z.enum(['cluster', 'indices', 'shards']).meta({ id: 'Level' })
export type Level = z.infer<typeof Level>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const WaitForActiveShardOptions = z.enum(['all', 'index-setting']).meta({ id: 'WaitForActiveShardOptions' })
export type WaitForActiveShardOptions = z.infer<typeof WaitForActiveShardOptions>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const WaitForActiveShards = z.union([integer, WaitForActiveShardOptions]).meta({ id: 'WaitForActiveShards' })
export type WaitForActiveShards = z.infer<typeof WaitForActiveShards>

export const WaitForEvents = z.enum(['immediate', 'urgent', 'high', 'normal', 'low', 'languid']).meta({ id: 'WaitForEvents' })
export type WaitForEvents = z.infer<typeof WaitForEvents>

export const double = z.number().meta({ id: 'double' })
export type double = z.infer<typeof double>

export const ClusterHealthShardHealthStats = z.object({
  active_shards: integer,
  initializing_shards: integer,
  primary_active: z.boolean(),
  relocating_shards: integer,
  status: HealthStatus,
  unassigned_shards: integer,
  unassigned_primary_shards: integer
}).meta({ id: 'ClusterHealthShardHealthStats' })
export type ClusterHealthShardHealthStats = z.infer<typeof ClusterHealthShardHealthStats>

export const ClusterHealthIndexHealthStats = z.object({
  active_primary_shards: integer,
  active_shards: integer,
  initializing_shards: integer,
  number_of_replicas: integer,
  number_of_shards: integer,
  relocating_shards: integer,
  shards: z.record(z.string(), ClusterHealthShardHealthStats).optional(),
  status: HealthStatus,
  unassigned_shards: integer,
  unassigned_primary_shards: integer
}).meta({ id: 'ClusterHealthIndexHealthStats' })
export type ClusterHealthIndexHealthStats = z.infer<typeof ClusterHealthIndexHealthStats>

export const ClusterHealthHealthResponseBody = z.object({
  active_primary_shards: integer.describe('The number of active primary shards.'),
  active_shards: integer.describe('The total number of active primary and replica shards.'),
  active_shards_percent: z.string().describe('The ratio of active shards in the cluster expressed as a string formatted percentage.').optional(),
  active_shards_percent_as_number: double.describe('The ratio of active shards in the cluster expressed as a percentage.'),
  cluster_name: Name.describe('The name of the cluster.'),
  delayed_unassigned_shards: integer.describe('The number of shards whose allocation has been delayed by the timeout settings.'),
  indices: z.record(IndexName, ClusterHealthIndexHealthStats).optional(),
  initializing_shards: integer.describe('The number of shards that are under initialization.'),
  number_of_data_nodes: integer.describe('The number of nodes that are dedicated data nodes.'),
  number_of_in_flight_fetch: integer.describe('The number of unfinished fetches.'),
  number_of_nodes: integer.describe('The number of nodes within the cluster.'),
  number_of_pending_tasks: integer.describe('The number of cluster-level changes that have not yet been executed.'),
  relocating_shards: integer.describe('The number of shards that are under relocation.'),
  status: HealthStatus,
  task_max_waiting_in_queue: Duration.describe('The time since the earliest initiated task is waiting for being performed.').optional(),
  task_max_waiting_in_queue_millis: DurationValue.describe('The time expressed in milliseconds since the earliest initiated task is waiting for being performed.'),
  timed_out: z.boolean().describe('If false the response returned within the period of time that is specified by the timeout parameter (30s by default)'),
  unassigned_primary_shards: integer.describe('The number of primary shards that are not allocated.'),
  unassigned_shards: integer.describe('The number of shards that are not allocated.')
}).meta({ id: 'ClusterHealthHealthResponseBody' })
export type ClusterHealthHealthResponseBody = z.infer<typeof ClusterHealthHealthResponseBody>

export const ClusterHealthWaitForNodes = z.union([z.string(), integer]).meta({ id: 'ClusterHealthWaitForNodes' })
export type ClusterHealthWaitForNodes = z.infer<typeof ClusterHealthWaitForNodes>

/**
 * Get the cluster health status.
 *
 * You can also use the API to get the health status of only specified data streams and indices.
 * For data streams, the API retrieves the health status of the stream’s backing indices.
 *
 * The cluster health status is: green, yellow or red.
 * On the shard level, a red status indicates that the specific shard is not allocated in the cluster. Yellow means that the primary shard is allocated but replicas are not. Green means that all shards are allocated.
 * The index level status is controlled by the worst shard status.
 *
 * One of the main benefits of the API is the ability to wait until the cluster reaches a certain high watermark health level.
 * The cluster status is controlled by the worst index status.
 */
export const ClusterHealthRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-separated list of data streams, indices, and index aliases that limit the request. Wildcard expressions (`*`) are supported. To target all data streams and indices in a cluster, omit this parameter or use _all or `*`.').optional().meta({ found_in: 'path' }),
  expand_wildcards: ExpandWildcards.describe('Expand wildcard expression to concrete indices that are open, closed or both.').optional().meta({ found_in: 'query' }),
  level: Level.describe('Return health information at a specific level of detail.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If true, retrieve information from the local node only. If false, retrieve information from the master node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  wait_for_active_shards: WaitForActiveShards.describe('Wait for the specified number of active shards. Use `all` to wait for all shards in the cluster to be active. Use `0` to not wait.').optional().meta({ found_in: 'query' }),
  wait_for_events: WaitForEvents.describe('Wait until all currently queued events with the given priority are processed.').optional().meta({ found_in: 'query' }),
  wait_for_nodes: ClusterHealthWaitForNodes.describe('Wait until the specified number (N) of nodes is available. It also accepts `>=N`, `<=N`, `>N` and `<N`. Alternatively, use the notations `ge(N)`, `le(N)`, `gt(N)`, and `lt(N)`.').optional().meta({ found_in: 'query' }),
  wait_for_no_initializing_shards: z.boolean().describe('Wait (until the timeout expires) for the cluster to have no shard initializations. If false, the request does not wait for initializing shards.').optional().meta({ found_in: 'query' }),
  wait_for_no_relocating_shards: z.boolean().describe('Wait (until the timeout expires) for the cluster to have no shard relocations. If false, the request not wait for relocating shards.').optional().meta({ found_in: 'query' }),
  wait_for_status: HealthStatus.describe('Wait (until the timeout expires) for the cluster to reach a specific health status (or a better status). A green status is better than yellow and yellow is better than red. By default, the request does not wait for a particular status.').optional().meta({ found_in: 'query' })
}).meta({ id: 'ClusterHealthRequest' })
export type ClusterHealthRequest = z.infer<typeof ClusterHealthRequest>

export const ClusterHealthResponse = ClusterHealthHealthResponseBody.meta({ id: 'ClusterHealthResponse' })
export type ClusterHealthResponse = z.infer<typeof ClusterHealthResponse>
