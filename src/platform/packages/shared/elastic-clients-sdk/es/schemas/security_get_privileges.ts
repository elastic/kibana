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

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Get application privileges.
 *
 * To use this API, you must have one of the following privileges:
 *
 * * The `read_security` cluster privilege (or a greater privilege such as `manage_security` or `all`).
 * * The "Manage Application Privileges" global privilege for the application being referenced in the request.
 */
export const SecurityGetPrivilegesRequest = z.object({
  ...RequestBase.shape,
  application: Name.describe('The name of the application. Application privileges are always associated with exactly one application. If you do not specify this parameter, the API returns information about all privileges for all applications.').optional().meta({ found_in: 'path' }),
  name: Names.describe('The name of the privilege. If you do not specify this parameter, the API returns information about all privileges for the requested application.').optional().meta({ found_in: 'path' })
}).meta({ id: 'SecurityGetPrivilegesRequest' })
export type SecurityGetPrivilegesRequest = z.infer<typeof SecurityGetPrivilegesRequest>

export const SecurityPutPrivilegesActions = z.object({
  actions: z.array(z.string()),
  application: z.string().optional(),
  name: Name.optional(),
  metadata: Metadata.optional()
}).meta({ id: 'SecurityPutPrivilegesActions' })
export type SecurityPutPrivilegesActions = z.infer<typeof SecurityPutPrivilegesActions>

export const SecurityGetPrivilegesResponse = z.record(z.string(), z.record(z.string(), SecurityPutPrivilegesActions)).meta({ id: 'SecurityGetPrivilegesResponse' })
export type SecurityGetPrivilegesResponse = z.infer<typeof SecurityGetPrivilegesResponse>
