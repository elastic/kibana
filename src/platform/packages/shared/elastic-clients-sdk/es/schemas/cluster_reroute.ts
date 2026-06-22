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

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const NodeName = z.string().meta({ id: 'NodeName' })
export type NodeName = z.infer<typeof NodeName>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const ClusterRerouteCommandCancelAction = z.object({
  index: IndexName,
  shard: integer,
  node: z.string(),
  allow_primary: z.boolean().optional()
}).meta({ id: 'ClusterRerouteCommandCancelAction' })
export type ClusterRerouteCommandCancelAction = z.infer<typeof ClusterRerouteCommandCancelAction>

export const ClusterRerouteCommandMoveAction = z.object({
  index: IndexName,
  shard: integer,
  from_node: z.string().describe('The node to move the shard from'),
  to_node: z.string().describe('The node to move the shard to')
}).meta({ id: 'ClusterRerouteCommandMoveAction' })
export type ClusterRerouteCommandMoveAction = z.infer<typeof ClusterRerouteCommandMoveAction>

export const ClusterRerouteCommandAllocateReplicaAction = z.object({
  index: IndexName,
  shard: integer,
  node: z.string()
}).meta({ id: 'ClusterRerouteCommandAllocateReplicaAction' })
export type ClusterRerouteCommandAllocateReplicaAction = z.infer<typeof ClusterRerouteCommandAllocateReplicaAction>

export const ClusterRerouteCommandAllocatePrimaryAction = z.object({
  index: IndexName,
  shard: integer,
  node: z.string(),
  accept_data_loss: z.boolean().describe('If a node which has a copy of the data rejoins the cluster later on, that data will be deleted. To ensure that these implications are well-understood, this command requires the flag accept_data_loss to be explicitly set to true')
}).meta({ id: 'ClusterRerouteCommandAllocatePrimaryAction' })
export type ClusterRerouteCommandAllocatePrimaryAction = z.infer<typeof ClusterRerouteCommandAllocatePrimaryAction>

export const ClusterRerouteCommand = z.object({
  cancel: ClusterRerouteCommandCancelAction.describe('Cancel allocation of a shard (or recovery). Accepts index and shard for index name and shard number, and node for the node to cancel the shard allocation on. This can be used to force resynchronization of existing replicas from the primary shard by cancelling them and allowing them to be reinitialized through the standard recovery process. By default only replica shard allocations can be cancelled. If it is necessary to cancel the allocation of a primary shard then the allow_primary flag must also be included in the request.').optional(),
  move: ClusterRerouteCommandMoveAction.describe('Move a started shard from one node to another node. Accepts index and shard for index name and shard number, from_node for the node to move the shard from, and to_node for the node to move the shard to.').optional(),
  allocate_replica: ClusterRerouteCommandAllocateReplicaAction.describe('Allocate an unassigned replica shard to a node. Accepts index and shard for index name and shard number, and node to allocate the shard to. Takes allocation deciders into account.').optional(),
  allocate_stale_primary: ClusterRerouteCommandAllocatePrimaryAction.describe('Allocate a primary shard to a node that holds a stale copy. Accepts the index and shard for index name and shard number, and node to allocate the shard to. Using this command may lead to data loss for the provided shard id. If a node which has the good copy of the data rejoins the cluster later on, that data will be deleted or overwritten with the data of the stale copy that was forcefully allocated with this command. To ensure that these implications are well-understood, this command requires the flag accept_data_loss to be explicitly set to true.').optional(),
  allocate_empty_primary: ClusterRerouteCommandAllocatePrimaryAction.describe('Allocate an empty primary shard to a node. Accepts the index and shard for index name and shard number, and node to allocate the shard to. Using this command leads to a complete loss of all data that was indexed into this shard, if it was previously started. If a node which has a copy of the data rejoins the cluster later on, that data will be deleted. To ensure that these implications are well-understood, this command requires the flag accept_data_loss to be explicitly set to true.').optional()
}).meta({ id: 'ClusterRerouteCommand' })
export type ClusterRerouteCommand = z.infer<typeof ClusterRerouteCommand>

