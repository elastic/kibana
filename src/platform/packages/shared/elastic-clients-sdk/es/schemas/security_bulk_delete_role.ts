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

export const Refresh = z.union([z.boolean(), z.enum(['true', 'false', 'wait_for'])]).meta({ id: 'Refresh' })
export type Refresh = z.infer<typeof Refresh>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const SecurityBulkError = z.object({
  count: integer.describe('The number of errors'),
  details: z.record(z.string(), z.lazy(() => ErrorCause)).describe('Details about the errors, keyed by role name')
}).meta({ id: 'SecurityBulkError' })
export type SecurityBulkError = z.infer<typeof SecurityBulkError>

/**
 * Bulk delete roles.
 *
 * The role management APIs are generally the preferred way to manage roles, rather than using file-based role management.
 * The bulk delete roles API cannot delete roles that are defined in roles files.
 */
export const SecurityBulkDeleteRoleRequest = z.object({
  ...RequestBase.shape,
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' }),
  names: z.array(z.string()).describe('An array of role names to delete').meta({ found_in: 'body' })
}).meta({ id: 'SecurityBulkDeleteRoleRequest' })
export type SecurityBulkDeleteRoleRequest = z.infer<typeof SecurityBulkDeleteRoleRequest>

export const SecurityBulkDeleteRoleResponse = z.object({
  deleted: z.array(z.string()).describe('Array of deleted roles').optional(),
  not_found: z.array(z.string()).describe('Array of roles that could not be found').optional(),
  errors: SecurityBulkError.describe('Present if any deletes resulted in errors').optional()
}).meta({ id: 'SecurityBulkDeleteRoleResponse' })
export type SecurityBulkDeleteRoleResponse = z.infer<typeof SecurityBulkDeleteRoleResponse>
