/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
export type ValidateKqlAgainstSchemaResult =
  | {
      valid: true;
    }
  | {
      valid: false;
      error: string;
    };
export interface ValidateKqlAgainstSchemaOptions {
  /**
   * Prefix for schema-derived field paths (e.g. "event" for trigger conditions using event.severity).
   * When set, allowed paths are prefix, prefix.path1, prefix.path2, ...
   * When omitted, allowed paths are the schema paths as-is.
   */
  fieldPrefix?: string;
}
/**
 * Validates a KQL string in two ways:
 * 1. Ensures the string is valid KQL (parseable syntax).
 * 2. Ensures every field referenced in the KQL is a property path allowed by the schema.
 *
 * @param kql - The KQL string to validate (e.g. a trigger condition like `event.severity == "high"`).
 * @param schema - A Zod schema describing allowed properties (e.g. event payload schema).
 * @param options - Optional settings; use fieldPrefix when KQL uses a root (e.g. "event." for "event.severity").
 * @returns { valid: true } or { valid: false, error: string }.
 *
 * @example
 * ```ts
 * const eventSchema = z.object({ severity: z.string(), message: z.string() });
 * validateKqlAgainstSchema('event.severity: "high"', eventSchema, { fieldPrefix: 'event.' });
 * // { valid: true }
 *
 * validateKqlAgainstSchema('event.unknown: "x"', eventSchema, { fieldPrefix: 'event.' });
 * // { valid: false, error: "KQL references field 'event.unknown' which is not part of event.* properties." }
 *
 * validateKqlAgainstSchema('invalid (', eventSchema);
 * // { valid: false, error: "<parse error message>" }
 * ```
 */
export declare function validateKqlAgainstSchema(
  kql: string,
  schema: z.ZodType,
  options?: ValidateKqlAgainstSchemaOptions
): ValidateKqlAgainstSchemaResult;
