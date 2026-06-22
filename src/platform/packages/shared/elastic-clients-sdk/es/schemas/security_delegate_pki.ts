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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const SecurityDelegatePkiAuthenticationRealm = z.object({
  name: z.string(),
  type: z.string(),
  domain: z.string().optional()
}).meta({ id: 'SecurityDelegatePkiAuthenticationRealm' })
export type SecurityDelegatePkiAuthenticationRealm = z.infer<typeof SecurityDelegatePkiAuthenticationRealm>

export const SecurityDelegatePkiAuthentication = z.object({
  username: z.string(),
  roles: z.array(z.string()),
  full_name: z.union([z.string(), z.null()]),
  email: z.union([z.string(), z.null()]),
  token: z.record(z.string(), z.string()).optional(),
  metadata: Metadata,
  enabled: z.boolean(),
  authentication_realm: SecurityDelegatePkiAuthenticationRealm,
  lookup_realm: SecurityDelegatePkiAuthenticationRealm,
  authentication_type: z.string(),
  api_key: z.record(z.string(), z.string()).optional()
}).meta({ id: 'SecurityDelegatePkiAuthentication' })
export type SecurityDelegatePkiAuthentication = z.infer<typeof SecurityDelegatePkiAuthentication>

/**
 * Delegate PKI authentication.
 *
 * This API implements the exchange of an X509Certificate chain for an Elasticsearch access token.
 * The certificate chain is validated, according to RFC 5280, by sequentially considering the trust configuration of every installed PKI realm that has `delegation.enabled` set to `true`.
 * A successfully trusted client certificate is also subject to the validation of the subject distinguished name according to thw `username_pattern` of the respective realm.
 *
 * This API is called by smart and trusted proxies, such as Kibana, which terminate the user's TLS session but still want to authenticate the user by using a PKI realm—-as if the user connected directly to Elasticsearch.
 *
 * IMPORTANT: The association between the subject public key in the target certificate and the corresponding private key is not validated.
 * This is part of the TLS authentication process and it is delegated to the proxy that calls this API.
 * The proxy is trusted to have performed the TLS authentication and this API translates that authentication into an Elasticsearch access token.
 */
export const SecurityDelegatePkiRequest = z.object({
  ...RequestBase.shape,
  x509_certificate_chain: z.array(z.string()).describe('The X509Certificate chain, which is represented as an ordered string array. Each string in the array is a base64-encoded (Section 4 of RFC4648 - not base64url-encoded) of the certificate\'s DER encoding. The first element is the target certificate that contains the subject distinguished name that is requesting access. This may be followed by additional certificates; each subsequent certificate is used to certify the previous one.').meta({ found_in: 'body' })
}).meta({ id: 'SecurityDelegatePkiRequest' })
export type SecurityDelegatePkiRequest = z.infer<typeof SecurityDelegatePkiRequest>

export const SecurityDelegatePkiResponse = z.object({
  access_token: z.string().describe('An access token associated with the subject distinguished name of the client\'s certificate.'),
  expires_in: long.describe('The amount of time (in seconds) before the token expires.'),
  type: z.string().describe('The type of token.'),
  authentication: SecurityDelegatePkiAuthentication.optional()
}).meta({ id: 'SecurityDelegatePkiResponse' })
export type SecurityDelegatePkiResponse = z.infer<typeof SecurityDelegatePkiResponse>
