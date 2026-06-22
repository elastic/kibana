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

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

/**
 * A date and time, either as a string whose format can depend on the context (defaulting to ISO 8601), or a
 * number of milliseconds since the Epoch. Elasticsearch accepts both as input, but will generally output a string
 * representation.
 */
export const DateTime = z.union([z.string(), EpochTime]).meta({ id: 'DateTime' })
export type DateTime = z.infer<typeof DateTime>

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

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

/** Contains statistics about the number of nodes selected by the request. */
export const NodeStatistics = z.object({
  failures: z.array(z.lazy(() => ErrorCause)).optional(),
  total: integer.describe('Total number of nodes selected by the request.'),
  successful: integer.describe('Number of nodes that responded successfully to the request.'),
  failed: integer.describe('Number of nodes that rejected the request or failed to respond. If this value is not 0, a reason for the rejection or failure is included in the response.')
}).meta({ id: 'NodeStatistics' })
export type NodeStatistics = z.infer<typeof NodeStatistics>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const WatcherExecutionPhase = z.enum(['awaits_execution', 'started', 'input', 'condition', 'actions', 'watch_transform', 'aborted', 'finished']).meta({ id: 'WatcherExecutionPhase' })
export type WatcherExecutionPhase = z.infer<typeof WatcherExecutionPhase>

export const WatcherExecutionThreadPool = z.object({
  max_size: long.describe('The largest size of the execution thread pool, which indicates the largest number of concurrent running watches.'),
  queue_size: long.describe('The number of watches that were triggered and are currently queued.')
}).meta({ id: 'WatcherExecutionThreadPool' })
export type WatcherExecutionThreadPool = z.infer<typeof WatcherExecutionThreadPool>

export const WatcherStatsWatcherMetric = z.enum(['_all', 'all', 'queued_watches', 'current_watches', 'pending_watches']).meta({ id: 'WatcherStatsWatcherMetric' })
export type WatcherStatsWatcherMetric = z.infer<typeof WatcherStatsWatcherMetric>

/**
 * Get Watcher statistics.
 *
 * This API always returns basic metrics.
 * You retrieve more metrics by using the metric parameter.
 */
export const WatcherStatsRequest = z.object({
  ...RequestBase.shape,
  metric: z.union([WatcherStatsWatcherMetric, z.array(WatcherStatsWatcherMetric)]).describe('Defines which additional metrics are included in the response.').optional().meta({ found_in: 'path' }),
  emit_stacktraces: z.boolean().describe('Defines whether stack traces are generated for each watch that is running.').optional().meta({ found_in: 'query' })
}).meta({ id: 'WatcherStatsRequest' })
export type WatcherStatsRequest = z.infer<typeof WatcherStatsRequest>

export const WatcherStatsWatchRecordQueuedStats = z.object({
  execution_time: DateTime.describe('The time the watch was run. This is just before the input is being run.')
}).meta({ id: 'WatcherStatsWatchRecordQueuedStats' })
export type WatcherStatsWatchRecordQueuedStats = z.infer<typeof WatcherStatsWatchRecordQueuedStats>

export const WatcherStatsWatchRecordStats = z.object({
  ...WatcherStatsWatchRecordQueuedStats.shape,
  execution_phase: WatcherExecutionPhase.describe('The current watch execution phase.'),
  triggered_time: DateTime.describe('The time the watch was triggered by the trigger engine.'),
  executed_actions: z.array(z.string()).optional(),
  watch_id: Id,
  watch_record_id: Id.describe('The watch record identifier.')
}).meta({ id: 'WatcherStatsWatchRecordStats' })
export type WatcherStatsWatchRecordStats = z.infer<typeof WatcherStatsWatchRecordStats>

export const WatcherStatsWatcherState = z.enum(['stopped', 'starting', 'started', 'stopping']).meta({ id: 'WatcherStatsWatcherState' })
export type WatcherStatsWatcherState = z.infer<typeof WatcherStatsWatcherState>

export const WatcherStatsWatcherNodeStats = z.object({
  current_watches: z.array(WatcherStatsWatchRecordStats).describe('The current executing watches metric gives insight into the watches that are currently being executed by Watcher. Additional information is shared per watch that is currently executing. This information includes the `watch_id`, the time its execution started and its current execution phase. To include this metric, the `metric` option should be set to `current_watches` or `_all`. In addition you can also specify the `emit_stacktraces=true` parameter, which adds stack traces for each watch that is being run. These stack traces can give you more insight into an execution of a watch.').optional(),
  execution_thread_pool: WatcherExecutionThreadPool,
  queued_watches: z.array(WatcherStatsWatchRecordQueuedStats).describe('Watcher moderates the execution of watches such that their execution won\'t put too much pressure on the node and its resources. If too many watches trigger concurrently and there isn\'t enough capacity to run them all, some of the watches are queued, waiting for the current running watches to finish.s The queued watches metric gives insight on these queued watches. To include this metric, the `metric` option should include `queued_watches` or `_all`.').optional(),
  watch_count: long.describe('The number of watches currently registered.'),
  watcher_state: WatcherStatsWatcherState.describe('The current state of Watcher.'),
  node_id: Id
}).meta({ id: 'WatcherStatsWatcherNodeStats' })
export type WatcherStatsWatcherNodeStats = z.infer<typeof WatcherStatsWatcherNodeStats>

export const WatcherStatsResponse = z.object({
  node_stats: NodeStatistics,
  cluster_name: Name,
  manually_stopped: z.boolean(),
  stats: z.array(WatcherStatsWatcherNodeStats)
}).meta({ id: 'WatcherStatsResponse' })
export type WatcherStatsResponse = z.infer<typeof WatcherStatsResponse>
