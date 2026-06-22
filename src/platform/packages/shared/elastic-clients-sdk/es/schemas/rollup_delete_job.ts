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

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const TaskFailure = z.object({
  task_id: long,
  node_id: NodeId,
  status: z.string(),
  reason: z.lazy(() => ErrorCause)
}).meta({ id: 'TaskFailure' })
export type TaskFailure = z.infer<typeof TaskFailure>

/**
 * Delete a rollup job.
 *
 * A job must be stopped before it can be deleted.
 * If you attempt to delete a started job, an error occurs.
 * Similarly, if you attempt to delete a nonexistent job, an exception occurs.
 *
 * IMPORTANT: When you delete a job, you remove only the process that is actively monitoring and rolling up data.
 * The API does not delete any previously rolled up data.
 * This is by design; a user may wish to roll up a static data set.
 * Because the data set is static, after it has been fully rolled up there is no need to keep the indexing rollup job around (as there will be no new data).
 * Thus the job can be deleted, leaving behind the rolled up data for analysis.
 * If you wish to also remove the rollup data and the rollup index contains the data for only a single job, you can delete the whole rollup index.
 * If the rollup index stores data from several jobs, you must issue a delete-by-query that targets the rollup job's identifier in the rollup index. For example:
 *
 * ```
 * POST my_rollup_index/_delete_by_query
 * {
 *   "query": {
 *     "term": {
 *       "_rollup.id": "the_rollup_job_id"
 *     }
 *   }
 * }
 * ```
 * @deprecated
 */
export const RollupDeleteJobRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the job.').meta({ found_in: 'path' })
}).meta({ id: 'RollupDeleteJobRequest' })
export type RollupDeleteJobRequest = z.infer<typeof RollupDeleteJobRequest>

export const RollupDeleteJobResponse = z.object({
  acknowledged: z.boolean(),
  task_failures: z.array(TaskFailure).optional()
}).meta({ id: 'RollupDeleteJobResponse' })
export type RollupDeleteJobResponse = z.infer<typeof RollupDeleteJobResponse>
