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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const float = z.number().meta({ id: 'float' })
export type float = z.infer<typeof float>

/**
 * Throttle an update by query operation.
 *
 * Change the number of requests per second for a particular update by query operation.
 * Rethrottling that speeds up the query takes effect immediately but rethrotting that slows down the query takes effect after completing the current batch to prevent scroll timeouts.
 */
export const UpdateByQueryRethrottleRequest = z.object({
  ...RequestBase.shape,
  task_id: Id.describe('The ID for the task.').meta({ found_in: 'path' }),
  requests_per_second: float.describe('The throttle for this request in sub-requests per second. To turn off throttling, set it to `-1`.').meta({ found_in: 'query' })
}).meta({ id: 'UpdateByQueryRethrottleRequest' })
export type UpdateByQueryRethrottleRequest = z.infer<typeof UpdateByQueryRethrottleRequest>

export const Host = z.string().meta({ id: 'Host' })
export type Host = z.infer<typeof Host>

export const Ip = z.string().meta({ id: 'Ip' })
export type Ip = z.infer<typeof Ip>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const NodeRole = z.enum(['master', 'data', 'data_cold', 'data_content', 'data_frozen', 'data_hot', 'data_warm', 'client', 'ingest', 'ml', 'voting_only', 'transform', 'remote_cluster_client', 'coordinating_only']).meta({ id: 'NodeRole' })
export type NodeRole = z.infer<typeof NodeRole>

export const NodeRoles = z.array(NodeRole).meta({ id: 'NodeRoles' })
export type NodeRoles = z.infer<typeof NodeRoles>

export const TransportAddress = z.string().meta({ id: 'TransportAddress' })
export type TransportAddress = z.infer<typeof TransportAddress>

export const SpecUtilsBaseNode = z.object({
  attributes: z.record(z.string(), z.string()),
  host: Host,
  ip: Ip,
  name: Name,
  roles: NodeRoles.optional(),
  transport_address: TransportAddress
}).meta({ id: 'SpecUtilsBaseNode' })
export type SpecUtilsBaseNode = z.infer<typeof SpecUtilsBaseNode>

export const TaskId = z.string().meta({ id: 'TaskId' })
export type TaskId = z.infer<typeof TaskId>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

export const TasksTaskInfo = z.object({
  action: z.string(),
  cancelled: z.boolean().optional(),
  cancellable: z.boolean(),
  description: z.string().describe('Human readable text that identifies the particular request that the task is performing. For example, it might identify the search request being performed by a search task. Other kinds of tasks have different descriptions, like `_reindex` which has the source and the destination, or `_bulk` which just has the number of requests and the destination indices. Many requests will have only an empty description because more detailed information about the request is not easily available or particularly helpful in identifying the request.').optional(),
  headers: z.record(z.string(), z.string()),
  id: long,
  node: NodeId,
  running_time: Duration.optional(),
  running_time_in_nanos: DurationValue,
  start_time_in_millis: EpochTime,
  status: z.any().describe('The internal status of the task, which varies from task to task. The format also varies. While the goal is to keep the status for a particular task consistent from version to version, this is not always possible because sometimes the implementation changes. Fields might be removed from the status for a particular request so any parsing you do of the status might break in minor releases.').optional(),
  type: z.string(),
  parent_task_id: TaskId.optional()
}).meta({ id: 'TasksTaskInfo' })
export type TasksTaskInfo = z.infer<typeof TasksTaskInfo>

export const UpdateByQueryRethrottleUpdateByQueryRethrottleNode = z.object({
  ...SpecUtilsBaseNode.shape,
  tasks: z.record(TaskId, TasksTaskInfo)
}).meta({ id: 'UpdateByQueryRethrottleUpdateByQueryRethrottleNode' })
export type UpdateByQueryRethrottleUpdateByQueryRethrottleNode = z.infer<typeof UpdateByQueryRethrottleUpdateByQueryRethrottleNode>

export const UpdateByQueryRethrottleResponse = z.object({
  nodes: z.record(z.string(), UpdateByQueryRethrottleUpdateByQueryRethrottleNode)
}).meta({ id: 'UpdateByQueryRethrottleResponse' })
export type UpdateByQueryRethrottleResponse = z.infer<typeof UpdateByQueryRethrottleResponse>
