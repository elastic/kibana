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

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const float = z.number().meta({ id: 'float' })
export type float = z.infer<typeof float>

export const Retries = z.object({
  bulk: long.describe('The number of bulk actions retried.'),
  search: long.describe('The number of search actions retried.')
}).meta({ id: 'Retries' })
export type Retries = z.infer<typeof Retries>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

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

export const HttpHeaders = z.record(z.string(), z.union([z.string(), z.array(z.string())])).meta({ id: 'HttpHeaders' })
export type HttpHeaders = z.infer<typeof HttpHeaders>

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

export const Host = z.string().meta({ id: 'Host' })
export type Host = z.infer<typeof Host>

export const Ip = z.string().meta({ id: 'Ip' })
export type Ip = z.infer<typeof Ip>

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

export const ReindexRethrottleReindexNode = z.object({
  ...SpecUtilsBaseNode.shape,
  tasks: z.record(TaskId, ReindexRethrottleReindexTask)
}).meta({ id: 'ReindexRethrottleReindexNode' })
export type ReindexRethrottleReindexNode = z.infer<typeof ReindexRethrottleReindexNode>

export const ReindexRethrottleReindexTasks = z.union([z.array(ReindexRethrottleReindexTask), z.record(z.string(), ReindexRethrottleParentReindexTask)]).meta({ id: 'ReindexRethrottleReindexTasks' })
export type ReindexRethrottleReindexTasks = z.infer<typeof ReindexRethrottleReindexTasks>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

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

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const TaskFailure = z.object({
  task_id: long,
  node_id: NodeId,
  status: z.string(),
  reason: z.lazy(() => ErrorCause)
}).meta({ id: 'TaskFailure' })
export type TaskFailure = z.infer<typeof TaskFailure>

export const ReindexRethrottleResponse = z.object({
  node_failures: z.array(z.lazy(() => ErrorCause)).optional(),
  task_failures: z.array(TaskFailure).optional(),
  nodes: z.record(z.string(), ReindexRethrottleReindexNode).optional(),
  tasks: ReindexRethrottleReindexTasks.optional()
}).meta({ id: 'ReindexRethrottleResponse' })
export type ReindexRethrottleResponse = z.infer<typeof ReindexRethrottleResponse>
