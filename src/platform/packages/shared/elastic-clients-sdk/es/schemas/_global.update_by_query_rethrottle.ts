/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { SpecUtilsBaseNode } from './_spec_utils'
import { Id, RequestBase, TaskId, float } from './_types'
import { TasksTaskInfo } from './tasks'

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

export const UpdateByQueryRethrottleUpdateByQueryRethrottleNode = z.object({
  ...SpecUtilsBaseNode.shape,
  tasks: z.record(TaskId, TasksTaskInfo)
}).meta({ id: 'UpdateByQueryRethrottleUpdateByQueryRethrottleNode' })
export type UpdateByQueryRethrottleUpdateByQueryRethrottleNode = z.infer<typeof UpdateByQueryRethrottleUpdateByQueryRethrottleNode>

export const UpdateByQueryRethrottleResponse = z.object({
  nodes: z.record(z.string(), UpdateByQueryRethrottleUpdateByQueryRethrottleNode)
}).meta({ id: 'UpdateByQueryRethrottleResponse' })
export type UpdateByQueryRethrottleResponse = z.infer<typeof UpdateByQueryRethrottleResponse>
