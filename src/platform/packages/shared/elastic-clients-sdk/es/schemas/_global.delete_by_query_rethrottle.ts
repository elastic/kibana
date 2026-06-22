/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { RequestBase, TaskId, float } from './_types'
import { TasksTaskListResponseBase } from './tasks'

/**
 * Throttle a delete by query operation.
 *
 * Change the number of requests per second for a particular delete by query operation.
 * Rethrottling that speeds up the query takes effect immediately but rethrotting that slows down the query takes effect after completing the current batch to prevent scroll timeouts.
 */
export const DeleteByQueryRethrottleRequest = z.object({
  ...RequestBase.shape,
  task_id: TaskId.describe('The ID for the task.').meta({ found_in: 'path' }),
  requests_per_second: float.describe('The throttle for this request in sub-requests per second. To disable throttling, set it to `-1`.').meta({ found_in: 'query' })
}).meta({ id: 'DeleteByQueryRethrottleRequest' })
export type DeleteByQueryRethrottleRequest = z.infer<typeof DeleteByQueryRethrottleRequest>

export const DeleteByQueryRethrottleResponse = TasksTaskListResponseBase.meta({ id: 'DeleteByQueryRethrottleResponse' })
export type DeleteByQueryRethrottleResponse = z.infer<typeof DeleteByQueryRethrottleResponse>
