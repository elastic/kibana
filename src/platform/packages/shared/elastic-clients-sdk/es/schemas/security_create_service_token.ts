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

export const Namespace = z.string().meta({ id: 'Namespace' })
export type Namespace = z.infer<typeof Namespace>

export const Refresh = z.union([z.boolean(), z.enum(['true', 'false', 'wait_for'])]).meta({ id: 'Refresh' })
export type Refresh = z.infer<typeof Refresh>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Service = z.string().meta({ id: 'Service' })
export type Service = z.infer<typeof Service>

/**
 * Create a service account token.
 *
 * Create a service accounts token for access without requiring basic authentication.
 *
 * NOTE: Service account tokens never expire.
 * You must actively delete them if they are no longer needed.
 */
export const SecurityCreateServiceTokenRequest = z.object({
  ...RequestBase.shape,
  namespace: Namespace.describe('The name of the namespace, which is a top-level grouping of service accounts.').meta({ found_in: 'path' }),
  service: Service.describe('The name of the service.').meta({ found_in: 'path' }),
  name: Name.describe('The name for the service account token. If omitted, a random name will be generated. Token names must be at least one and no more than 256 characters. They can contain alphanumeric characters (a-z, A-Z, 0-9), dashes (`-`), and underscores (`_`), but cannot begin with an underscore. NOTE: Token names must be unique in the context of the associated service account. They must also be globally unique with their fully qualified names, which are comprised of the service account principal and token name, such as `<namespace>/<service>/<token-name>`.').optional().meta({ found_in: 'path' }),
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityCreateServiceTokenRequest' })
export type SecurityCreateServiceTokenRequest = z.infer<typeof SecurityCreateServiceTokenRequest>

export const SecurityCreateServiceTokenToken = z.object({
  name: Name,
  value: z.string()
}).meta({ id: 'SecurityCreateServiceTokenToken' })
export type SecurityCreateServiceTokenToken = z.infer<typeof SecurityCreateServiceTokenToken>

export const SecurityCreateServiceTokenResponse = z.object({
  created: z.boolean(),
  token: SecurityCreateServiceTokenToken
}).meta({ id: 'SecurityCreateServiceTokenResponse' })
export type SecurityCreateServiceTokenResponse = z.infer<typeof SecurityCreateServiceTokenResponse>
