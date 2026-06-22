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

export const Ids = z.union([Id, z.array(Id)]).meta({ id: 'Ids' })
export type Ids = z.infer<typeof Ids>

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

export const SecurityClusterNode = z.object({
  name: Name
}).meta({ id: 'SecurityClusterNode' })
export type SecurityClusterNode = z.infer<typeof SecurityClusterNode>

/**
 * Clear the API key cache.
 *
 * Evict a subset of all entries from the API key cache.
 * The cache is also automatically cleared on state changes of the security index.
 */
export const SecurityClearApiKeyCacheRequest = z.object({
  ...RequestBase.shape,
  ids: Ids.describe('Comma-separated list of API key IDs to evict from the API key cache. To evict all API keys, use `*`. Does not support other wildcard patterns.').meta({ found_in: 'path' })
}).meta({ id: 'SecurityClearApiKeyCacheRequest' })
export type SecurityClearApiKeyCacheRequest = z.infer<typeof SecurityClearApiKeyCacheRequest>

export const SecurityClearApiKeyCacheResponse = z.object({
  node_stats: NodeStatistics,
  cluster_name: Name,
  nodes: z.record(z.string(), SecurityClusterNode)
}).meta({ id: 'SecurityClearApiKeyCacheResponse' })
export type SecurityClearApiKeyCacheResponse = z.infer<typeof SecurityClearApiKeyCacheResponse>
