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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const CapabilitiesFailedNodeException = z.object({
  node_id: Id
}).meta({ id: 'CapabilitiesFailedNodeException' })
export type CapabilitiesFailedNodeException = z.infer<typeof CapabilitiesFailedNodeException>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const CapabilitiesRestMethod = z.enum(['GET', 'HEAD', 'POST', 'PUT', 'DELETE']).meta({ id: 'CapabilitiesRestMethod' })
export type CapabilitiesRestMethod = z.infer<typeof CapabilitiesRestMethod>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

/** Checks if the specified combination of method, API, parameters, and arbitrary capabilities are supported. */
export const CapabilitiesRequest = z.object({
  ...RequestBase.shape,
  method: CapabilitiesRestMethod.describe('REST method to check').optional().meta({ found_in: 'query' }),
  path: z.string().describe('API path to check').optional().meta({ found_in: 'query' }),
  parameters: z.union([z.string(), z.array(z.string())]).describe('Comma-separated list of API parameters to check').optional().meta({ found_in: 'query' }),
  capabilities: z.union([z.string(), z.array(z.string())]).describe('Comma-separated list of arbitrary API capabilities to check').optional().meta({ found_in: 'query' }),
  local_only: z.boolean().describe('True if only the node being called should be considered').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CapabilitiesRequest' })
export type CapabilitiesRequest = z.infer<typeof CapabilitiesRequest>

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

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const CapabilitiesResponse = z.object({
  _nodes: NodeStatistics,
  cluster_name: Name,
  supported: z.union([z.boolean(), z.null()]),
  failures: z.array(CapabilitiesFailedNodeException).optional()
}).meta({ id: 'CapabilitiesResponse' })
export type CapabilitiesResponse = z.infer<typeof CapabilitiesResponse>
