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

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

/**
 * Send data to an anomaly detection job for analysis.
 *
 * IMPORTANT: For each job, data can be accepted from only a single connection at a time.
 * It is not currently possible to post data to multiple jobs using wildcards or a comma-separated list.
 * @deprecated Posting data directly to anomaly detection jobs is deprecated, in a future major version a datafeed will be required.
 */
export const MlPostDataRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job. The job must have a state of open to receive and process the data.').meta({ found_in: 'path' }),
  reset_end: DateTime.describe('Specifies the end of the bucket resetting range.').optional().meta({ found_in: 'query' }),
  reset_start: DateTime.describe('Specifies the start of the bucket resetting range.').optional().meta({ found_in: 'query' }),
  data: z.array(z.any()).meta({ found_in: 'body' })
}).meta({ id: 'MlPostDataRequest' })
export type MlPostDataRequest = z.infer<typeof MlPostDataRequest>

export const MlPostDataResponse = z.object({
  job_id: Id,
  processed_record_count: long,
  processed_field_count: long,
  input_bytes: long,
  input_field_count: long,
  invalid_date_count: long,
  missing_field_count: long,
  out_of_order_timestamp_count: long,
  empty_bucket_count: long,
  sparse_bucket_count: long,
  bucket_count: long,
  earliest_record_timestamp: EpochTime.optional(),
  latest_record_timestamp: EpochTime.optional(),
  last_data_time: EpochTime.optional(),
  latest_empty_bucket_timestamp: EpochTime.optional(),
  latest_sparse_bucket_timestamp: EpochTime.optional(),
  input_record_count: long,
  log_time: EpochTime.optional()
}).meta({ id: 'MlPostDataResponse' })
export type MlPostDataResponse = z.infer<typeof MlPostDataResponse>
