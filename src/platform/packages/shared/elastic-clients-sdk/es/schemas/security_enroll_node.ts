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
 * Enroll a node.
 *
 * Enroll a new node to allow it to join an existing cluster with security features enabled.
 *
 * The response contains all the necessary information for the joining node to bootstrap discovery and security related settings so that it can successfully join the cluster.
 * The response contains key and certificate material that allows the caller to generate valid signed certificates for the HTTP layer of all nodes in the cluster.
 */
export const SecurityEnrollNodeRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'SecurityEnrollNodeRequest' })
export type SecurityEnrollNodeRequest = z.infer<typeof SecurityEnrollNodeRequest>

export const SecurityEnrollNodeResponse = z.object({
  http_ca_key: z.string().describe('The CA private key that can be used by the new node in order to sign its certificate for the HTTP layer, as a Base64 encoded string of the ASN.1 DER encoding of the key.'),
  http_ca_cert: z.string().describe('The CA certificate that can be used by the new node in order to sign its certificate for the HTTP layer, as a Base64 encoded string of the ASN.1 DER encoding of the certificate.'),
  transport_ca_cert: z.string().describe('The CA certificate that is used to sign the TLS certificate for the transport layer, as a Base64 encoded string of the ASN.1 DER encoding of the certificate.'),
  transport_key: z.string().describe('The private key that the node can use for TLS for its transport layer, as a Base64 encoded string of the ASN.1 DER encoding of the key.'),
  transport_cert: z.string().describe('The certificate that the node can use for TLS for its transport layer, as a Base64 encoded string of the ASN.1 DER encoding of the certificate.'),
  nodes_addresses: z.array(z.string()).describe('A list of transport addresses in the form of `host:port` for the nodes that are already members of the cluster.')
}).meta({ id: 'SecurityEnrollNodeResponse' })
export type SecurityEnrollNodeResponse = z.infer<typeof SecurityEnrollNodeResponse>
