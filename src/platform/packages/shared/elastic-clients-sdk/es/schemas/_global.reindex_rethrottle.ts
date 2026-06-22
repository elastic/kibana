/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { SpecUtilsBaseNode } from './_spec_utils'
import { DurationValue, EpochTime, ErrorCause, HttpHeaders, Id, Name, ReindexStatus, RequestBase, TaskFailure, TaskId, float, long } from './_types'

export const ReindexRethrottleReindexTask = z.object({
  action: z.string(),
  cancellable: z.boolean(),
  cancelled: z.boolean(),
  description: z.string(),
  id: long,
  node: Name,
  running_time_in_nanos: DurationValue,
  start_time_in_millis: EpochTime,
  status: ReindexStatus,
  type: z.string(),
  headers: HttpHeaders
}).meta({ id: 'ReindexRethrottleReindexTask' })
export type ReindexRethrottleReindexTask = z.infer<typeof ReindexRethrottleReindexTask>

export const ReindexRethrottleParentReindexTask = z.object({
  ...ReindexRethrottleReindexTask.shape,
  children: z.array(ReindexRethrottleReindexTask).optional()
}).meta({ id: 'ReindexRethrottleParentReindexTask' })
export type ReindexRethrottleParentReindexTask = z.infer<typeof ReindexRethrottleParentReindexTask>

export const ReindexRethrottleReindexNode = z.object({
  ...SpecUtilsBaseNode.shape,
  tasks: z.record(TaskId, ReindexRethrottleReindexTask)
}).meta({ id: 'ReindexRethrottleReindexNode' })
export type ReindexRethrottleReindexNode = z.infer<typeof ReindexRethrottleReindexNode>

export const ReindexRethrottleReindexTasks = z.union([z.array(ReindexRethrottleReindexTask), z.record(z.string(), ReindexRethrottleParentReindexTask)]).meta({ id: 'ReindexRethrottleReindexTasks' })
export type ReindexRethrottleReindexTasks = z.infer<typeof ReindexRethrottleReindexTasks>

/**
 * Throttle a reindex operation.
 *
 * Change the number of requests per second for a particular reindex operation.
 * For example:
 *
 * ```
 * POST _reindex/r1A2WoRbTwKZ516z6NEs5A:36619/_rethrottle?requests_per_second=-1
 * ```
 *
 * Rethrottling that speeds up the query takes effect immediately.
 * Rethrottling that slows down the query will take effect after completing the current batch.
 * This behavior prevents scroll timeouts.
 */
export const ReindexRethrottleRequest = z.object({
  ...RequestBase.shape,
  task_id: Id.describe('The task identifier, which can be found by using the tasks API.').meta({ found_in: 'path' }),
  requests_per_second: float.describe('The throttle for this request in sub-requests per second. It can be either `-1` to turn off throttling or any decimal number like `1.7` or `12` to throttle to that level.').meta({ found_in: 'query' })
}).meta({ id: 'ReindexRethrottleRequest' })
export type ReindexRethrottleRequest = z.infer<typeof ReindexRethrottleRequest>

export const ReindexRethrottleResponse = z.object({
  node_failures: z.array(z.lazy(() => ErrorCause)).optional(),
  task_failures: z.array(TaskFailure).optional(),
  nodes: z.record(z.string(), ReindexRethrottleReindexNode).optional(),
  tasks: ReindexRethrottleReindexTasks.optional()
}).meta({ id: 'ReindexRethrottleResponse' })
export type ReindexRethrottleResponse = z.infer<typeof ReindexRethrottleResponse>
