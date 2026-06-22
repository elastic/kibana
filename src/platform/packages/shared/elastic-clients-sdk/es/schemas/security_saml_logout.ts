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
 * Logout of SAML.
 *
 * Submits a request to invalidate an access token and refresh token.
 *
 * NOTE: This API is intended for use by custom web applications other than Kibana.
 * If you are using Kibana, refer to the documentation for configuring SAML single-sign-on on the Elastic Stack.
 *
 * This API invalidates the tokens that were generated for a user by the SAML authenticate API.
 * If the SAML realm in Elasticsearch is configured accordingly and the SAML IdP supports this, the Elasticsearch response contains a URL to redirect the user to the IdP that contains a SAML logout request (starting an SP-initiated SAML Single Logout).
 */
export const SecuritySamlLogoutRequest = z.object({
  ...RequestBase.shape,
  token: z.string().describe('The access token that was returned as a response to calling the SAML authenticate API. Alternatively, the most recent token that was received after refreshing the original one by using a `refresh_token`.').meta({ found_in: 'body' }),
  refresh_token: z.string().describe('The refresh token that was returned as a response to calling the SAML authenticate API. Alternatively, the most recent refresh token that was received after refreshing the original access token.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecuritySamlLogoutRequest' })
export type SecuritySamlLogoutRequest = z.infer<typeof SecuritySamlLogoutRequest>

export const SecuritySamlLogoutResponse = z.object({
  redirect: z.string().describe('A URL that contains a SAML logout request as a parameter. You can use this URL to be redirected back to the SAML IdP and to initiate Single Logout.')
}).meta({ id: 'SecuritySamlLogoutResponse' })
export type SecuritySamlLogoutResponse = z.infer<typeof SecuritySamlLogoutResponse>
