/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { Duration, DurationValue, EpochTime, ErrorCause, ReindexStatus, ReindexTaskResult, RequestBase, TaskId } from './_types'

/**
 * Cancel a reindex task.
 *
 * Cancel an ongoing reindex task. If `wait_for_completion` is `true` (the default),
 * the response contains the final task state after cancellation.
 * If `wait_for_completion` is `false`, the response contains only `acknowledged: true`.
 */
export const CancelReindexRequest = z.object({
  ...RequestBase.shape,
  task_id: TaskId.describe('The ID of the reindex task to cancel.').meta({ found_in: 'path' }),
  wait_for_completion: z.boolean().describe('If `true` (the default), the request blocks until the cancellation is complete and returns the final task state. If `false`, the request returns immediately with `acknowledged: true`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CancelReindexRequest' })
export type CancelReindexRequest = z.infer<typeof CancelReindexRequest>

export const CancelReindexResponse = z.object({
  acknowledged: z.boolean().describe('Present and `true` when `wait_for_completion=false`.').optional(),
  completed: z.boolean().describe('Whether the reindex task has completed. Present when `wait_for_completion=true`.').optional(),
  id: TaskId.describe('The ID of the reindex task, in `nodeId:taskNum` format. Present when `wait_for_completion=true`.').optional(),
  description: z.string().describe('A sanitized description of the reindex operation.').optional(),
  start_time_in_millis: EpochTime.describe('The time at which the reindex task started, in milliseconds since the Unix epoch.').optional(),
  start_time: z.string().describe('The time at which the reindex task started, as an ISO 8601 formatted string.').optional(),
  running_time: Duration.describe('The elapsed running time of the reindex task, in a human-readable format. Only present when the request includes the `?human=true` query parameter.').optional(),
  running_time_in_nanos: DurationValue.describe('The elapsed running time of the reindex task, in nanoseconds.').optional(),
  cancelled: z.boolean().describe('Whether the reindex task has been cancelled.').optional(),
  status: ReindexStatus.describe('The status of the reindex operation at the time of cancellation.').optional(),
  error: z.lazy(() => ErrorCause).describe('The error that caused the reindex task to fail, if any.').optional(),
  response: ReindexTaskResult.describe('The final result of the reindex operation, if it completed before being cancelled.').optional()
}).meta({ id: 'CancelReindexResponse' })
export type CancelReindexResponse = z.infer<typeof CancelReindexResponse>
