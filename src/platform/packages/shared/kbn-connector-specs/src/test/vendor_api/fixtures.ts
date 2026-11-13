/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ResponseFixture } from '@kbn/connector-emulate';
import { z } from '@kbn/zod/v4';

const requestMatcherSchema = z
  .object({
    path: z.record(z.string(), z.string()).optional(),
    query: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
    headers: z.record(z.string(), z.string()).optional(),
    body: z.unknown().optional(),
  })
  .strict();

const storedResponseFields = {
  status: z.number().int(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
};

const storedResponseSchema = z.object(storedResponseFields).strict();

const overrideFields = {
  source: z.string().optional(),
  method: z.string(),
  path: z.string(),
  /** Answers only the requests with these values; without it, every other request. */
  when: requestMatcherSchema.optional(),
};

const responseOverrideSchema = z.union(
  [
    z.object({ ...overrideFields, ...storedResponseFields }).strict(),
    z
      .object({
        ...overrideFields,
        /** Served in turn, the last one repeating, for handlers that poll until a job finishes. */
        responses: z.array(storedResponseSchema).min(1),
      })
      .strict(),
  ],
  {
    error:
      'A response override is { source?, method, path, when?, status, headers?, body? }, or has responses, a non-empty list of { status, headers?, body? }, in place of status, headers and body',
  }
);

const queryOperationSchema = z
  .object({
    source: z.string().optional(),
    method: z.string(),
    path: z.string(),
  })
  .strict();

const actionFixtureSchema = z
  .object({
    /**
     * Merged into each generated input. A list generates the inputs once per entry, for schemas
     * whose cross-field rules no single override satisfies in every input.
     */
    input: z
      .union([z.record(z.string(), z.unknown()), z.array(z.record(z.string(), z.unknown())).min(1)])
      .optional(),
    /** Merged into the connector config, e.g. to set an optional setting the action needs. */
    config: z.record(z.string(), z.unknown()).optional(),
    /**
     * Operations a `read` scoped action may call with a method other than `GET`, `HEAD` or
     * `OPTIONS`, because they only query, e.g. a search sent as `POST`.
     */
    queries: z.array(queryOperationSchema).optional(),
    /** Served by the mock for this action's runs, in place of sampled responses. */
    responses: z.array(responseOverrideSchema).optional(),
  })
  .strict();

/** `vendor_api/fixtures.json`: per-action inputs, config, query operations and response overrides. */
export const vendorApiFixturesSchema = z.record(z.string(), actionFixtureSchema);

/** A list of response overrides on its own, as `node scripts/connector_emulate --fixtures` reads. */
export const responseOverridesSchema = z.array(responseOverrideSchema);

export type ActionFixture = z.infer<typeof actionFixtureSchema>;
export type QueryOperation = z.infer<typeof queryOperationSchema>;
export type ResponseOverride = z.infer<typeof responseOverrideSchema>;
export type VendorApiFixtures = z.infer<typeof vendorApiFixturesSchema>;

const toStoredResponse = ({ status, headers, body }: z.infer<typeof storedResponseSchema>) => ({
  status,
  ...(headers === undefined ? {} : { headers }),
  body,
});

export const toResponseFixtures = (
  responses: readonly ResponseOverride[] = []
): ResponseFixture[] =>
  responses.map((override) => {
    const { source, method, path, when } = override;
    const base = {
      operation: { method, path, ...(source === undefined ? {} : { source }) },
      ...(when === undefined ? {} : { when }),
    };
    return 'responses' in override
      ? { ...base, responses: override.responses.map(toStoredResponse) }
      : { ...base, response: toStoredResponse(override) };
  });
