/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Prefixes an encoded string with the ESSU dev identifier.
 *
 * @param encoded - The encoded string to prefix
 * @returns The encoded string prefixed with "essu_dev_"
 *
 * @example
 * ```typescript
 * const encoded = "abc123";
 * const prefixed = prefixWithEssuDev(encoded);
 * // Returns: "essu_dev_abc123"
 **/
export function prefixWithEssuDev(encoded: string): string {
  return `essu_dev_${encoded}`;
}

/**
 * Removes the essu_dev_ identifier prefix from a string.
 *
 * @param prefixed - The prefixed string to remove the prefix from
 * @returns The string without the "essu_dev_" prefix
 * @throws Error if the string doesn't start with the expected prefix
 *
 * @example
 * ```typescript
 * const prefixed = "essu_dev_abc123";
 * const unprefixed = removePrefixEssuDev(prefixed);
 * // Returns: "abc123"
 **/
export function removePrefixEssuDev(prefixed: string): string {
  const prefix = 'essu_dev_';
  if (!prefixed.startsWith(prefix)) {
    throw new Error(`String does not start with expected prefix: ${prefix}`);
  }
  return prefixed.slice(prefix.length);
}