/**
 * Reroute the cluster.
 *
 * Manually change the allocation of individual shards in the cluster.
 * For example, a shard can be moved from one node to another explicitly, an allocation can be canceled, and an unassigned shard can be explicitly allocated to a specific node.
 *
 * It is important to note that after processing any reroute commands Elasticsearch will perform rebalancing as normal (respecting the values of settings such as `cluster.routing.rebalance.enable`) in order to remain in a balanced state.
 * For example, if the requested allocation includes moving a shard from node1 to node2 then this may cause a shard to be moved from node2 back to node1 to even things out.
 *
 * The cluster can be set to disable allocations using the `cluster.routing.allocation.enable` setting.
 * If allocations are disabled then the only allocations that will be performed are explicit ones given using the reroute command, and consequent allocations due to rebalancing.
 *
 * The cluster will attempt to allocate a shard a maximum of `index.allocation.max_retries` times in a row (defaults to `5`), before giving up and leaving the shard unallocated.
 * This scenario can be caused by structural problems such as having an analyzer which refers to a stopwords file which doesn’t exist on all nodes.
 *
 * Once the problem has been corrected, allocation can be manually retried by calling the reroute API with the `?retry_failed` URI query parameter, which will attempt a single retry round for these shards.
 */
export const ClusterRerouteRequest = z.object({
  ...RequestBase.shape,
  dry_run: z.boolean().describe('If true, then the request simulates the operation. It will calculate the result of applying the commands to the current cluster state and return the resulting cluster state after the commands (and rebalancing) have been applied; it will not actually perform the requested changes.').optional().meta({ found_in: 'query' }),
  explain: z.boolean().describe('If true, then the response contains an explanation of why the commands can or cannot run.').optional().meta({ found_in: 'query' }),
  metric: z.union([z.string(), z.array(z.string())]).describe('Limits the information returned to the specified metrics.').optional().meta({ found_in: 'query' }),
  retry_failed: z.boolean().describe('If true, then retries allocation of shards that are blocked due to too many subsequent allocation failures.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  commands: z.array(ClusterRerouteCommand).describe('Defines the commands to perform.').optional().meta({ found_in: 'body' })
}).meta({ id: 'ClusterRerouteRequest' })
export type ClusterRerouteRequest = z.infer<typeof ClusterRerouteRequest>

export const ClusterRerouteRerouteDecision = z.object({
  decider: z.string(),
  decision: z.string(),
  explanation: z.string()
}).meta({ id: 'ClusterRerouteRerouteDecision' })
export type ClusterRerouteRerouteDecision = z.infer<typeof ClusterRerouteRerouteDecision>

export const ClusterRerouteRerouteParameters = z.object({
  allow_primary: z.boolean(),
  index: IndexName,
  node: NodeName,
  shard: integer,
  from_node: NodeName.optional(),
  to_node: NodeName.optional()
}).meta({ id: 'ClusterRerouteRerouteParameters' })
export type ClusterRerouteRerouteParameters = z.infer<typeof ClusterRerouteRerouteParameters>

export const ClusterRerouteRerouteExplanation = z.object({
  command: z.string(),
  decisions: z.array(ClusterRerouteRerouteDecision),
  parameters: ClusterRerouteRerouteParameters
}).meta({ id: 'ClusterRerouteRerouteExplanation' })
export type ClusterRerouteRerouteExplanation = z.infer<typeof ClusterRerouteRerouteExplanation>

export const ClusterRerouteResponse = z.object({
  acknowledged: z.boolean(),
  explanations: z.array(ClusterRerouteRerouteExplanation).optional(),
  state: z.any().describe('There aren\'t any guarantees on the output/structure of the raw cluster state. Here you will find the internal representation of the cluster, which can differ from the external representation.').optional()
}).meta({ id: 'ClusterRerouteResponse' })
export type ClusterRerouteResponse = z.infer<typeof ClusterRerouteResponse>
