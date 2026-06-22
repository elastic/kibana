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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const VersionString = z.string().meta({ id: 'VersionString' })
export type VersionString = z.infer<typeof VersionString>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const CatCatTasksColumn = z.union([z.enum(['id', 'action', 'ac', 'task_id', 'ti', 'parent_task_id', 'pti', 'type', 'ty', 'start_time', 'start', 'timestamp', 'ts', 'hms', 'hhmmss', 'running_time_ns', 'time', 'running_time', 'time', 'node_id', 'ni', 'ip', 'i', 'port', 'po', 'node', 'n', 'version', 'v', 'x_opaque_id', 'x']), z.string()]).meta({ id: 'CatCatTasksColumn' })
export type CatCatTasksColumn = z.infer<typeof CatCatTasksColumn>

export const CatCatTasksColumns = z.union([CatCatTasksColumn, z.array(CatCatTasksColumn)]).meta({ id: 'CatCatTasksColumns' })
export type CatCatTasksColumns = z.infer<typeof CatCatTasksColumns>

/**
 * Get task information.
 *
 * Get information about tasks currently running in the cluster.
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the task management API.
 */
export const CatTasksRequest = z.object({
  ...CatCatRequestBase.shape,
  actions: z.array(z.string()).describe('The task action names, which are used to limit the response.').optional().meta({ found_in: 'query' }),
  detailed: z.boolean().describe('If `true`, the response includes detailed information about shard recoveries.').optional().meta({ found_in: 'query' }),
  nodes: z.array(z.string()).describe('Unique node identifiers, which are used to limit the response.').optional().meta({ found_in: 'query' }),
  parent_task_id: z.string().describe('The parent task identifier, which is used to limit the response.').optional().meta({ found_in: 'query' }),
  h: CatCatTasksColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  wait_for_completion: z.boolean().describe('If `true`, the request blocks until the task has completed.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatTasksRequest' })
export type CatTasksRequest = z.infer<typeof CatTasksRequest>

export const CatTasksTasksRecord = z.object({
  id: Id.describe('The identifier of the task with the node.').optional(),
  action: z.string().describe('The task action.').optional(),
  ac: z.string().describe('The task action.').optional(),
  task_id: Id.describe('The unique task identifier.').optional(),
  ti: Id.describe('The unique task identifier.').optional(),
  parent_task_id: z.string().describe('The parent task identifier.').optional(),
  pti: z.string().describe('The parent task identifier.').optional(),
  type: z.string().describe('The task type.').optional(),
  ty: z.string().describe('The task type.').optional(),
  start_time: z.string().describe('The start time in milliseconds.').optional(),
  start: z.string().describe('The start time in milliseconds.').optional(),
  timestamp: z.string().describe('The start time in `HH:MM:SS` format.').optional(),
  ts: z.string().describe('The start time in `HH:MM:SS` format.').optional(),
  hms: z.string().describe('The start time in `HH:MM:SS` format.').optional(),
  hhmmss: z.string().describe('The start time in `HH:MM:SS` format.').optional(),
  running_time_ns: z.string().describe('The running time in nanoseconds.').optional(),
  running_time: z.string().describe('The running time.').optional(),
  time: z.string().describe('The running time.').optional(),
  node_id: NodeId.describe('The unique node identifier.').optional(),
  ni: NodeId.describe('The unique node identifier.').optional(),
  ip: z.string().describe('The IP address for the node.').optional(),
  i: z.string().describe('The IP address for the node.').optional(),
  port: z.string().describe('The bound transport port for the node.').optional(),
  po: z.string().describe('The bound transport port for the node.').optional(),
  node: z.string().describe('The node name.').optional(),
  n: z.string().describe('The node name.').optional(),
  version: VersionString.describe('The Elasticsearch version.').optional(),
  v: VersionString.describe('The Elasticsearch version.').optional(),
  x_opaque_id: z.string().describe('The X-Opaque-ID header.').optional(),
  x: z.string().describe('The X-Opaque-ID header.').optional(),
  description: z.string().describe('The task action description.').optional(),
  desc: z.string().describe('The task action description.').optional()
}).meta({ id: 'CatTasksTasksRecord' })
export type CatTasksTasksRecord = z.infer<typeof CatTasksTasksRecord>

export const CatTasksResponse = z.array(CatTasksTasksRecord).meta({ id: 'CatTasksResponse' })
export type CatTasksResponse = z.infer<typeof CatTasksResponse>
