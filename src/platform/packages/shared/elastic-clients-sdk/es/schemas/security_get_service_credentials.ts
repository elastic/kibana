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

export const Metadata = z.record(z.string(), z.any()).meta({ id: 'Metadata' })
export type Metadata = z.infer<typeof Metadata>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Namespace = z.string().meta({ id: 'Namespace' })
export type Namespace = z.infer<typeof Namespace>

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

export const SecurityGetServiceCredentialsNodesCredentialsFileToken = z.object({
  nodes: z.array(z.string())
}).meta({ id: 'SecurityGetServiceCredentialsNodesCredentialsFileToken' })
export type SecurityGetServiceCredentialsNodesCredentialsFileToken = z.infer<typeof SecurityGetServiceCredentialsNodesCredentialsFileToken>

export const SecurityGetServiceCredentialsNodesCredentials = z.object({
  _nodes: NodeStatistics.describe('General status showing how nodes respond to the above collection request'),
  file_tokens: z.record(z.string(), SecurityGetServiceCredentialsNodesCredentialsFileToken).describe('File-backed tokens collected from all nodes')
}).meta({ id: 'SecurityGetServiceCredentialsNodesCredentials' })
export type SecurityGetServiceCredentialsNodesCredentials = z.infer<typeof SecurityGetServiceCredentialsNodesCredentials>

/**
 * Get service account credentials.
 *
 * To use this API, you must have at least the `read_security` cluster privilege (or a greater privilege such as `manage_service_account` or `manage_security`).
 *
 * The response includes service account tokens that were created with the create service account tokens API as well as file-backed tokens from all nodes of the cluster.
 *
 * NOTE: For tokens backed by the `service_tokens` file, the API collects them from all nodes of the cluster.
 * Tokens with the same name from different nodes are assumed to be the same token and are only counted once towards the total number of service tokens.
 */
export const SecurityGetServiceCredentialsRequest = z.object({
  ...RequestBase.shape,
  namespace: Namespace.describe('The name of the namespace.').meta({ found_in: 'path' }),
  service: Name.describe('The service name.').meta({ found_in: 'path' })
}).meta({ id: 'SecurityGetServiceCredentialsRequest' })
export type SecurityGetServiceCredentialsRequest = z.infer<typeof SecurityGetServiceCredentialsRequest>

export const SecurityGetServiceCredentialsResponse = z.object({
  service_account: z.string(),
  count: integer,
  tokens: z.record(z.string(), Metadata),
  nodes_credentials: SecurityGetServiceCredentialsNodesCredentials.describe('Service account credentials collected from all nodes of the cluster.')
}).meta({ id: 'SecurityGetServiceCredentialsResponse' })
export type SecurityGetServiceCredentialsResponse = z.infer<typeof SecurityGetServiceCredentialsResponse>
