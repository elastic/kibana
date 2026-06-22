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

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const CatCatThreadPoolColumn = z.union([z.enum(['active', 'a', 'completed', 'c', 'core', 'cr', 'ephemeral_id', 'eid', 'host', 'h', 'ip', 'i', 'keep_alive', 'k', 'largest', 'l', 'max', 'mx', 'name', 'node_id', 'id', 'node_name', 'pid', 'p', 'pool_size', 'psz', 'port', 'po', 'queue', 'q', 'queue_size', 'qs', 'rejected', 'r', 'size', 'sz', 'type', 't']), z.string()]).meta({ id: 'CatCatThreadPoolColumn' })
export type CatCatThreadPoolColumn = z.infer<typeof CatCatThreadPoolColumn>

export const CatCatThreadPoolColumns = z.union([CatCatThreadPoolColumn, z.array(CatCatThreadPoolColumn)]).meta({ id: 'CatCatThreadPoolColumns' })
export type CatCatThreadPoolColumns = z.infer<typeof CatCatThreadPoolColumns>

/**
 * Get thread pool statistics.
 *
 * Get thread pool statistics for each node in a cluster.
 * Returned information includes all built-in thread pools and custom thread pools.
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes info API.
 */
export const CatThreadPoolRequest = z.object({
  ...CatCatRequestBase.shape,
  thread_pool_patterns: Names.describe('A comma-separated list of thread pool names used to limit the request. Accepts wildcard expressions.').optional().meta({ found_in: 'path' }),
  h: CatCatThreadPoolColumns.describe('List of columns to appear in the response. Supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('A comma-separated list of column names or aliases that determines the sort order. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request computes the list of selected nodes from the local cluster state. If `false` the list of selected nodes are computed from the cluster state of the master node. In both cases the coordinating node will send requests for further information to each selected node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatThreadPoolRequest' })
export type CatThreadPoolRequest = z.infer<typeof CatThreadPoolRequest>

export const CatThreadPoolThreadPoolRecord = z.object({
  node_name: z.string().describe('The node name.').optional(),
  nn: z.string().describe('The node name.').optional(),
  node_id: NodeId.describe('The persistent node identifier.').optional(),
  id: NodeId.describe('The persistent node identifier.').optional(),
  ephemeral_node_id: z.string().describe('The ephemeral node identifier.').optional(),
  eid: z.string().describe('The ephemeral node identifier.').optional(),
  pid: z.string().describe('The process identifier.').optional(),
  p: z.string().describe('The process identifier.').optional(),
  host: z.string().describe('The host name for the current node.').optional(),
  h: z.string().describe('The host name for the current node.').optional(),
  ip: z.string().describe('The IP address for the current node.').optional(),
  i: z.string().describe('The IP address for the current node.').optional(),
  port: z.string().describe('The bound transport port for the current node.').optional(),
  po: z.string().describe('The bound transport port for the current node.').optional(),
  name: z.string().describe('The thread pool name.').optional(),
  n: z.string().describe('The thread pool name.').optional(),
  type: z.string().describe('The thread pool type. Returned values include `fixed`, `fixed_auto_queue_size`, `direct`, and `scaling`.').optional(),
  t: z.string().describe('The thread pool type. Returned values include `fixed`, `fixed_auto_queue_size`, `direct`, and `scaling`.').optional(),
  active: z.string().describe('The number of active threads in the current thread pool.').optional(),
  a: z.string().describe('The number of active threads in the current thread pool.').optional(),
  pool_size: z.string().describe('The number of threads in the current thread pool.').optional(),
  psz: z.string().describe('The number of threads in the current thread pool.').optional(),
  queue: z.string().describe('The number of tasks currently in queue.').optional(),
  q: z.string().describe('The number of tasks currently in queue.').optional(),
  queue_size: z.string().describe('The maximum number of tasks permitted in the queue.').optional(),
  qs: z.string().describe('The maximum number of tasks permitted in the queue.').optional(),
  rejected: z.string().describe('The number of rejected tasks.').optional(),
  r: z.string().describe('The number of rejected tasks.').optional(),
  largest: z.string().describe('The highest number of active threads in the current thread pool.').optional(),
  l: z.string().describe('The highest number of active threads in the current thread pool.').optional(),
  completed: z.string().describe('The number of completed tasks.').optional(),
  c: z.string().describe('The number of completed tasks.').optional(),
  core: z.union([z.string(), z.null()]).describe('The core number of active threads allowed in a scaling thread pool.').optional(),
  cr: z.union([z.string(), z.null()]).describe('The core number of active threads allowed in a scaling thread pool.').optional(),
  max: z.union([z.string(), z.null()]).describe('The maximum number of active threads allowed in a scaling thread pool.').optional(),
  mx: z.union([z.string(), z.null()]).describe('The maximum number of active threads allowed in a scaling thread pool.').optional(),
  size: z.union([z.string(), z.null()]).describe('The number of active threads allowed in a fixed thread pool.').optional(),
  sz: z.union([z.string(), z.null()]).describe('The number of active threads allowed in a fixed thread pool.').optional(),
  keep_alive: z.union([z.string(), z.null()]).describe('The thread keep alive time.').optional(),
  ka: z.union([z.string(), z.null()]).describe('The thread keep alive time.').optional()
}).meta({ id: 'CatThreadPoolThreadPoolRecord' })
export type CatThreadPoolThreadPoolRecord = z.infer<typeof CatThreadPoolThreadPoolRecord>

export const CatThreadPoolResponse = z.array(CatThreadPoolThreadPoolRecord).meta({ id: 'CatThreadPoolResponse' })
export type CatThreadPoolResponse = z.infer<typeof CatThreadPoolResponse>
