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

export const Refresh = z.union([z.boolean(), z.enum(['true', 'false', 'wait_for'])]).meta({ id: 'Refresh' })
export type Refresh = z.infer<typeof Refresh>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Delete roles.
 *
 * Delete roles in the native realm.
 * The role management APIs are generally the preferred way to manage roles, rather than using file-based role management.
 * The delete roles API cannot remove roles that are defined in roles files.
 */
export const SecurityDeleteRoleRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the role.').meta({ found_in: 'path' }),
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityDeleteRoleRequest' })
export type SecurityDeleteRoleRequest = z.infer<typeof SecurityDeleteRoleRequest>

export const SecurityDeleteRoleResponse = z.object({
  found: z.boolean().describe('If the role is successfully deleted, `found` is `true`. Otherwise, `found` is `false`.')
}).meta({ id: 'SecurityDeleteRoleResponse' })
export type SecurityDeleteRoleResponse = z.infer<typeof SecurityDeleteRoleResponse>
