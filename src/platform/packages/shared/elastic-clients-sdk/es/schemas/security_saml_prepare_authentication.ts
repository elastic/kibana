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

/**
 * Prepare SAML authentication.
 *
 * Create a SAML authentication request (`<AuthnRequest>`) as a URL string based on the configuration of the respective SAML realm in Elasticsearch.
 *
 * NOTE: This API is intended for use by custom web applications other than Kibana.
 * If you are using Kibana, refer to the documentation for configuring SAML single-sign-on on the Elastic Stack.
 *
 * This API returns a URL pointing to the SAML Identity Provider.
 * You can use the URL to redirect the browser of the user in order to continue the authentication process.
 * The URL includes a single parameter named `SAMLRequest`, which contains a SAML Authentication request that is deflated and Base64 encoded.
 * If the configuration dictates that SAML authentication requests should be signed, the URL has two extra parameters named `SigAlg` and `Signature`.
 * These parameters contain the algorithm used for the signature and the signature value itself.
 * It also returns a random string that uniquely identifies this SAML Authentication request.
 * The caller of this API needs to store this identifier as it needs to be used in a following step of the authentication process.
 */
export const SecuritySamlPrepareAuthenticationRequest = z.object({
  ...RequestBase.shape,
  acs: z.string().describe('The Assertion Consumer Service URL that matches the one of the SAML realms in Elasticsearch. The realm is used to generate the authentication request. You must specify either this parameter or the `realm` parameter.').optional().meta({ found_in: 'body' }),
  realm: z.string().describe('The name of the SAML realm in Elasticsearch for which the configuration is used to generate the authentication request. You must specify either this parameter or the `acs` parameter.').optional().meta({ found_in: 'body' }),
  relay_state: z.string().describe('A string that will be included in the redirect URL that this API returns as the `RelayState` query parameter. If the Authentication Request is signed, this value is used as part of the signature computation.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecuritySamlPrepareAuthenticationRequest' })
export type SecuritySamlPrepareAuthenticationRequest = z.infer<typeof SecuritySamlPrepareAuthenticationRequest>

export const SecuritySamlPrepareAuthenticationResponse = z.object({
  id: Id.describe('A unique identifier for the SAML Request to be stored by the caller of the API.'),
  realm: z.string().describe('The name of the Elasticsearch realm that was used to construct the authentication request.'),
  redirect: z.string().describe('The URL to redirect the user to.')
}).meta({ id: 'SecuritySamlPrepareAuthenticationResponse' })
export type SecuritySamlPrepareAuthenticationResponse = z.infer<typeof SecuritySamlPrepareAuthenticationResponse>
