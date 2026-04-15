/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stringify } from 'safe-stable-stringify';

export interface StableStringifyOptions {
  /**
   * Adds indentation for pretty-printing. Can be a number of spaces or a string.
   */
  space?: string | number;
  /**
   * A function or array to filter/transform values during stringification.
   */
  replacer?: ((key: string, value: unknown) => unknown) | (string | number)[] | null;
}

/**
 * Deterministically stringifies a value to JSON with sorted keys.
 * This ensures consistent output regardless of property insertion order,
 * making it ideal for:
 * - Generating cache keys
 * - Creating hashes for comparison
 * - Cryptographic operations requiring deterministic input
 *
 * Also handles circular references safely by replacing them with "[Circular]".
 *
 * @param value - The value to stringify
 * @param options - Optional configuration for formatting
 * @returns A JSON string with keys sorted alphabetically
 */
export function stableStringify(value: unknown, options?: StableStringifyOptions): string {
  const { space, replacer } = options ?? {};
  return stringify(value, replacer as Parameters<typeof stringify>[1], space) ?? '';
}
