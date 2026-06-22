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

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const SqlColumn = z.object({
  name: Name,
  type: z.string()
}).meta({ id: 'SqlColumn' })
export type SqlColumn = z.infer<typeof SqlColumn>

export const SqlRow = z.array(z.any()).meta({ id: 'SqlRow' })
export type SqlRow = z.infer<typeof SqlRow>

/**
 * Get async SQL search results.
 *
 * Get the current status and available results for an async SQL search or stored synchronous SQL search.
 *
 * If the Elasticsearch security features are enabled, only the user who first submitted the SQL search can retrieve the search using this API.
 */
export const SqlGetAsyncRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The identifier for the search.').meta({ found_in: 'path' }),
  delimiter: z.string().describe('The separator for CSV results. The API supports this parameter only for CSV responses.').optional().meta({ found_in: 'query' }),
  format: z.string().describe('The format for the response. You must specify a format using this parameter or the `Accept` HTTP header. If you specify both, the API uses this parameter.').optional().meta({ found_in: 'query' }),
  keep_alive: Duration.describe('The retention period for the search and its results. It defaults to the `keep_alive` period for the original SQL search.').optional().meta({ found_in: 'query' }),
  wait_for_completion_timeout: Duration.describe('The period to wait for complete results. It defaults to no timeout, meaning the request waits for complete search results.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SqlGetAsyncRequest' })
export type SqlGetAsyncRequest = z.infer<typeof SqlGetAsyncRequest>

export const SqlGetAsyncResponse = z.object({
  id: Id.describe('Identifier for the search. This value is returned only for async and saved synchronous searches. For CSV, TSV, and TXT responses, this value is returned in the `Async-ID` HTTP header.'),
  is_running: z.boolean().describe('If `true`, the search is still running. If `false`, the search has finished. This value is returned only for async and saved synchronous searches. For CSV, TSV, and TXT responses, this value is returned in the `Async-partial` HTTP header.'),
  is_partial: z.boolean().describe('If `true`, the response does not contain complete search results. If `is_partial` is `true` and `is_running` is `true`, the search is still running. If `is_partial` is `true` but `is_running` is `false`, the results are partial due to a failure or timeout. This value is returned only for async and saved synchronous searches. For CSV, TSV, and TXT responses, this value is returned in the `Async-partial` HTTP header.'),
  columns: z.array(SqlColumn).describe('Column headings for the search results. Each object is a column.').optional(),
  cursor: z.string().describe('The cursor for the next set of paginated results. For CSV, TSV, and TXT responses, this value is returned in the `Cursor` HTTP header.').optional(),
  rows: z.array(SqlRow).describe('The values for the search results.')
}).meta({ id: 'SqlGetAsyncResponse' })
export type SqlGetAsyncResponse = z.infer<typeof SqlGetAsyncResponse>
