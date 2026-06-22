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

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const NodeIds = z.union([NodeId, z.array(NodeId)]).meta({ id: 'NodeIds' })
export type NodeIds = z.infer<typeof NodeIds>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const ThreadType = z.enum(['cpu', 'wait', 'block', 'gpu', 'mem']).meta({ id: 'ThreadType' })
export type ThreadType = z.infer<typeof ThreadType>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

/**
 * Get the hot threads for nodes.
 *
 * Get a breakdown of the hot threads on each selected node in the cluster.
 * The output is plain text with a breakdown of the top hot threads for each node.
 */
export const NodesHotThreadsRequest = z.object({
  ...RequestBase.shape,
  node_id: NodeIds.describe('List of node IDs or names used to limit returned information.').optional().meta({ found_in: 'path' }),
  ignore_idle_threads: z.boolean().describe('If true, known idle threads (e.g. waiting in a socket select, or to get a task from an empty queue) are filtered out.').optional().meta({ found_in: 'query' }),
  interval: Duration.describe('The interval to do the second sampling of threads.').optional().meta({ found_in: 'query' }),
  snapshots: long.describe('Number of samples of thread stacktrace.').optional().meta({ found_in: 'query' }),
  threads: long.describe('Specifies the number of hot threads to provide information for.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  type: ThreadType.describe('The type to sample.').optional().meta({ found_in: 'query' }),
  sort: ThreadType.describe('The sort order for \'cpu\' type').optional().meta({ found_in: 'query' })
}).meta({ id: 'NodesHotThreadsRequest' })
export type NodesHotThreadsRequest = z.infer<typeof NodesHotThreadsRequest>

export const NodesHotThreadsResponse = z.object({
}).meta({ id: 'NodesHotThreadsResponse' })
export type NodesHotThreadsResponse = z.infer<typeof NodesHotThreadsResponse>
