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

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Username = z.string().meta({ id: 'Username' })
export type Username = z.infer<typeof Username>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

/**
 * Invalidate a token.
 *
 * The access tokens returned by the get token API have a finite period of time for which they are valid.
 * After that time period, they can no longer be used.
 * The time period is defined by the `xpack.security.authc.token.timeout` setting.
 *
 * The refresh tokens returned by the get token API are only valid for 24 hours.
 * They can also be used exactly once.
 * If you want to invalidate one or more access or refresh tokens immediately, use this invalidate token API.
 *
 * NOTE: While all parameters are optional, at least one of them is required.
 * More specifically, either one of `token` or `refresh_token` parameters is required.
 * If none of these two are specified, then `realm_name` and/or `username` need to be specified.
 */
export const SecurityInvalidateTokenRequest = z.object({
  ...RequestBase.shape,
  token: z.string().describe('An access token. This parameter cannot be used if any of `refresh_token`, `realm_name`, or `username` are used.').optional().meta({ found_in: 'body' }),
  refresh_token: z.string().describe('A refresh token. This parameter cannot be used if any of `refresh_token`, `realm_name`, or `username` are used.').optional().meta({ found_in: 'body' }),
  realm_name: Name.describe('The name of an authentication realm. This parameter cannot be used with either `refresh_token` or `token`.').optional().meta({ found_in: 'body' }),
  username: Username.describe('The username of a user. This parameter cannot be used with either `refresh_token` or `token`.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityInvalidateTokenRequest' })
export type SecurityInvalidateTokenRequest = z.infer<typeof SecurityInvalidateTokenRequest>

export const SecurityInvalidateTokenResponse = z.object({
  error_count: long.describe('The number of errors that were encountered when invalidating the tokens.'),
  error_details: z.array(z.lazy(() => ErrorCause)).describe('Details about the errors. This field is not present in the response when `error_count` is `0`.').optional(),
  invalidated_tokens: long.describe('The number of the tokens that were invalidated as part of this request.'),
  previously_invalidated_tokens: long.describe('The number of tokens that were already invalidated.')
}).meta({ id: 'SecurityInvalidateTokenResponse' })
export type SecurityInvalidateTokenResponse = z.infer<typeof SecurityInvalidateTokenResponse>
