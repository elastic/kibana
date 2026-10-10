/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ResponseFixture } from '@kbn/connector-contract-mock';
import { z } from '@kbn/zod/v4';

const responseOverrideSchema = z
  .object({
    source: z.string().optional(),
    method: z.string(),
    path: z.string(),
    status: z.number().int(),
    headers: z.record(z.string(), z.string()).optional(),
    body: z.unknown().optional(),
  })
  .strict();

const queryOperationSchema = z
  .object({
    source: z.string().optional(),
    method: z.string(),
    path: z.string(),
  })
  .strict();

const actionFixtureSchema = z
  .object({
    /** Merged into each generated input. */
    input: z.record(z.string(), z.unknown()).optional(),
    /**
     * Operations a `read` scoped action may call with a method other than `GET`, `HEAD` or
     * `OPTIONS`, because they only query, e.g. a search sent as `POST`.
     */
    queries: z.array(queryOperationSchema).optional(),
    /** Served by the mock for this action's runs, in place of sampled responses. */
    responses: z.array(responseOverrideSchema).optional(),
  })
  .strict();

/** `vendor_api/fixtures.json`: per-action inputs, query operations and response overrides. */
export const vendorApiFixturesSchema = z.record(z.string(), actionFixtureSchema);

export type ActionFixture = z.infer<typeof actionFixtureSchema>;
export type QueryOperation = z.infer<typeof queryOperationSchema>;
export type ResponseOverride = z.infer<typeof responseOverrideSchema>;
export type VendorApiFixtures = z.infer<typeof vendorApiFixturesSchema>;

export const toResponseFixtures = (
  responses: readonly ResponseOverride[] = []
): ResponseFixture[] =>
  responses.map(({ source, method, path, status, headers, body }) => ({
    operation: { method, path, ...(source === undefined ? {} : { source }) },
    response: { status, ...(headers === undefined ? {} : { headers }), body },
  }));
