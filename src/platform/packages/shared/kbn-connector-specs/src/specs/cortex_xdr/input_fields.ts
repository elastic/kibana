/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z, lazySchema } from '@kbn/zod/v4';
import {
  DEFAULT_MAX_RESULTS,
  MAX_FILTER_ENDPOINTS,
  MAX_RESULTS,
  SHA256_PATTERN,
} from './constants';

// ---------------------------------------------------------------------------
// Shared fields
// ---------------------------------------------------------------------------

export const EndpointIdSchema = lazySchema(() =>
  z
    .string()
    .trim()
    .min(1)
    .max(128)
    .describe('Cortex XDR endpoint (agent) id, as returned in endpoint_id by getEndpoints')
);

export const actionEndpointIds = (max: number) =>
  z
    .array(EndpointIdSchema)
    .min(1)
    .max(max)
    .describe(
      `Endpoint (agent) ids from getEndpoints, 1 to ${max} per call. Example: ["aeec6a2cc92e46fab3b6f621722e9916"]`
    );

export const filterEndpointIds = () =>
  z
    .array(EndpointIdSchema)
    .max(MAX_FILTER_ENDPOINTS)
    .optional()
    .describe(`Only these endpoint (agent) ids, up to ${MAX_FILTER_ENDPOINTS}`);

export const Sha256Schema = lazySchema(() =>
  z
    .string()
    .max(64)
    .regex(SHA256_PATTERN, 'Enter a SHA256 hash: 64 hexadecimal characters')
    .describe('SHA256 hash of the file, 64 hexadecimal characters')
);

/** Case ids are numeric; the response action APIs take them as strings. */
export const StringCaseIdSchema = lazySchema(() =>
  z
    .string()
    .max(32)
    .regex(/^[0-9]{1,32}$/, 'Enter a numeric case id')
    .optional()
    .describe(
      'Optional Cortex XDR case id (digits, e.g. "1234"); the action then appears on that case timeline'
    )
);

/** The hash list and restore APIs take the case id as an integer. */
export const IntegerCaseIdSchema = lazySchema(() =>
  z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Optional Cortex XDR case id (integer, e.g. 1234) to link the change to')
);

export const epochMs = (what: string) =>
  z.number().int().min(0).optional().describe(`${what} (epoch milliseconds, e.g. 1735689600000)`);

export const searchFrom = () =>
  z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(
      'Zero-based offset of the first row to return. To continue a previous call, pass its nextSearchFrom. Defaults to 0.'
    );

export const maxResults = () =>
  z
    .number()
    .int()
    .min(1)
    .max(MAX_RESULTS)
    .default(DEFAULT_MAX_RESULTS)
    .describe(
      `How many rows to collect across pages of 100 (1-${MAX_RESULTS}, default ${DEFAULT_MAX_RESULTS})`
    );

/** A numeric action id, given as a number or a string of digits. */
export const actionId = (returnedBy: string) =>
  z
    .union([
      z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
      z
        .string()
        .max(16)
        .regex(/^[1-9][0-9]{0,15}$/, 'Enter a numeric action id'),
    ])
    .describe(`Action id returned by ${returnedBy} (reply.action_id), e.g. 1234 or "1234"`);
