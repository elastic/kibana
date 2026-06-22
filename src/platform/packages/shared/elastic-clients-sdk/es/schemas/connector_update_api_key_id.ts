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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Result = z.enum(['created', 'updated', 'deleted', 'not_found', 'noop']).meta({ id: 'Result' })
export type Result = z.infer<typeof Result>

/**
 * Update the connector API key ID.
 *
 * Update the `api_key_id` and `api_key_secret_id` fields of a connector.
 * You can specify the ID of the API key used for authorization and the ID of the connector secret where the API key is stored.
 * The connector secret ID is required only for Elastic managed (native) connectors.
 * Self-managed connectors (connector clients) do not use this field.
 */
export const ConnectorUpdateApiKeyIdRequest = z.object({
  ...RequestBase.shape,
  connector_id: Id.describe('The unique identifier of the connector to be updated').meta({ found_in: 'path' }),
  api_key_id: z.string().optional().meta({ found_in: 'body' }),
  api_key_secret_id: z.string().optional().meta({ found_in: 'body' })
}).meta({ id: 'ConnectorUpdateApiKeyIdRequest' })
export type ConnectorUpdateApiKeyIdRequest = z.infer<typeof ConnectorUpdateApiKeyIdRequest>

export const ConnectorUpdateApiKeyIdResponse = z.object({
  result: Result
}).meta({ id: 'ConnectorUpdateApiKeyIdResponse' })
export type ConnectorUpdateApiKeyIdResponse = z.infer<typeof ConnectorUpdateApiKeyIdResponse>
