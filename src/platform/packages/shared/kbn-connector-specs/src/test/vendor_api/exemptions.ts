/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

/**
 * What an exempt connector talks to, or why its vendor publishes nothing to pin, as the coverage
 * report shows it. Declared here so that the report never has to read it from the reason.
 */
export const EXEMPT_API_TYPES = [
  'mcp',
  'database',
  'graphql',
  'jsonrpc',
  'generic',
  'not_an_api_client',
  'self_hosted',
  'spec_mismatch',
  'no_public_spec',
] as const;

export type ExemptApiType = (typeof EXEMPT_API_TYPES)[number];

const exemptionFields = {
  apiType: z.enum(EXEMPT_API_TYPES),
  reason: z.string().min(1),
};

/**
 * Why a connector can't have a `vendor_api` folder. A `permanent` exemption can't go away with
 * the current tooling, such as a database driver instead of an HTTP API. A `temporary` one is
 * expected to be recorded once the issue it is `blockedBy` (in elastic/kibana) is done, such as
 * a spec that needs credentials to fetch.
 */
export const vendorApiExemptionSchema = z.discriminatedUnion('category', [
  z.strictObject({ category: z.literal('permanent'), ...exemptionFields }),
  z.strictObject({
    category: z.literal('temporary'),
    blockedBy: z.number().int().positive(),
    ...exemptionFields,
  }),
]);

export type VendorApiExemption = z.infer<typeof vendorApiExemptionSchema>;

/** Connector `metadata.id` to its exemption. */
export const vendorApiExemptionsSchema = z.record(
  z.string().startsWith('.'),
  vendorApiExemptionSchema
);

export type VendorApiExemptions = z.infer<typeof vendorApiExemptionsSchema>;

/** Whether a connector had `vendor_api` artifacts at the merge base, or didn't exist yet. */
export type CoverageAtBase = 'recorded' | 'unrecorded' | 'new';

export interface ConnectorCoverage {
  readonly id: string;
  readonly recorded: boolean;
  readonly exempt: boolean;
  readonly atBase: CoverageAtBase;
}

/**
 * The connectors whose vendor API coverage shrank since the merge base: recorded ones must stay
 * recorded, and new ones need artifacts unless they're exempt.
 */
export const findLostCoverage = (connectors: readonly ConnectorCoverage[]): ConnectorCoverage[] =>
  connectors.filter(
    ({ recorded, exempt, atBase }) =>
      !recorded && (atBase === 'recorded' || (atBase === 'new' && !exempt))
  );
