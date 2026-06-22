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

export const Password = z.string().meta({ id: 'Password' })
export type Password = z.infer<typeof Password>

export const Refresh = z.union([z.boolean(), z.enum(['true', 'false', 'wait_for'])]).meta({ id: 'Refresh' })
export type Refresh = z.infer<typeof Refresh>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Username = z.string().meta({ id: 'Username' })
export type Username = z.infer<typeof Username>

/**
 * Create or update users.
 *
 * Add and update users in the native realm.
 * A password is required for adding a new user but is optional when updating an existing user.
 * To change a user's password without updating any other fields, use the change password API.
 */
export const SecurityPutUserRequest = z.object({
  ...RequestBase.shape,
  username: Username.describe('An identifier for the user. NOTE: Usernames must be at least 1 and no more than 507 characters. They can contain alphanumeric characters (a-z, A-Z, 0-9), spaces, punctuation, and printable symbols in the Basic Latin (ASCII) block. Leading or trailing whitespace is not allowed.').meta({ found_in: 'path' }),
  refresh: Refresh.describe('Valid values are `true`, `false`, and `wait_for`. These values have the same meaning as in the index API, but the default value for this API is true.').optional().meta({ found_in: 'query' }),
  email: z.union([z.string(), z.null()]).describe('The email of the user.').optional().meta({ found_in: 'body' }),
  full_name: z.union([z.string(), z.null()]).describe('The full name of the user.').optional().meta({ found_in: 'body' }),
  metadata: Metadata.describe('Arbitrary metadata that you want to associate with the user.').optional().meta({ found_in: 'body' }),
  password: Password.describe('The user\'s password. Passwords must be at least 6 characters long. When adding a user, one of `password` or `password_hash` is required. When updating an existing user, the password is optional, so that other fields on the user (such as their roles) may be updated without modifying the user\'s password').optional().meta({ found_in: 'body' }),
  password_hash: z.string().describe('A hash of the user\'s password. This must be produced using the same hashing algorithm as has been configured for password storage. For more details, see the explanation of the `xpack.security.authc.password_hashing.algorithm` setting in the user cache and password hash algorithm documentation. Using this parameter allows the client to pre-hash the password for performance and/or confidentiality reasons. The `password` parameter and the `password_hash` parameter cannot be used in the same request.').optional().meta({ found_in: 'body' }),
  roles: z.array(z.string()).describe('A set of roles the user has. The roles determine the user\'s access permissions. To create a user without any roles, specify an empty list (`[]`).').optional().meta({ found_in: 'body' }),
  enabled: z.boolean().describe('Specifies whether the user is enabled.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityPutUserRequest' })
export type SecurityPutUserRequest = z.infer<typeof SecurityPutUserRequest>

export const SecurityPutUserResponse = z.object({
  created: z.boolean().describe('A successful call returns a JSON structure that shows whether the user has been created or updated. When an existing user is updated, `created` is set to `false`.')
}).meta({ id: 'SecurityPutUserResponse' })
export type SecurityPutUserResponse = z.infer<typeof SecurityPutUserResponse>
