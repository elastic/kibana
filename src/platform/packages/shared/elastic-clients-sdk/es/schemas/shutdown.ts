/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { AcknowledgedResponseBase, Duration, EpochTime, NodeId, NodeIds, RequestBase } from './_types'

export const ShutdownType = z.enum(['restart', 'remove', 'replace']).meta({ id: 'ShutdownType' })
export type ShutdownType = z.infer<typeof ShutdownType>

/**
 * Cancel node shutdown preparations.
 *
 * Remove a node from the shutdown list so it can resume normal operations.
 * You must explicitly clear the shutdown request when a node rejoins the cluster or when a node has permanently left the cluster.
 * Shutdown requests are never removed automatically by Elasticsearch.
 *
 * NOTE: This feature is designed for indirect use by Elastic Cloud, Elastic Cloud Enterprise, and Elastic Cloud on Kubernetes.
 * Direct use is not supported.
 *
 * If the operator privileges feature is enabled, you must be an operator to use this API.
 */
export const ShutdownDeleteNodeRequest = z.object({
  ...RequestBase.shape,
  node_id: NodeId.describe('The node id of node to be removed from the shutdown state').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'ShutdownDeleteNodeRequest' })
export type ShutdownDeleteNodeRequest = z.infer<typeof ShutdownDeleteNodeRequest>

export const ShutdownDeleteNodeResponse = AcknowledgedResponseBase.meta({ id: 'ShutdownDeleteNodeResponse' })
export type ShutdownDeleteNodeResponse = z.infer<typeof ShutdownDeleteNodeResponse>

export const ShutdownGetNodeShutdownType = z.enum(['remove', 'restart']).meta({ id: 'ShutdownGetNodeShutdownType' })
export type ShutdownGetNodeShutdownType = z.infer<typeof ShutdownGetNodeShutdownType>

export const ShutdownGetNodeShutdownStatus = z.enum(['not_started', 'in_progress', 'stalled', 'complete']).meta({ id: 'ShutdownGetNodeShutdownStatus' })
export type ShutdownGetNodeShutdownStatus = z.infer<typeof ShutdownGetNodeShutdownStatus>

export const ShutdownGetNodeShardMigrationStatus = z.object({
  status: ShutdownGetNodeShutdownStatus
}).meta({ id: 'ShutdownGetNodeShardMigrationStatus' })
export type ShutdownGetNodeShardMigrationStatus = z.infer<typeof ShutdownGetNodeShardMigrationStatus>

export const ShutdownGetNodePersistentTaskStatus = z.object({
  status: ShutdownGetNodeShutdownStatus
}).meta({ id: 'ShutdownGetNodePersistentTaskStatus' })
export type ShutdownGetNodePersistentTaskStatus = z.infer<typeof ShutdownGetNodePersistentTaskStatus>

export const ShutdownGetNodePluginsStatus = z.object({
  status: ShutdownGetNodeShutdownStatus
}).meta({ id: 'ShutdownGetNodePluginsStatus' })
export type ShutdownGetNodePluginsStatus = z.infer<typeof ShutdownGetNodePluginsStatus>

export const ShutdownGetNodeNodeShutdownStatus = z.object({
  node_id: NodeId,
  type: ShutdownGetNodeShutdownType,
  reason: z.string(),
  shutdown_startedmillis: EpochTime,
  status: ShutdownGetNodeShutdownStatus,
  shard_migration: ShutdownGetNodeShardMigrationStatus,
  persistent_tasks: ShutdownGetNodePersistentTaskStatus,
  plugins: ShutdownGetNodePluginsStatus
}).meta({ id: 'ShutdownGetNodeNodeShutdownStatus' })
export type ShutdownGetNodeNodeShutdownStatus = z.infer<typeof ShutdownGetNodeNodeShutdownStatus>

/**
 * Get the shutdown status.
 *
 * Get information about nodes that are ready to be shut down, have shut down preparations still in progress, or have stalled.
 * The API returns status information for each part of the shut down process.
 *
 * NOTE: This feature is designed for indirect use by Elasticsearch Service, Elastic Cloud Enterprise, and Elastic Cloud on Kubernetes. Direct use is not supported.
 *
 * If the operator privileges feature is enabled, you must be an operator to use this API.
 */
