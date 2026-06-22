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

/**
 * List active reindex tasks.
 *
 * Get information about all currently running reindex tasks.
 */
export const ListReindexRequest = z.object({
  ...RequestBase.shape,
  detailed: z.boolean().describe('If `true`, include detailed task status information in the response.').optional().meta({ found_in: 'query' })
}).meta({ id: 'ListReindexRequest' })
export type ListReindexRequest = z.infer<typeof ListReindexRequest>

export const TaskId = z.string().meta({ id: 'TaskId' })
export type TaskId = z.infer<typeof TaskId>

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

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

/** Information about a single reindex task, as returned by the reindex management APIs. */
export const ReindexTaskInfo = z.object({
  id: TaskId.describe('The ID of the reindex task, in `nodeId:taskNum` format.'),
  description: z.string().describe('A sanitized description of the reindex operation (source and destination indices, and optionally remote host info).').optional(),
  start_time_in_millis: EpochTime.describe('The time at which the reindex task started, in milliseconds since the Unix epoch.'),
  start_time: z.string().describe('The time at which the reindex task started, as an ISO 8601 formatted string. Only present when the request includes the `?human=true` query parameter.').optional(),
  running_time: Duration.describe('The elapsed running time of the reindex task, in a human-readable format. Only present when the request includes the `?human=true` query parameter.').optional(),
  running_time_in_nanos: DurationValue.describe('The elapsed running time of the reindex task, in nanoseconds.'),
  cancelled: z.boolean().describe('Whether the reindex task has been cancelled.'),
  status: ReindexStatus.describe('The current progress of the reindex operation.').optional()
}).meta({ id: 'ReindexTaskInfo' })
export type ReindexTaskInfo = z.infer<typeof ReindexTaskInfo>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

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

export const TaskFailure = z.object({
  task_id: long,
  node_id: NodeId,
  status: z.string(),
  reason: z.lazy(() => ErrorCause)
}).meta({ id: 'TaskFailure' })
export type TaskFailure = z.infer<typeof TaskFailure>

export const ListReindexResponse = z.object({
  reindex: z.array(ReindexTaskInfo).describe('The list of currently running reindex tasks.'),
  task_failures: z.array(TaskFailure).describe('Task-level failures that occurred while listing reindex tasks.').optional(),
  node_failures: z.array(z.lazy(() => ErrorCause)).describe('Node-level failures that occurred while listing reindex tasks.').optional()
}).meta({ id: 'ListReindexResponse' })
export type ListReindexResponse = z.infer<typeof ListReindexResponse>
