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

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

/**
 * Invalidate SAML.
 *
 * Submit a SAML LogoutRequest message to Elasticsearch for consumption.
 *
 * NOTE: This API is intended for use by custom web applications other than Kibana.
 * If you are using Kibana, refer to the documentation for configuring SAML single-sign-on on the Elastic Stack.
 *
 * The logout request comes from the SAML IdP during an IdP initiated Single Logout.
 * The custom web application can use this API to have Elasticsearch process the `LogoutRequest`.
 * After successful validation of the request, Elasticsearch invalidates the access token and refresh token that corresponds to that specific SAML principal and provides a URL that contains a SAML LogoutResponse message.
 * Thus the user can be redirected back to their IdP.
 */
export const SecuritySamlInvalidateRequest = z.object({
  ...RequestBase.shape,
  acs: z.string().describe('The Assertion Consumer Service URL that matches the one of the SAML realm in Elasticsearch that should be used. You must specify either this parameter or the `realm` parameter.').optional().meta({ found_in: 'body' }),
  query_string: z.string().describe('The query part of the URL that the user was redirected to by the SAML IdP to initiate the Single Logout. This query should include a single parameter named `SAMLRequest` that contains a SAML logout request that is deflated and Base64 encoded. If the SAML IdP has signed the logout request, the URL should include two extra parameters named `SigAlg` and `Signature` that contain the algorithm used for the signature and the signature value itself. In order for Elasticsearch to be able to verify the IdP\'s signature, the value of the `query_string` field must be an exact match to the string provided by the browser. The client application must not attempt to parse or process the string in any way.').meta({ found_in: 'body' }),
  realm: z.string().describe('The name of the SAML realm in Elasticsearch the configuration. You must specify either this parameter or the `acs` parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecuritySamlInvalidateRequest' })
export type SecuritySamlInvalidateRequest = z.infer<typeof SecuritySamlInvalidateRequest>

export const SecuritySamlInvalidateResponse = z.object({
  invalidated: integer.describe('The number of tokens that were invalidated as part of this logout.'),
  realm: z.string().describe('The realm name of the SAML realm in Elasticsearch that authenticated the user.'),
  redirect: z.string().describe('A SAML logout response as a parameter so that the user can be redirected back to the SAML IdP.')
}).meta({ id: 'SecuritySamlInvalidateResponse' })
export type SecuritySamlInvalidateResponse = z.infer<typeof SecuritySamlInvalidateResponse>
