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
 * Delete users.
 *
 * Delete users from the native realm.
 */
export const SecurityDeleteUserRequest = z.object({
  ...RequestBase.shape,
  username: Username.describe('An identifier for the user.').meta({ found_in: 'path' }),
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityDeleteUserRequest' })
export type SecurityDeleteUserRequest = z.infer<typeof SecurityDeleteUserRequest>

export const SecurityDeleteUserResponse = z.object({
  found: z.boolean().describe('If the user is successfully deleted, the request returns `{"found": true}`. Otherwise, `found` is set to `false`.')
}).meta({ id: 'SecurityDeleteUserResponse' })
export type SecurityDeleteUserResponse = z.infer<typeof SecurityDeleteUserResponse>
