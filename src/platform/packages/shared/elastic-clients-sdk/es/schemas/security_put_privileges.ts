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

export const Refresh = z.union([z.boolean(), z.enum(['true', 'false', 'wait_for'])]).meta({ id: 'Refresh' })
export type Refresh = z.infer<typeof Refresh>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const SecurityCreatedStatus = z.object({
  created: z.boolean()
}).meta({ id: 'SecurityCreatedStatus' })
export type SecurityCreatedStatus = z.infer<typeof SecurityCreatedStatus>

export const SecurityPutPrivilegesActions = z.object({
  actions: z.array(z.string()),
  application: z.string().optional(),
  name: Name.optional(),
  metadata: Metadata.optional()
}).meta({ id: 'SecurityPutPrivilegesActions' })
export type SecurityPutPrivilegesActions = z.infer<typeof SecurityPutPrivilegesActions>

/**
 * Create or update application privileges.
 *
 * To use this API, you must have one of the following privileges:
 *
 * * The `manage_security` cluster privilege (or a greater privilege such as `all`).
 * * The "Manage Application Privileges" global privilege for the application being referenced in the request.
 *
 * Application names are formed from a prefix, with an optional suffix that conform to the following rules:
 *
 * * The prefix must begin with a lowercase ASCII letter.
 * * The prefix must contain only ASCII letters or digits.
 * * The prefix must be at least 3 characters long.
 * * If the suffix exists, it must begin with either a dash `-` or `_`.
 * * The suffix cannot contain any of the following characters: `\`, `/`, `*`, `?`, `"`, `<`, `>`, `|`, `,`, `*`.
 * * No part of the name can contain whitespace.
 *
 * Privilege names must begin with a lowercase ASCII letter and must contain only ASCII letters and digits along with the characters `_`, `-`, and `.`.
 *
 * Action names can contain any number of printable ASCII characters and must contain at least one of the following characters: `/`, `*`, `:`.
 */
export const SecurityPutPrivilegesRequest = z.object({
  ...RequestBase.shape,
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' }),
  privileges: z.record(z.string(), z.record(z.string(), SecurityPutPrivilegesActions)).meta({ found_in: 'body' })
}).meta({ id: 'SecurityPutPrivilegesRequest' })
export type SecurityPutPrivilegesRequest = z.infer<typeof SecurityPutPrivilegesRequest>

export const SecurityPutPrivilegesResponse = z.record(z.string(), z.record(z.string(), SecurityCreatedStatus)).meta({ id: 'SecurityPutPrivilegesResponse' })
export type SecurityPutPrivilegesResponse = z.infer<typeof SecurityPutPrivilegesResponse>
