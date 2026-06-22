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

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const SequenceNumber = long.meta({ id: 'SequenceNumber' })
export type SequenceNumber = z.infer<typeof SequenceNumber>

export const Username = z.string().meta({ id: 'Username' })
export type Username = z.infer<typeof Username>

export const SecurityUserProfileId = z.string().meta({ id: 'SecurityUserProfileId' })
export type SecurityUserProfileId = z.infer<typeof SecurityUserProfileId>

export const SecurityUserProfileUser = z.object({
  email: z.union([z.string(), z.null()]).optional(),
  full_name: z.union([Name, z.null()]).optional(),
  realm_name: Name,
  realm_domain: Name.optional(),
  roles: z.array(z.string()),
  username: Username
}).meta({ id: 'SecurityUserProfileUser' })
export type SecurityUserProfileUser = z.infer<typeof SecurityUserProfileUser>

export const SecurityUserProfile = z.object({
  uid: SecurityUserProfileId,
  user: SecurityUserProfileUser,
  data: z.record(z.string(), z.any()),
  labels: z.record(z.string(), z.any()),
  enabled: z.boolean().optional()
}).meta({ id: 'SecurityUserProfile' })
export type SecurityUserProfile = z.infer<typeof SecurityUserProfile>

export const SecurityUserProfileHitMetadata = z.object({
  _primary_term: long,
  _seq_no: SequenceNumber
}).meta({ id: 'SecurityUserProfileHitMetadata' })
export type SecurityUserProfileHitMetadata = z.infer<typeof SecurityUserProfileHitMetadata>

export const SecurityUserProfileWithMetadata = z.object({
  ...SecurityUserProfile.shape,
  last_synchronized: long,
  _doc: SecurityUserProfileHitMetadata
}).meta({ id: 'SecurityUserProfileWithMetadata' })
export type SecurityUserProfileWithMetadata = z.infer<typeof SecurityUserProfileWithMetadata>

export const SecurityGetUserProfileGetUserProfileErrors = z.object({
  count: long,
  details: z.record(SecurityUserProfileId, z.lazy(() => ErrorCause))
}).meta({ id: 'SecurityGetUserProfileGetUserProfileErrors' })
export type SecurityGetUserProfileGetUserProfileErrors = z.infer<typeof SecurityGetUserProfileGetUserProfileErrors>

/**
 * Get a user profile.
 *
 * Get a user's profile using the unique profile ID.
 *
 * NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions.
 * Individual users and external applications should not call this API directly.
 * Elastic reserves the right to change or remove this feature in future releases without prior notice.
 */
export const SecurityGetUserProfileRequest = z.object({
  ...RequestBase.shape,
  uid: z.union([SecurityUserProfileId, z.array(SecurityUserProfileId)]).describe('A unique identifier for the user profile.').meta({ found_in: 'path' }),
  data: z.union([z.string(), z.array(z.string())]).describe('A comma-separated list of filters for the `data` field of the profile document. To return all content use `data=*`. To return a subset of content use `data=<key>` to retrieve content nested under the specified `<key>`. By default returns no `data` content.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityGetUserProfileRequest' })
export type SecurityGetUserProfileRequest = z.infer<typeof SecurityGetUserProfileRequest>

export const SecurityGetUserProfileResponse = z.object({
  profiles: z.array(SecurityUserProfileWithMetadata).describe('A successful call returns the JSON representation of the user profile and its internal versioning numbers. The API returns an empty object if no profile document is found for the provided `uid`. The content of the data field is not returned by default to avoid deserializing a potential large payload.'),
  errors: SecurityGetUserProfileGetUserProfileErrors.optional()
}).meta({ id: 'SecurityGetUserProfileResponse' })
export type SecurityGetUserProfileResponse = z.infer<typeof SecurityGetUserProfileResponse>
