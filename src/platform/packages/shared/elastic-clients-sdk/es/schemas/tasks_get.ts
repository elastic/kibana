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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const TaskId = z.string().meta({ id: 'TaskId' })
export type TaskId = z.infer<typeof TaskId>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

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

/**
 * Get task information.
 *
 * Get information about a task currently running in the cluster.
 *
 * WARNING: The task management API is new and should still be considered a beta feature.
 * The API may change in ways that are not backwards compatible.
 *
 * If the task identifier is not found, a 404 response code indicates that there are no resources that match the request.
 */
export const TasksGetRequest = z.object({
  ...RequestBase.shape,
  task_id: Id.describe('The task identifier.').meta({ found_in: 'path' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  wait_for_completion: z.boolean().describe('If `true`, the request blocks until the task has completed.').optional().meta({ found_in: 'query' })
}).meta({ id: 'TasksGetRequest' })
export type TasksGetRequest = z.infer<typeof TasksGetRequest>

export const TasksGetResponse = z.object({
  completed: z.boolean(),
  task: TasksTaskInfo,
  response: z.any().optional(),
  error: z.lazy(() => ErrorCause).optional()
}).meta({ id: 'TasksGetResponse' })
export type TasksGetResponse = z.infer<typeof TasksGetResponse>
