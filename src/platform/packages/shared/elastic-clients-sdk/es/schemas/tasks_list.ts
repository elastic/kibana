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

export const Host = z.string().meta({ id: 'Host' })
export type Host = z.infer<typeof Host>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const Ip = z.string().meta({ id: 'Ip' })
export type Ip = z.infer<typeof Ip>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const NodeIds = z.union([NodeId, z.array(NodeId)]).meta({ id: 'NodeIds' })
export type NodeIds = z.infer<typeof NodeIds>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const TaskFailure = z.object({
  task_id: long,
  node_id: NodeId,
  status: z.string(),
  reason: z.lazy(() => ErrorCause)
}).meta({ id: 'TaskFailure' })
export type TaskFailure = z.infer<typeof TaskFailure>

export const TaskId = z.string().meta({ id: 'TaskId' })
export type TaskId = z.infer<typeof TaskId>

export const TransportAddress = z.string().meta({ id: 'TransportAddress' })
export type TransportAddress = z.infer<typeof TransportAddress>

export const TasksGroupBy = z.enum(['nodes', 'parents', 'none']).meta({ id: 'TasksGroupBy' })
export type TasksGroupBy = z.infer<typeof TasksGroupBy>

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

export const TasksNodeTasks = z.object({
  name: NodeId.optional(),
  transport_address: TransportAddress.optional(),
  host: Host.optional(),
  ip: Ip.optional(),
  roles: z.array(z.string()).optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  tasks: z.record(TaskId, TasksTaskInfo)
}).meta({ id: 'TasksNodeTasks' })
export type TasksNodeTasks = z.infer<typeof TasksNodeTasks>

export const TasksParentTaskInfo = z.object({
  ...TasksTaskInfo.shape,
  children: z.array(TasksTaskInfo).optional()
}).meta({ id: 'TasksParentTaskInfo' })
export type TasksParentTaskInfo = z.infer<typeof TasksParentTaskInfo>

export const TasksTaskInfos = z.union([z.array(TasksTaskInfo), z.record(z.string(), TasksParentTaskInfo)]).meta({ id: 'TasksTaskInfos' })
export type TasksTaskInfos = z.infer<typeof TasksTaskInfos>

export const TasksTaskListResponseBase = z.object({
  node_failures: z.array(z.lazy(() => ErrorCause)).optional(),
  task_failures: z.array(TaskFailure).optional(),
  nodes: z.record(z.string(), TasksNodeTasks).describe('Task information grouped by node, if `group_by` was set to `node` (the default).').optional(),
  tasks: TasksTaskInfos.describe('Either a flat list of tasks if `group_by` was set to `none`, or grouped by parents if `group_by` was set to `parents`.').optional()
}).meta({ id: 'TasksTaskListResponseBase' })
export type TasksTaskListResponseBase = z.infer<typeof TasksTaskListResponseBase>

/**
 * Get all tasks.
 *
 * Get information about the tasks currently running on one or more nodes in the cluster.
 *
 * WARNING: The task management API is new and should still be considered a beta feature.
 * The API may change in ways that are not backwards compatible.
 *
 * **Identifying running tasks**
 *
 * The `X-Opaque-Id header`, when provided on the HTTP request header, is going to be returned as a header in the response as well as in the headers field for in the task information.
 * This enables you to track certain calls or associate certain tasks with the client that started them.
 * For example:
 *
 * ```
 * curl -i -H "X-Opaque-Id: 123456" "http://localhost:9200/_tasks?group_by=parents"
 * ```
 *
 * The API returns the following result:
 *
 * ```
 * HTTP/1.1 200 OK
 * X-Opaque-Id: 123456
 * content-type: application/json; charset=UTF-8
 * content-length: 831
 *
 * {
 *   "tasks" : {
 *     "u5lcZHqcQhu-rUoFaqDphA:45" : {
 *       "node" : "u5lcZHqcQhu-rUoFaqDphA",
 *       "id" : 45,
 *       "type" : "transport",
 *       "action" : "cluster:monitor/tasks/lists",
 *       "start_time_in_millis" : 1513823752749,
 *       "running_time_in_nanos" : 293139,
 *       "cancellable" : false,
 *       "headers" : {
 *         "X-Opaque-Id" : "123456"
 *       },
 *       "children" : [
 *         {
 *           "node" : "u5lcZHqcQhu-rUoFaqDphA",
 *           "id" : 46,
 *           "type" : "direct",
 *           "action" : "cluster:monitor/tasks/lists[n]",
 *           "start_time_in_millis" : 1513823752750,
 *           "running_time_in_nanos" : 92133,
 *           "cancellable" : false,
 *           "parent_task_id" : "u5lcZHqcQhu-rUoFaqDphA:45",
 *           "headers" : {
 *             "X-Opaque-Id" : "123456"
 *           }
 *         }
 *       ]
 *     }
 *   }
 *  }
 * ```
 * In this example, `X-Opaque-Id: 123456` is the ID as a part of the response header.
 * The `X-Opaque-Id` in the task `headers` is the ID for the task that was initiated by the REST request.
 * The `X-Opaque-Id` in the children `headers` is the child task of the task that was initiated by the REST request.
 */
export const TasksListRequest = z.object({
  ...RequestBase.shape,
  actions: z.union([z.string(), z.array(z.string())]).describe('A comma-separated list or wildcard expression of actions used to limit the request. For example, you can use `cluser:*` to retrieve all cluster-related tasks.').optional().meta({ found_in: 'query' }),
  detailed: z.boolean().describe('If `true`, the response includes detailed information about the running tasks. This information is useful to distinguish tasks from each other but is more costly to run.').optional().meta({ found_in: 'query' }),
  group_by: TasksGroupBy.describe('A key that is used to group tasks in the response. The task lists can be grouped either by nodes or by parent tasks.').optional().meta({ found_in: 'query' }),
  nodes: NodeIds.describe('A comma-separated list of node IDs or names that is used to limit the returned information.').optional().meta({ found_in: 'query' }),
  parent_task_id: Id.describe('A parent task identifier that is used to limit returned information. To return all tasks, omit this parameter or use a value of `-1`. If the parent task is not found, the API does not return a 404 response code.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for each node to respond. If a node does not respond before its timeout expires, the response does not include its information. However, timed out nodes are included in the `node_failures` property.').optional().meta({ found_in: 'query' }),
  wait_for_completion: z.boolean().describe('If `true`, the request blocks until the operation is complete.').optional().meta({ found_in: 'query' })
}).meta({ id: 'TasksListRequest' })
export type TasksListRequest = z.infer<typeof TasksListRequest>

export const TasksListResponse = TasksTaskListResponseBase.meta({ id: 'TasksListResponse' })
export type TasksListResponse = z.infer<typeof TasksListResponse>
