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
 * Delete role mappings.
 *
 * Role mappings define which roles are assigned to each user.
 * The role mapping APIs are generally the preferred way to manage role mappings rather than using role mapping files.
 * The delete role mappings API cannot remove role mappings that are defined in role mapping files.
 */
export const SecurityDeleteRoleMappingRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The distinct name that identifies the role mapping. The name is used solely as an identifier to facilitate interaction via the API; it does not affect the behavior of the mapping in any way.').meta({ found_in: 'path' }),
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityDeleteRoleMappingRequest' })
export type SecurityDeleteRoleMappingRequest = z.infer<typeof SecurityDeleteRoleMappingRequest>

export const SecurityDeleteRoleMappingResponse = z.object({
  found: z.boolean().describe('If the mapping is successfully deleted, `found` is `true`. Otherwise, `found` is `false`.')
}).meta({ id: 'SecurityDeleteRoleMappingResponse' })
export type SecurityDeleteRoleMappingResponse = z.infer<typeof SecurityDeleteRoleMappingResponse>
