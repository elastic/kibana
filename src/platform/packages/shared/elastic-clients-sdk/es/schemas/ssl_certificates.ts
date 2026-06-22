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

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

/**
 * A date and time, either as a string whose format can depend on the context (defaulting to ISO 8601), or a
 * number of milliseconds since the Epoch. Elasticsearch accepts both as input, but will generally output a string
 * representation.
 */
export const DateTime = z.union([z.string(), EpochTime]).meta({ id: 'DateTime' })
export type DateTime = z.infer<typeof DateTime>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const SslCertificatesCertificateInformation = z.object({
  alias: z.union([z.string(), z.null()]).describe('If the path refers to a container file (a jks keystore, or a PKCS#12 file), it is the alias of the certificate. Otherwise, it is null.'),
  expiry: DateTime.describe('The ISO formatted date of the certificate\'s expiry (not-after) date.'),
  format: z.string().describe('The format of the file. Valid values include `jks`, `PKCS12`, and `PEM`.'),
  has_private_key: z.boolean().describe('Indicates whether Elasticsearch has access to the private key for this certificate.'),
  issuer: z.string().describe('The Distinguished Name of the certificate\'s issuer.').optional(),
  path: z.string().describe('The path to the certificate, as configured in the `elasticsearch.yml` file.'),
  serial_number: z.string().describe('The hexadecimal representation of the certificate\'s serial number.'),
  subject_dn: z.string().describe('The Distinguished Name of the certificate\'s subject.')
}).meta({ id: 'SslCertificatesCertificateInformation' })
export type SslCertificatesCertificateInformation = z.infer<typeof SslCertificatesCertificateInformation>

/**
 * Get SSL certificates.
 *
 * Get information about the X.509 certificates that are used to encrypt communications in the cluster.
 * The API returns a list that includes certificates from all TLS contexts including:
 *
 * - Settings for transport and HTTP interfaces
 * - TLS settings that are used within authentication realms
 * - TLS settings for remote monitoring exporters
 *
 * The list includes certificates that are used for configuring trust, such as those configured in the `xpack.security.transport.ssl.truststore` and `xpack.security.transport.ssl.certificate_authorities` settings.
 * It also includes certificates that are used for configuring server identity, such as `xpack.security.http.ssl.keystore` and `xpack.security.http.ssl.certificate settings`.
 *
 * The list does not include certificates that are sourced from the default SSL context of the Java Runtime Environment (JRE), even if those certificates are in use within Elasticsearch.
 *
 * NOTE: When a PKCS#11 token is configured as the truststore of the JRE, the API returns all the certificates that are included in the PKCS#11 token irrespective of whether these are used in the Elasticsearch TLS configuration.
 *
 * If Elasticsearch is configured to use a keystore or truststore, the API output includes all certificates in that store, even though some of the certificates might not be in active use within the cluster.
 */
export const SslCertificatesRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'SslCertificatesRequest' })
export type SslCertificatesRequest = z.infer<typeof SslCertificatesRequest>

export const SslCertificatesResponse = z.array(SslCertificatesCertificateInformation).meta({ id: 'SslCertificatesResponse' })
export type SslCertificatesResponse = z.infer<typeof SslCertificatesResponse>
