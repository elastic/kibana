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

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const Metadata = z.record(z.string(), z.any()).meta({ id: 'Metadata' })
export type Metadata = z.infer<typeof Metadata>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Refresh = z.union([z.boolean(), z.enum(['true', 'false', 'wait_for'])]).meta({ id: 'Refresh' })
export type Refresh = z.infer<typeof Refresh>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

/**
 * Clone an API key.
 *
 * Create a copy of an existing API key with a new ID.
 * The cloned key inherits the role descriptors of the source key.
 * This is intended for applications (such as Kibana) that need to
 * create API keys on behalf of a user using an existing API key credential,
 * since derived API keys (API keys created by API keys) are not otherwise supported.
 */
export const SecurityCloneApiKeyRequest = z.object({
  ...RequestBase.shape,
  refresh: Refresh.describe('If `true` (the default) then refresh the affected shards to make this operation visible to search, if `wait_for` then wait for a refresh to make this operation visible to search, if `false` then do nothing with refreshes.').optional().meta({ found_in: 'query' }),
  api_key: z.string().describe('The credentials of the API key to clone. This is the secret value returned when the key was originally created.').meta({ found_in: 'body' }),
  name: Name.describe('A name for the cloned API key. If not provided, the name of the source key is used.').optional().meta({ found_in: 'body' }),
  expiration: Duration.describe('The expiration time for the cloned API key. By default, API keys never expire. Set to `null` to explicitly create a key with no expiration.').optional().meta({ found_in: 'body' }),
  metadata: Metadata.describe('Arbitrary metadata to associate with the cloned API key. It supports nested data structure. Within the metadata object, keys beginning with `_` are reserved for system usage.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityCloneApiKeyRequest' })
export type SecurityCloneApiKeyRequest = z.infer<typeof SecurityCloneApiKeyRequest>

export const SecurityCloneApiKeyResponse = z.object({
  api_key: z.string().describe('The generated API key value for the cloned key.'),
  expiration: long.describe('Expiration in milliseconds for the API key.').optional(),
  id: Id.describe('The unique ID of the cloned API key.'),
  name: Name.describe('The name of the cloned API key.'),
  encoded: z.string().describe('API key credentials which is the base64-encoding of the UTF-8 representation of `id` and `api_key` joined by a colon (`:`).')
}).meta({ id: 'SecurityCloneApiKeyResponse' })
export type SecurityCloneApiKeyResponse = z.infer<typeof SecurityCloneApiKeyResponse>
