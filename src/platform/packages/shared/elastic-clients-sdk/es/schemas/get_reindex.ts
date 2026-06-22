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

export const TaskId = z.string().meta({ id: 'TaskId' })
export type TaskId = z.infer<typeof TaskId>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

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

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const float = z.number().meta({ id: 'float' })
export type float = z.infer<typeof float>

export const Retries = z.object({
  bulk: long.describe('The number of bulk actions retried.'),
  search: long.describe('The number of search actions retried.')
}).meta({ id: 'Retries' })
export type Retries = z.infer<typeof Retries>

export const ReindexStatus = z.object({
  slice_id: integer.describe('The slice ID').optional(),
  batches: long.describe('The number of scroll responses pulled back by the reindex.'),
  created: long.describe('The number of documents that were successfully created.').optional(),
  deleted: long.describe('The number of documents that were successfully deleted.'),
  noops: long.describe('The number of documents that were ignored because the script used for the reindex returned a `noop` value for `ctx.op`.'),
  requests_per_second: float.describe('The number of requests per second effectively executed during the reindex.'),
  retries: Retries.describe('The number of retries attempted by reindex. `bulk` is the number of bulk actions retried and `search` is the number of search actions retried.'),
  throttled: Duration.optional(),
  throttled_millis: DurationValue.describe('Number of milliseconds the request slept to conform to `requests_per_second`.'),
  throttled_until: Duration.optional(),
  throttled_until_millis: DurationValue.describe('This field should always be equal to zero in a `_reindex` response. It only has meaning when using the Task API, where it indicates the next time (in milliseconds since epoch) a throttled request will be executed again in order to conform to `requests_per_second`.'),
  total: long.describe('The number of documents that were successfully processed.'),
  updated: long.describe('The number of documents that were successfully updated, for example, a document with same ID already existed prior to reindex updating it.').optional(),
  version_conflicts: long.describe('The number of version conflicts that reindex hits.'),
  cancelled: z.string().describe('The reason for cancellation if the slice was canceled').optional()
}).meta({ id: 'ReindexStatus' })
export type ReindexStatus = z.infer<typeof ReindexStatus>

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

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const BulkIndexByScrollFailure = z.object({
  cause: z.lazy(() => ErrorCause),
  id: Id,
  index: IndexName,
  status: integer
}).meta({ id: 'BulkIndexByScrollFailure' })
export type BulkIndexByScrollFailure = z.infer<typeof BulkIndexByScrollFailure>

/**
 * The final result of a completed reindex operation, as stored in the task result.
 * This is the serialized form of `BulkByScrollResponse`.
 */
export const ReindexTaskResult = z.object({
  batches: long.describe('The number of scroll responses pulled back by the reindex.').optional(),
  created: long.describe('The number of documents that were successfully created.').optional(),
  deleted: long.describe('The number of documents that were successfully deleted.').optional(),
  failures: z.array(BulkIndexByScrollFailure).describe('Any failures encountered during the reindex. If non-empty, the reindex ended because of these failures.').optional(),
  noops: long.describe('The number of documents that were ignored because the script returned a `noop` value for `ctx.op`.').optional(),
  requests_per_second: float.describe('The number of requests per second effectively executed during the reindex.').optional(),
  retries: Retries.describe('The number of retries attempted by reindex.').optional(),
  throttled_millis: DurationValue.describe('Number of milliseconds the request slept to conform to `requests_per_second`.').optional(),
  throttled_until_millis: DurationValue.describe('This field should always be equal to zero in a completed reindex result.').optional(),
  timed_out: z.boolean().describe('Whether any of the requests executed during the reindex timed out.').optional(),
  took: DurationValue.describe('The total milliseconds the entire operation took.').optional(),
  total: long.describe('The number of documents that were successfully processed.').optional(),
  updated: long.describe('The number of documents that were successfully updated.').optional(),
  version_conflicts: long.describe('The number of version conflicts that occurred.').optional()
}).meta({ id: 'ReindexTaskResult' })
export type ReindexTaskResult = z.infer<typeof ReindexTaskResult>

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
