/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { Duration, DurationValue, EpochTime, ErrorCause, ReindexStatus, ReindexTaskResult, RequestBase, TaskId } from './_types'

/**
 * Get a reindex task.
 *
 * Get the status and progress of a specific reindex task.
 */
export const GetReindexRequest = z.object({
  ...RequestBase.shape,
  task_id: TaskId.describe('The ID of the reindex task to retrieve.').meta({ found_in: 'path' }),
  wait_for_completion: z.boolean().describe('If `true`, the request blocks until the reindex task completes, then returns the result.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for the reindex task to complete when `wait_for_completion` is `true`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'GetReindexRequest' })
export type GetReindexRequest = z.infer<typeof GetReindexRequest>

export const GetReindexResponse = z.object({
  completed: z.boolean().describe('Whether the reindex task has completed.'),
  id: TaskId.describe('The ID of the reindex task, in `nodeId:taskNum` format.'),
  description: z.string().describe('A sanitized description of the reindex operation (source and destination indices, and optionally remote host info).').optional(),
  start_time_in_millis: EpochTime.describe('The time at which the reindex task started, in milliseconds since the Unix epoch.'),
  start_time: z.string().describe('The time at which the reindex task started, as an ISO 8601 formatted string. Only present when the request includes the `?human=true` query parameter.').optional(),
  running_time: Duration.describe('The elapsed running time of the reindex task, in a human-readable format. Only present when the request includes the `?human=true` query parameter.').optional(),
  running_time_in_nanos: DurationValue.describe('The elapsed running time of the reindex task, in nanoseconds.'),
  cancelled: z.boolean().describe('Whether the reindex task has been cancelled.'),
  status: ReindexStatus.describe('The current progress of the reindex operation.').optional(),
  error: z.lazy(() => ErrorCause).describe('The error that caused the reindex task to fail, if any.').optional(),
  response: ReindexTaskResult.describe('The final result of the completed reindex operation, if the task has finished successfully.').optional()
}).meta({ id: 'GetReindexResponse' })
export type GetReindexResponse = z.infer<typeof GetReindexResponse>
