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

export const SecurityGrantType = z.enum(['password', 'access_token']).meta({ id: 'SecurityGrantType' })
export type SecurityGrantType = z.infer<typeof SecurityGrantType>

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

/**
 * Activate a user profile.
 *
 * Create or update a user profile on behalf of another user.
 *
 * NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions.
 * Individual users and external applications should not call this API directly.
 * The calling application must have either an `access_token` or a combination of `username` and `password` for the user that the profile document is intended for.
 * Elastic reserves the right to change or remove this feature in future releases without prior notice.
 *
 * This API creates or updates a profile document for end users with information that is extracted from the user's authentication object including `username`, `full_name,` `roles`, and the authentication realm.
 * For example, in the JWT `access_token` case, the profile user's `username` is extracted from the JWT token claim pointed to by the `claims.principal` setting of the JWT realm that authenticated the token.
 *
 * When updating a profile document, the API enables the document if it was disabled.
 * Any updates do not change existing content for either the `labels` or `data` fields.
 */
export const SecurityActivateUserProfileRequest = z.object({
  ...RequestBase.shape,
  access_token: z.string().describe('The user\'s Elasticsearch access token or JWT. Both `access` and `id` JWT token types are supported and they depend on the underlying JWT realm configuration. If you specify the `access_token` grant type, this parameter is required. It is not valid with other grant types.').optional().meta({ found_in: 'body' }),
  grant_type: SecurityGrantType.describe('The type of grant.').meta({ found_in: 'body' }),
  password: z.string().describe('The user\'s password. If you specify the `password` grant type, this parameter is required. It is not valid with other grant types.').optional().meta({ found_in: 'body' }),
  username: z.string().describe('The username that identifies the user. If you specify the `password` grant type, this parameter is required. It is not valid with other grant types.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityActivateUserProfileRequest' })
export type SecurityActivateUserProfileRequest = z.infer<typeof SecurityActivateUserProfileRequest>

export const SecurityActivateUserProfileResponse = SecurityUserProfileWithMetadata.meta({ id: 'SecurityActivateUserProfileResponse' })
export type SecurityActivateUserProfileResponse = z.infer<typeof SecurityActivateUserProfileResponse>
