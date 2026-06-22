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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Prepare OpenID connect authentication.
 *
 * Create an oAuth 2.0 authentication request as a URL string based on the configuration of the OpenID Connect authentication realm in Elasticsearch.
 *
 * The response of this API is a URL pointing to the Authorization Endpoint of the configured OpenID Connect Provider, which can be used to redirect the browser of the user in order to continue the authentication process.
 *
 * Elasticsearch exposes all the necessary OpenID Connect related functionality with the OpenID Connect APIs.
 * These APIs are used internally by Kibana in order to provide OpenID Connect based authentication, but can also be used by other, custom web applications or other clients.
 */
export const SecurityOidcPrepareAuthenticationRequest = z.object({
  ...RequestBase.shape,
  iss: z.string().describe('In the case of a third party initiated single sign on, this is the issuer identifier for the OP that the RP is to send the authentication request to. It cannot be specified when *realm* is specified. One of *realm* or *iss* is required.').optional().meta({ found_in: 'body' }),
  login_hint: z.string().describe('In the case of a third party initiated single sign on, it is a string value that is included in the authentication request as the *login_hint* parameter. This parameter is not valid when *realm* is specified.').optional().meta({ found_in: 'body' }),
  nonce: z.string().describe('The value used to associate a client session with an ID token and to mitigate replay attacks. If the caller of the API does not provide a value, Elasticsearch will generate one with sufficient entropy and return it in the response.').optional().meta({ found_in: 'body' }),
  realm: z.string().describe('The name of the OpenID Connect realm in Elasticsearch the configuration of which should be used in order to generate the authentication request. It cannot be specified when *iss* is specified. One of *realm* or *iss* is required.').optional().meta({ found_in: 'body' }),
  state: z.string().describe('The value used to maintain state between the authentication request and the response, typically used as a Cross-Site Request Forgery mitigation. If the caller of the API does not provide a value, Elasticsearch will generate one with sufficient entropy and return it in the response.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityOidcPrepareAuthenticationRequest' })
export type SecurityOidcPrepareAuthenticationRequest = z.infer<typeof SecurityOidcPrepareAuthenticationRequest>

export const SecurityOidcPrepareAuthenticationResponse = z.object({
  nonce: z.string(),
  realm: z.string(),
  redirect: z.string().describe('A URI that points to the authorization endpoint of the OpenID Connect Provider with all the parameters of the authentication request as HTTP GET parameters.'),
  state: z.string()
}).meta({ id: 'SecurityOidcPrepareAuthenticationResponse' })
export type SecurityOidcPrepareAuthenticationResponse = z.infer<typeof SecurityOidcPrepareAuthenticationResponse>
