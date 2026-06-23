/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// =============================================================================
// Shared primitives
// =============================================================================

export const HOST_SCHEMA = z
  .union([z.ipv4(), z.ipv6()])
  .describe(
    'Host identifier — an IPv4 or IPv6 address (e.g., "8.8.8.8" or "2001:4860:4860::8888")'
  );

  const DOMAIN_HOSTNAME_SCHEMA = z
    .string()
    .min(1)
    .max(253)
    .regex(/^[a-zA-Z0-9.-]+$/, {
      message: 'Must be a hostname or domain (letters, numbers, dots, and hyphens only)',
    });


export const HOSTNAME_SCHEMA = z
  .union([z.ipv4(), z.ipv6(), DOMAIN_HOSTNAME_SCHEMA])
  .describe('Hostname, domain, or IP address (IPv4 or IPv6), e.g. "example.com" or "8.8.8.8"');

export const PORT_SCHEMA = z
  .number()
  .int()
  .min(1)
  .max(65535)
  .describe('TCP/UDP port number (1–65535)');

export const SHA256_SCHEMA = z
  .string()
  .regex(/^[a-fA-F0-9]{64}$/, { message: 'Must be a 64-character SHA-256 hex string' })
  .describe('SHA-256 fingerprint as a 64-character lowercase hex string');

export const TRANSPORT_PROTOCOL_SCHEMA = z
  .enum(['unknown', 'tcp', 'udp', 'icmp', 'quic'])
  .describe('Transport protocol: "unknown", "tcp", "udp", "icmp", or "quic"');

const RFC3339_TIMESTAMP_SCHEMA = z
  .string()
  .datetime({ offset: true, message: 'Must be an RFC 3339 timestamp (e.g., "2025-01-01T00:00:00Z")' });

// =============================================================================
// Helpers
// =============================================================================

const isIpv6Address = (value: string): boolean => z.ipv6().safeParse(value).success;

/**
 * Builds a Censys web property identifier string from a hostname/IP and port.
 * IPv6 hosts are wrapped in `[...]` brackets per RFC 3986 so the resulting
 * value is unambiguous in both URL paths and API request bodies.
 */
export const formatWebProperty = (host: string, port: number): string =>
  isIpv6Address(host) ? `[${host}]:${port}` : `${host}:${port}`;

// =============================================================================
// Action input schemas & inferred types
// =============================================================================

export const GetHostInputSchema = lazySchema(() =>
  z.object({
    host: HOST_SCHEMA,
  })
);
export type GetHostInput = z.infer<typeof GetHostInputSchema>;

export const GetWebPropertyInputSchema = lazySchema(() =>
  z.object({
    hostname: HOSTNAME_SCHEMA,
    port: PORT_SCHEMA,
  })
);
export type GetWebPropertyInput = z.infer<typeof GetWebPropertyInputSchema>;

export const GetCertificateInputSchema = lazySchema(() =>
  z.object({
    certificate: SHA256_SCHEMA.describe(
      'Certificate identifier — the certificate SHA-256 fingerprint as a 64-character lowercase hex string'
    ),
  })
);
export type GetCertificateInput = z.infer<typeof GetCertificateInputSchema>;

export const GetHostHistoryInputSchema = lazySchema(() =>
  z.object({
    host: HOST_SCHEMA,
    startTime: RFC3339_TIMESTAMP_SCHEMA.describe(
      'Start of the history window as an RFC 3339 timestamp (e.g., "2025-01-01T00:00:00Z")'
    ),
    endTime: RFC3339_TIMESTAMP_SCHEMA.describe(
      'End of the history window as an RFC 3339 timestamp (e.g., "2025-01-31T23:59:59Z")'
    ),
  })
);
export type GetHostHistoryInput = z.infer<typeof GetHostHistoryInputSchema>;

const RescanServiceSchema = z
  .object({
    type: z.literal('service').describe('Discriminator: "service" to rescan a host service'),
    ip: HOST_SCHEMA,
    port: PORT_SCHEMA,
    protocol: z
      .string()
      .min(1)
      .describe('Application-layer protocol on the service (e.g., "HTTP", "SSH", "TLS")'),
    transportProtocol: TRANSPORT_PROTOCOL_SCHEMA,
  })
  .describe('Submit a host service (IP + port + protocols) for fresh scanning');

const RescanWebPropertySchema = z
  .object({
    type: z
      .literal('webproperty')
      .describe('Discriminator: "webproperty" to rescan a web property by host and port'),
    hostname: HOSTNAME_SCHEMA,
    port: PORT_SCHEMA,
  })
  .describe('Submit a web property (hostname or IP + port) for fresh scanning');

export const RescanInputSchema = lazySchema(() =>
  z
    .discriminatedUnion('type', [RescanServiceSchema, RescanWebPropertySchema])
    .describe(
      'Asset to rescan. Use type="service" for a host IP+port, or type="webproperty" for a hostname-or-IP+port.'
    )
);
export type RescanInput = z.infer<typeof RescanInputSchema>;

export const ScanStatusInputSchema = lazySchema(() =>
  z.object({
    scanId: z.string().min(1).describe('Scan ID returned by a prior rescan call'),
  })
);
export type ScanStatusInput = z.infer<typeof ScanStatusInputSchema>;

/**
 * Censeye job target schemas
 * - Derived from existing GetHostInputSchema, GetWebPropertyInputSchema, and
 *   GetCertificateInputSchema, each extended with a `type` discriminator
 *   ("host", "webproperty", or "certificate").
 * - This enables robust discriminated union validation and type-safe use within
 *   Censeye job APIs.
 */
const CensEyeHostJobSchema = GetHostInputSchema.extend({
  type: z.literal('host').describe('Discriminator: "host" to run Censeye against a host IP'),
}).describe('Censeye job target: a host identified by its IP address');

const CensEyeWebPropertyJobSchema = GetWebPropertyInputSchema.extend({
  type: z
    .literal('webproperty')
    .describe('Discriminator: "webproperty" to run Censeye against a web property'),
}).describe('Censeye job target: a web property (hostname or IP + port)');

const CensEyeCertificateJobSchema = GetCertificateInputSchema.extend({
  type: z
    .literal('certificate')
    .describe('Discriminator: "certificate" to run Censeye against a certificate'),
}).describe('Censeye job target: a certificate SHA-256 fingerprint');

export const CensEyeCreateAnalysisJobInputSchema = lazySchema(() =>
  z
    .discriminatedUnion('type', [
      CensEyeHostJobSchema,
      CensEyeWebPropertyJobSchema,
      CensEyeCertificateJobSchema,
    ])
    .describe(
      'Censeye job target - set type to "host", "webproperty", or "certificate" and provide the matching identifier'
    )
);
export type CensEyeCreateAnalysisJobInput = z.infer<typeof CensEyeCreateAnalysisJobInputSchema>;

export const CensEyeJobStatusInputSchema = lazySchema(() =>
  z.object({
    jobId: z.string().min(1).describe('Censeye job ID returned by censEyeCreateAnalysisJob'),
  })
);
export type CensEyeJobStatusInput = z.infer<typeof CensEyeJobStatusInputSchema>;

export const CensEyeJobResultInputSchema = lazySchema(() =>
  z.object({
    jobId: z
      .string()
      .min(1)
      .describe(
        'Censeye job ID whose results to retrieve. Call censEyeJobStatus first to confirm completion.'
      ),
  })
);
export type CensEyeJobResultInput = z.infer<typeof CensEyeJobResultInputSchema>;