export const ShutdownGetNodeRequest = z.object({
  ...RequestBase.shape,
  node_id: NodeIds.describe('Comma-separated list of nodes for which to retrieve the shutdown status').optional().meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'ShutdownGetNodeRequest' })
export type ShutdownGetNodeRequest = z.infer<typeof ShutdownGetNodeRequest>

export const ShutdownGetNodeResponse = z.object({
  nodes: z.array(ShutdownGetNodeNodeShutdownStatus)
}).meta({ id: 'ShutdownGetNodeResponse' })
export type ShutdownGetNodeResponse = z.infer<typeof ShutdownGetNodeResponse>

/**
 * Prepare a node to be shut down.
 *
 * NOTE: This feature is designed for indirect use by Elastic Cloud, Elastic Cloud Enterprise, and Elastic Cloud on Kubernetes. Direct use is not supported.
 *
 * If you specify a node that is offline, it will be prepared for shut down when it rejoins the cluster.
 *
 * If the operator privileges feature is enabled, you must be an operator to use this API.
 *
 * The API migrates ongoing tasks and index shards to other nodes as needed to prepare a node to be restarted or shut down and removed from the cluster.
 * This ensures that Elasticsearch can be stopped safely with minimal disruption to the cluster.
 *
 * You must specify the type of shutdown: `restart`, `remove`, or `replace`.
 * If a node is already being prepared for shutdown, you can use this API to change the shutdown type.
 *
 * IMPORTANT: This API does NOT terminate the Elasticsearch process.
 * Monitor the node shutdown status to determine when it is safe to stop Elasticsearch.
 */
export const ShutdownPutNodeRequest = z.object({
  ...RequestBase.shape,
  node_id: NodeId.describe('The node identifier. This parameter is not validated against the cluster\'s active nodes. This enables you to register a node for shut down while it is offline. No error is thrown if you specify an invalid node ID.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  type: ShutdownType.describe('Valid values are restart, remove, or replace. Use restart when you need to temporarily shut down a node to perform an upgrade, make configuration changes, or perform other maintenance. Because the node is expected to rejoin the cluster, data is not migrated off of the node. Use remove when you need to permanently remove a node from the cluster. The node is not marked ready for shutdown until data is migrated off of the node Use replace to do a 1:1 replacement of a node with another node. Certain allocation decisions will be ignored (such as disk watermarks) in the interest of true replacement of the source node with the target node. During a replace-type shutdown, rollover and index creation may result in unassigned shards, and shrink may fail until the replacement is complete.').meta({ found_in: 'body' }),
  reason: z.string().describe('A human-readable reason that the node is being shut down. This field provides information for other cluster operators; it does not affect the shut down process.').meta({ found_in: 'body' }),
  allocation_delay: z.string().describe('Only valid if type is restart. Controls how long Elasticsearch will wait for the node to restart and join the cluster before reassigning its shards to other nodes. This works the same as delaying allocation with the index.unassigned.node_left.delayed_timeout setting. If you don\'t specify a restart allocation delay, a default value of 5 minutes will be used. If both a restart allocation delay and an index-level allocation delay are configured, the longer of the two is used.').optional().meta({ found_in: 'body' }),
  target_node_name: z.string().describe('Only valid if type is replace. Specifies the name of the node that is replacing the node being shut down. Shards from the shut down node are only allowed to be allocated to the target node, and no other data will be allocated to the target node. During relocation of data certain allocation rules are ignored, such as disk watermarks or user attribute filtering rules.').optional().meta({ found_in: 'body' })
}).meta({ id: 'ShutdownPutNodeRequest' })
export type ShutdownPutNodeRequest = z.infer<typeof ShutdownPutNodeRequest>

export const ShutdownPutNodeResponse = AcknowledgedResponseBase.meta({ id: 'ShutdownPutNodeResponse' })
export type ShutdownPutNodeResponse = z.infer<typeof ShutdownPutNodeResponse>
