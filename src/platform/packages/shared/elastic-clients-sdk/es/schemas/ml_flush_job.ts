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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

/**
 * Force buffered data to be processed.
 *
 * The flush jobs API is only applicable when sending data for analysis using
 * the post data API. Depending on the content of the buffer, then it might
 * additionally calculate new results. Both flush and close operations are
 * similar, however the flush is more efficient if you are expecting to send
 * more data for analysis. When flushing, the job remains open and is available
 * to continue analyzing data. A close operation additionally prunes and
 * persists the model state to disk and the job must be opened again before
 * analyzing further data.
 * @deprecated Forcing any buffered data to be processed is deprecated, in a future major version a datafeed will be required.
 */
export const MlFlushJobRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  advance_time: DateTime.describe('Refer to the description for the `advance_time` query parameter.').optional().meta({ found_in: 'body' }),
  calc_interim: z.boolean().describe('Refer to the description for the `calc_interim` query parameter.').optional().meta({ found_in: 'body' }),
  end: DateTime.describe('Refer to the description for the `end` query parameter.').optional().meta({ found_in: 'body' }),
  skip_time: DateTime.describe('Refer to the description for the `skip_time` query parameter.').optional().meta({ found_in: 'body' }),
  start: DateTime.describe('Refer to the description for the `start` query parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlFlushJobRequest' })
export type MlFlushJobRequest = z.infer<typeof MlFlushJobRequest>

export const MlFlushJobResponse = z.object({
  flushed: z.boolean(),
  last_finalized_bucket_end: integer.describe('Provides the timestamp (in milliseconds since the epoch) of the end of the last bucket that was processed.').optional()
}).meta({ id: 'MlFlushJobResponse' })
export type MlFlushJobResponse = z.infer<typeof MlFlushJobResponse>
