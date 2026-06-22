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

export const RelationName = z.string().meta({ id: 'RelationName' })
export type RelationName = z.infer<typeof RelationName>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Username = z.string().meta({ id: 'Username' })
export type Username = z.infer<typeof Username>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

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

export const SecuritySuggestUserProfilesHint = z.object({
  uids: z.array(SecurityUserProfileId).describe('A list of profile UIDs to match against.').optional(),
  labels: z.record(z.string(), z.union([z.string(), z.array(z.string())])).describe('A single key-value pair to match against the labels section of a profile. A profile is considered matching if it matches at least one of the strings.').optional()
}).meta({ id: 'SecuritySuggestUserProfilesHint' })
export type SecuritySuggestUserProfilesHint = z.infer<typeof SecuritySuggestUserProfilesHint>

/**
 * Suggest a user profile.
 *
 * Get suggestions for user profiles that match specified search criteria.
 *
 * NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions.
 * Individual users and external applications should not call this API directly.
 * Elastic reserves the right to change or remove this feature in future releases without prior notice.
 */
export const SecuritySuggestUserProfilesRequest = z.object({
  ...RequestBase.shape,
  name: z.string().describe('A query string used to match name-related fields in user profile documents. Name-related fields are the user\'s `username`, `full_name`, and `email`.').optional().meta({ found_in: 'body' }),
  size: long.describe('The number of profiles to return.').optional().meta({ found_in: 'body' }),
  data: z.union([z.string(), z.array(z.string())]).describe('A comma-separated list of filters for the `data` field of the profile document. To return all content use `data=*`. To return a subset of content, use `data=<key>` to retrieve content nested under the specified `<key>`. By default, the API returns no `data` content. It is an error to specify `data` as both the query parameter and the request body field.').optional().meta({ found_in: 'body' }),
  hint: SecuritySuggestUserProfilesHint.describe('Extra search criteria to improve relevance of the suggestion result. Profiles matching the spcified hint are ranked higher in the response. Profiles not matching the hint aren\'t excluded from the response as long as the profile matches the `name` field query.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecuritySuggestUserProfilesRequest' })
export type SecuritySuggestUserProfilesRequest = z.infer<typeof SecuritySuggestUserProfilesRequest>

export const SecuritySuggestUserProfilesTotalUserProfiles = z.object({
  value: long,
  relation: RelationName
}).meta({ id: 'SecuritySuggestUserProfilesTotalUserProfiles' })
export type SecuritySuggestUserProfilesTotalUserProfiles = z.infer<typeof SecuritySuggestUserProfilesTotalUserProfiles>

export const SecuritySuggestUserProfilesResponse = z.object({
  total: SecuritySuggestUserProfilesTotalUserProfiles.describe('Metadata about the number of matching profiles.'),
  took: long.describe('The number of milliseconds it took Elasticsearch to run the request.'),
  profiles: z.array(SecurityUserProfile).describe('A list of profile documents, ordered by relevance, that match the search criteria.')
}).meta({ id: 'SecuritySuggestUserProfilesResponse' })
export type SecuritySuggestUserProfilesResponse = z.infer<typeof SecuritySuggestUserProfilesResponse>
