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

export const ExpandWildcard = z.enum(['all', 'open', 'closed', 'hidden', 'none']).meta({ id: 'ExpandWildcard' })
export type ExpandWildcard = z.infer<typeof ExpandWildcard>

export const ExpandWildcards = z.union([ExpandWildcard, z.array(ExpandWildcard)]).meta({ id: 'ExpandWildcards' })
export type ExpandWildcards = z.infer<typeof ExpandWildcards>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const IndicesIndicesBlockOptions = z.enum(['metadata', 'read', 'read_only', 'write']).meta({ id: 'IndicesIndicesBlockOptions' })
export type IndicesIndicesBlockOptions = z.infer<typeof IndicesIndicesBlockOptions>

export const IndicesRemoveBlockRemoveIndicesBlockStatus = z.object({
  name: IndexName,
  unblocked: z.boolean().optional(),
  exception: z.lazy(() => ErrorCause).optional()
}).meta({ id: 'IndicesRemoveBlockRemoveIndicesBlockStatus' })
export type IndicesRemoveBlockRemoveIndicesBlockStatus = z.infer<typeof IndicesRemoveBlockRemoveIndicesBlockStatus>

/**
 * Remove an index block.
 *
 * Remove an index block from an index.
 * Index blocks limit the operations allowed on an index by blocking specific operation types.
 */
export const IndicesRemoveBlockRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-separated list or wildcard expression of index names used to limit the request. By default, you must explicitly name the indices you are removing blocks from. To allow the removal of blocks from indices with `_all`, `*`, or other wildcard expressions, change the `action.destructive_requires_name` setting to `false`. You can update this setting in the `elasticsearch.yml` file or by using the cluster update settings API.').meta({ found_in: 'path' }),
  block: IndicesIndicesBlockOptions.describe('The block type to remove from the index.').meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('The type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. It supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for the master node. If the master node is not available before the timeout expires, the request fails and returns an error. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response from all relevant nodes in the cluster after updating the cluster metadata. If no response is received before the timeout expires, the cluster metadata update still applies but the response will indicate that it was not completely acknowledged. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesRemoveBlockRequest' })
export type IndicesRemoveBlockRequest = z.infer<typeof IndicesRemoveBlockRequest>

export const IndicesRemoveBlockResponse = z.object({
  acknowledged: z.boolean(),
  indices: z.array(IndicesRemoveBlockRemoveIndicesBlockStatus)
}).meta({ id: 'IndicesRemoveBlockResponse' })
export type IndicesRemoveBlockResponse = z.infer<typeof IndicesRemoveBlockResponse>
