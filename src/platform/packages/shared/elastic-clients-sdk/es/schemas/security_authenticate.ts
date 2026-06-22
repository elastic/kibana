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

export const Metadata = z.record(z.string(), z.any()).meta({ id: 'Metadata' })
export type Metadata = z.infer<typeof Metadata>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Username = z.string().meta({ id: 'Username' })
export type Username = z.infer<typeof Username>

export const SecurityCredentialManagedBy = z.enum(['cloud', 'elasticsearch']).meta({ id: 'SecurityCredentialManagedBy' })
export type SecurityCredentialManagedBy = z.infer<typeof SecurityCredentialManagedBy>

export const SecurityRealmInfo = z.object({
  name: Name,
  type: z.string()
}).meta({ id: 'SecurityRealmInfo' })
export type SecurityRealmInfo = z.infer<typeof SecurityRealmInfo>

export const SecurityAuthenticateAuthenticateApiKey = z.object({
  id: Id,
  name: Name.optional(),
  managed_by: SecurityCredentialManagedBy,
  internal: z.boolean().optional()
}).meta({ id: 'SecurityAuthenticateAuthenticateApiKey' })
export type SecurityAuthenticateAuthenticateApiKey = z.infer<typeof SecurityAuthenticateAuthenticateApiKey>

/**
 * Authenticate a user.
 *
 * Authenticates a user and returns information about the authenticated user.
 * Include the user information in a [basic auth header](https://en.wikipedia.org/wiki/Basic_access_authentication).
 * A successful call returns a JSON structure that shows user information such as their username, the roles that are assigned to the user, any assigned metadata, and information about the realms that authenticated and authorized the user.
 * If the user cannot be authenticated, this API returns a 401 status code.
 */
export const SecurityAuthenticateRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'SecurityAuthenticateRequest' })
export type SecurityAuthenticateRequest = z.infer<typeof SecurityAuthenticateRequest>

export const SecurityAuthenticateToken = z.object({
  name: Name.optional(),
  type: z.string().optional(),
  managed_by: SecurityCredentialManagedBy.optional()
}).meta({ id: 'SecurityAuthenticateToken' })
export type SecurityAuthenticateToken = z.infer<typeof SecurityAuthenticateToken>

export const SecurityAuthenticateResponse = z.object({
  api_key: SecurityAuthenticateAuthenticateApiKey.optional(),
  authentication_realm: SecurityRealmInfo,
  email: z.union([z.string(), z.null()]).optional(),
  full_name: z.union([Name, z.null()]).optional(),
  lookup_realm: SecurityRealmInfo,
  metadata: Metadata,
  roles: z.array(z.string()),
  username: Username,
  enabled: z.boolean(),
  authentication_type: z.string(),
  token: SecurityAuthenticateToken.optional()
}).meta({ id: 'SecurityAuthenticateResponse' })
export type SecurityAuthenticateResponse = z.infer<typeof SecurityAuthenticateResponse>
