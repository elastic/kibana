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
 * Enroll Kibana.
 *
 * Enable a Kibana instance to configure itself for communication with a secured Elasticsearch cluster.
 *
 * NOTE: This API is currently intended for internal use only by Kibana.
 * Kibana uses this API internally to configure itself for communications with an Elasticsearch cluster that already has security features enabled.
 */
export const SecurityEnrollKibanaRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'SecurityEnrollKibanaRequest' })
export type SecurityEnrollKibanaRequest = z.infer<typeof SecurityEnrollKibanaRequest>

export const SecurityEnrollKibanaToken = z.object({
  name: z.string().describe('The name of the bearer token for the `elastic/kibana` service account.'),
  value: z.string().describe('The value of the bearer token for the `elastic/kibana` service account. Use this value to authenticate the service account with Elasticsearch.')
}).meta({ id: 'SecurityEnrollKibanaToken' })
export type SecurityEnrollKibanaToken = z.infer<typeof SecurityEnrollKibanaToken>

export const SecurityEnrollKibanaResponse = z.object({
  token: SecurityEnrollKibanaToken,
  http_ca: z.string().describe('The CA certificate used to sign the node certificates that Elasticsearch uses for TLS on the HTTP layer. The certificate is returned as a Base64 encoded string of the ASN.1 DER encoding of the certificate.')
}).meta({ id: 'SecurityEnrollKibanaResponse' })
export type SecurityEnrollKibanaResponse = z.infer<typeof SecurityEnrollKibanaResponse>
