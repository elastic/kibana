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

export const Metadata = z.record(z.string(), z.any()).meta({ id: 'Metadata' })
export type Metadata = z.infer<typeof Metadata>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Username = z.string().meta({ id: 'Username' })
export type Username = z.infer<typeof Username>

export const SecurityUserProfileId = z.string().meta({ id: 'SecurityUserProfileId' })
export type SecurityUserProfileId = z.infer<typeof SecurityUserProfileId>

export const SecurityUser = z.object({
  email: z.union([z.string(), z.null()]).optional(),
  full_name: z.union([Name, z.null()]).optional(),
  metadata: Metadata,
  roles: z.array(z.string()),
  username: Username,
  enabled: z.boolean(),
  profile_uid: SecurityUserProfileId.optional()
}).meta({ id: 'SecurityUser' })
export type SecurityUser = z.infer<typeof SecurityUser>

/**
 * Get users.
 *
 * Get information about users in the native realm and built-in users.
 */
export const SecurityGetUserRequest = z.object({
  ...RequestBase.shape,
  username: z.union([Username, z.array(Username)]).describe('An identifier for the user. You can specify multiple usernames as a comma-separated list. If you omit this parameter, the API retrieves information about all users.').optional().meta({ found_in: 'path' }),
  with_profile_uid: z.boolean().describe('Determines whether to retrieve the user profile UID, if it exists, for the users.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityGetUserRequest' })
export type SecurityGetUserRequest = z.infer<typeof SecurityGetUserRequest>

export const SecurityGetUserResponse = z.record(z.string(), SecurityUser).meta({ id: 'SecurityGetUserResponse' })
export type SecurityGetUserResponse = z.infer<typeof SecurityGetUserResponse>
