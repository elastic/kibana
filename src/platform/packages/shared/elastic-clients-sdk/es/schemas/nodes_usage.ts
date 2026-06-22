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

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

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

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const NodeIds = z.union([NodeId, z.array(NodeId)]).meta({ id: 'NodeIds' })
export type NodeIds = z.infer<typeof NodeIds>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

/** Contains statistics about the number of nodes selected by the request. */
export const NodeStatistics = z.object({
  failures: z.array(z.lazy(() => ErrorCause)).optional(),
  total: integer.describe('Total number of nodes selected by the request.'),
  successful: integer.describe('Number of nodes that responded successfully to the request.'),
  failed: integer.describe('Number of nodes that rejected the request or failed to respond. If this value is not 0, a reason for the rejection or failure is included in the response.')
}).meta({ id: 'NodeStatistics' })
export type NodeStatistics = z.infer<typeof NodeStatistics>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const NodesNodesResponseBase = z.object({
  node_stats: NodeStatistics.describe('Contains statistics about the number of nodes selected by the request’s node filters.').optional()
}).meta({ id: 'NodesNodesResponseBase' })
export type NodesNodesResponseBase = z.infer<typeof NodesNodesResponseBase>

export const NodesUsageNodeUsage = z.object({
  rest_actions: z.record(z.string(), integer).describe('The total number of times each REST endpoint has been called on this node since the last restart.  Note that the REST endpoint names are not considered stable.'),
  since: EpochTime.describe('The timestamp for when the collection of these statistics started.'),
  timestamp: EpochTime.describe('The timestamp for when these statistics were collected.'),
  aggregations: z.record(z.string(), z.any()).describe('The total number of times search aggregations have been called on this node since the last restart.')
}).meta({ id: 'NodesUsageNodeUsage' })
export type NodesUsageNodeUsage = z.infer<typeof NodesUsageNodeUsage>

export const NodesUsageNodesUsageMetric = z.enum(['_all', 'rest_actions', 'aggregations']).meta({ id: 'NodesUsageNodesUsageMetric' })
export type NodesUsageNodesUsageMetric = z.infer<typeof NodesUsageNodesUsageMetric>

export const NodesUsageNodesUsageMetrics = z.union([NodesUsageNodesUsageMetric, z.array(NodesUsageNodesUsageMetric)]).meta({ id: 'NodesUsageNodesUsageMetrics' })
export type NodesUsageNodesUsageMetrics = z.infer<typeof NodesUsageNodesUsageMetrics>

/** Get feature usage information. */
export const NodesUsageRequest = z.object({
  ...RequestBase.shape,
  node_id: NodeIds.describe('A comma-separated list of node IDs or names to limit the returned information. Use `_local` to return information from the node you\'re connecting to, leave empty to get information from all nodes.').optional().meta({ found_in: 'path' }),
  metric: NodesUsageNodesUsageMetrics.describe('Limits the information returned to the specific metrics. A comma-separated list of the following options: `_all`, `rest_actions`, `aggregations`.').optional().meta({ found_in: 'path' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'NodesUsageRequest' })
export type NodesUsageRequest = z.infer<typeof NodesUsageRequest>

export const NodesUsageResponseBase = z.object({
  ...NodesNodesResponseBase.shape,
  cluster_name: Name,
  nodes: z.record(z.string(), NodesUsageNodeUsage)
}).meta({ id: 'NodesUsageResponseBase' })
export type NodesUsageResponseBase = z.infer<typeof NodesUsageResponseBase>

export const NodesUsageResponse = NodesUsageResponseBase.meta({ id: 'NodesUsageResponse' })
export type NodesUsageResponse = z.infer<typeof NodesUsageResponse>
