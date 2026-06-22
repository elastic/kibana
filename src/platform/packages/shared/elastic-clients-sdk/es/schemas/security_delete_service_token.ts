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
 * Delete service account tokens.
 *
 * Delete service account tokens for a service in a specified namespace.
 */
export const SecurityDeleteServiceTokenRequest = z.object({
  ...RequestBase.shape,
  namespace: Namespace.describe('The namespace, which is a top-level grouping of service accounts.').meta({ found_in: 'path' }),
  service: Service.describe('The service name.').meta({ found_in: 'path' }),
  name: Name.describe('The name of the service account token.').meta({ found_in: 'path' }),
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityDeleteServiceTokenRequest' })
export type SecurityDeleteServiceTokenRequest = z.infer<typeof SecurityDeleteServiceTokenRequest>

export const SecurityDeleteServiceTokenResponse = z.object({
  found: z.boolean().describe('If the service account token is successfully deleted, the request returns `{"found": true}`. Otherwise, the response will have status code 404 and `found` is set to `false`.')
}).meta({ id: 'SecurityDeleteServiceTokenResponse' })
export type SecurityDeleteServiceTokenResponse = z.infer<typeof SecurityDeleteServiceTokenResponse>
