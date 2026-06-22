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

export const Refresh = z.union([z.boolean(), z.enum(['true', 'false', 'wait_for'])]).meta({ id: 'Refresh' })
export type Refresh = z.infer<typeof Refresh>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Username = z.string().meta({ id: 'Username' })
export type Username = z.infer<typeof Username>

/**
 * Disable users.
 *
 * Disable users in the native realm.
 * By default, when you create users, they are enabled.
 * You can use this API to revoke a user's access to Elasticsearch.
 */
export const SecurityDisableUserRequest = z.object({
  ...RequestBase.shape,
  username: Username.describe('An identifier for the user.').meta({ found_in: 'path' }),
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityDisableUserRequest' })
export type SecurityDisableUserRequest = z.infer<typeof SecurityDisableUserRequest>

export const SecurityDisableUserResponse = z.object({
}).meta({ id: 'SecurityDisableUserResponse' })
export type SecurityDisableUserResponse = z.infer<typeof SecurityDisableUserResponse>
