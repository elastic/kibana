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

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const ShutdownType = z.enum(['restart', 'remove', 'replace']).meta({ id: 'ShutdownType' })
export type ShutdownType = z.infer<typeof ShutdownType>

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
