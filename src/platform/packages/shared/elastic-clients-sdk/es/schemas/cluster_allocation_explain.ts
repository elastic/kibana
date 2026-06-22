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

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const NodeRole = z.enum(['master', 'data', 'data_cold', 'data_content', 'data_frozen', 'data_hot', 'data_warm', 'client', 'ingest', 'ml', 'voting_only', 'transform', 'remote_cluster_client', 'coordinating_only']).meta({ id: 'NodeRole' })
export type NodeRole = z.infer<typeof NodeRole>

export const NodeRoles = z.array(NodeRole).meta({ id: 'NodeRoles' })
export type NodeRoles = z.infer<typeof NodeRoles>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const TransportAddress = z.string().meta({ id: 'TransportAddress' })
export type TransportAddress = z.infer<typeof TransportAddress>

export const double = z.number().meta({ id: 'double' })
export type double = z.infer<typeof double>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const ClusterAllocationExplainAllocationExplainDecision = z.enum(['NO', 'YES', 'THROTTLE', 'ALWAYS']).meta({ id: 'ClusterAllocationExplainAllocationExplainDecision' })
export type ClusterAllocationExplainAllocationExplainDecision = z.infer<typeof ClusterAllocationExplainAllocationExplainDecision>

export const ClusterAllocationExplainAllocationDecision = z.object({
  decider: z.string(),
  decision: ClusterAllocationExplainAllocationExplainDecision,
  explanation: z.string()
}).meta({ id: 'ClusterAllocationExplainAllocationDecision' })
export type ClusterAllocationExplainAllocationDecision = z.infer<typeof ClusterAllocationExplainAllocationDecision>

export const ClusterAllocationExplainAllocationStore = z.object({
  allocation_id: z.string(),
  found: z.boolean(),
  in_sync: z.boolean(),
  matching_size_in_bytes: long,
  matching_sync_id: z.boolean(),
  store_exception: z.string()
}).meta({ id: 'ClusterAllocationExplainAllocationStore' })
export type ClusterAllocationExplainAllocationStore = z.infer<typeof ClusterAllocationExplainAllocationStore>

export const ClusterAllocationExplainDiskUsage = z.object({
  path: z.string(),
  total_bytes: long,
  used_bytes: long,
  free_bytes: long,
  free_disk_percent: double,
  used_disk_percent: double
}).meta({ id: 'ClusterAllocationExplainDiskUsage' })
export type ClusterAllocationExplainDiskUsage = z.infer<typeof ClusterAllocationExplainDiskUsage>

export const ClusterAllocationExplainNodeDiskUsage = z.object({
  node_name: Name,
  least_available: ClusterAllocationExplainDiskUsage,
  most_available: ClusterAllocationExplainDiskUsage
}).meta({ id: 'ClusterAllocationExplainNodeDiskUsage' })
export type ClusterAllocationExplainNodeDiskUsage = z.infer<typeof ClusterAllocationExplainNodeDiskUsage>

export const ClusterAllocationExplainReservedSize = z.object({
  node_id: Id,
  path: z.string(),
  total: long,
  shards: z.array(z.string())
}).meta({ id: 'ClusterAllocationExplainReservedSize' })
export type ClusterAllocationExplainReservedSize = z.infer<typeof ClusterAllocationExplainReservedSize>

export const ClusterAllocationExplainClusterInfo = z.object({
  nodes: z.record(z.string(), ClusterAllocationExplainNodeDiskUsage),
  shard_sizes: z.record(z.string(), long),
  shard_data_set_sizes: z.record(z.string(), z.string()).optional(),
  shard_paths: z.record(z.string(), z.string()),
  reserved_sizes: z.array(ClusterAllocationExplainReservedSize)
}).meta({ id: 'ClusterAllocationExplainClusterInfo' })
export type ClusterAllocationExplainClusterInfo = z.infer<typeof ClusterAllocationExplainClusterInfo>

export const ClusterAllocationExplainCurrentNode = z.object({
  id: Id,
  name: Name,
  roles: NodeRoles,
  attributes: z.record(z.string(), z.string()),
  transport_address: TransportAddress,
  weight_ranking: integer
}).meta({ id: 'ClusterAllocationExplainCurrentNode' })
export type ClusterAllocationExplainCurrentNode = z.infer<typeof ClusterAllocationExplainCurrentNode>

export const ClusterAllocationExplainDecision = z.enum(['yes', 'no', 'worse_balance', 'throttled', 'awaiting_info', 'allocation_delayed', 'no_valid_shard_copy', 'no_attempt']).meta({ id: 'ClusterAllocationExplainDecision' })
export type ClusterAllocationExplainDecision = z.infer<typeof ClusterAllocationExplainDecision>

export const ClusterAllocationExplainNodeAllocationExplanation = z.object({
  deciders: z.array(ClusterAllocationExplainAllocationDecision).optional(),
  node_attributes: z.record(z.string(), z.string()),
  node_decision: ClusterAllocationExplainDecision,
  node_id: Id,
  node_name: Name,
  roles: NodeRoles,
  store: ClusterAllocationExplainAllocationStore.optional(),
  transport_address: TransportAddress,
  weight_ranking: integer.optional()
}).meta({ id: 'ClusterAllocationExplainNodeAllocationExplanation' })
export type ClusterAllocationExplainNodeAllocationExplanation = z.infer<typeof ClusterAllocationExplainNodeAllocationExplanation>

/**
 * Explain the shard allocations.
 *
 * Get explanations for shard allocations in the cluster.
 * This API accepts the current_node, index, primary and shard parameters in the request body or in query parameters, but not in both at the same time.
 * For unassigned shards, it provides an explanation for why the shard is unassigned.
 * For assigned shards, it provides an explanation for why the shard is remaining on its current node and has not moved or rebalanced to another node.
 * This API can be very useful when attempting to diagnose why a shard is unassigned or why a shard continues to remain on its current node when you might expect otherwise.
 * Refer to the linked documentation for examples of how to troubleshoot allocation issues using this API.
 */
export const ClusterAllocationExplainRequest = z.object({
  ...RequestBase.shape,
  include_disk_info: z.boolean().describe('If true, returns information about disk usage and shard sizes.').optional().meta({ found_in: 'query' }),
  include_yes_decisions: z.boolean().describe('If true, returns YES decisions in explanation.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  index: IndexName.describe('The name of the index that you would like an explanation for.').optional().meta({ found_in: 'body' }),
  shard: integer.describe('An identifier for the shard that you would like an explanation for.').optional().meta({ found_in: 'body' }),
  primary: z.boolean().describe('If true, returns an explanation for the primary shard for the specified shard ID.').optional().meta({ found_in: 'body' }),
  current_node: NodeId.describe('Explain a shard only if it is currently located on the specified node name or node ID.').optional().meta({ found_in: 'body' })
}).meta({ id: 'ClusterAllocationExplainRequest' })
export type ClusterAllocationExplainRequest = z.infer<typeof ClusterAllocationExplainRequest>

export const ClusterAllocationExplainUnassignedInformationReason = z.enum(['INDEX_CREATED', 'CLUSTER_RECOVERED', 'INDEX_REOPENED', 'DANGLING_INDEX_IMPORTED', 'NEW_INDEX_RESTORED', 'EXISTING_INDEX_RESTORED', 'REPLICA_ADDED', 'ALLOCATION_FAILED', 'NODE_LEFT', 'REROUTE_CANCELLED', 'REINITIALIZED', 'REALLOCATED_REPLICA', 'PRIMARY_FAILED', 'FORCED_EMPTY_PRIMARY', 'MANUAL_ALLOCATION']).meta({ id: 'ClusterAllocationExplainUnassignedInformationReason' })
export type ClusterAllocationExplainUnassignedInformationReason = z.infer<typeof ClusterAllocationExplainUnassignedInformationReason>

export const ClusterAllocationExplainUnassignedInformation = z.object({
  at: DateTime,
  last_allocation_status: z.string().optional(),
  reason: ClusterAllocationExplainUnassignedInformationReason,
  details: z.string().optional(),
  failed_allocation_attempts: integer.optional(),
  delayed: z.boolean().optional(),
  allocation_status: z.string().optional()
}).meta({ id: 'ClusterAllocationExplainUnassignedInformation' })
export type ClusterAllocationExplainUnassignedInformation = z.infer<typeof ClusterAllocationExplainUnassignedInformation>

export const ClusterAllocationExplainResponse = z.object({
  allocate_explanation: z.string().optional(),
  allocation_delay: Duration.optional(),
  allocation_delay_in_millis: DurationValue.optional(),
  can_allocate: ClusterAllocationExplainDecision.optional(),
  can_move_to_other_node: ClusterAllocationExplainDecision.optional(),
  can_rebalance_cluster: ClusterAllocationExplainDecision.optional(),
  can_rebalance_cluster_decisions: z.array(ClusterAllocationExplainAllocationDecision).optional(),
  can_rebalance_to_other_node: ClusterAllocationExplainDecision.optional(),
  can_remain_decisions: z.array(ClusterAllocationExplainAllocationDecision).optional(),
  can_remain_on_current_node: ClusterAllocationExplainDecision.optional(),
  cluster_info: ClusterAllocationExplainClusterInfo.optional(),
  configured_delay: Duration.optional(),
  configured_delay_in_millis: DurationValue.optional(),
  current_node: ClusterAllocationExplainCurrentNode.optional(),
  current_state: z.string(),
  index: IndexName,
  move_explanation: z.string().optional(),
  node_allocation_decisions: z.array(ClusterAllocationExplainNodeAllocationExplanation).optional(),
  primary: z.boolean(),
  rebalance_explanation: z.string().optional(),
  remaining_delay: Duration.optional(),
  remaining_delay_in_millis: DurationValue.optional(),
  shard: integer,
  unassigned_info: ClusterAllocationExplainUnassignedInformation.optional(),
  note: z.string().optional()
}).meta({ id: 'ClusterAllocationExplainResponse' })
export type ClusterAllocationExplainResponse = z.infer<typeof ClusterAllocationExplainResponse>
