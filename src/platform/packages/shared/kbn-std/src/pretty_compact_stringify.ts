/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface PrettyCompactStringifyOptions {
  /**
   * Maximum line length before breaking to multiple lines.
   * @default 80
   */
  maxLength?: number;
  /**
   * Number of spaces for indentation.
   * @default 2
   */
  indent?: number;
  /**
   * A function that alters the behavior of the stringification process,
   * or an array of strings/numbers to filter properties.
   */
  replacer?: ((key: string, value: unknown) => unknown) | (string | number)[] | null;
}

/**
 * Pretty-prints JSON in a compact format that balances readability with space efficiency.
 *
 * Short objects and arrays are kept on a single line when they fit within `maxLength`.
 * Longer structures are broken across multiple lines with proper indentation.
 *
 * This is useful for displaying JSON in editors or logs where both readability
 * and compact output are desired.
 *
 * @param value - The value to stringify
 * @param options - Configuration options for formatting
 * @returns A formatted JSON string
 *
 * @example
 * // Short arrays stay on one line
 * prettyCompactStringify([1, 2, 3])
 * // => "[1, 2, 3]"
 *
 * @example
 * // Long arrays break to multiple lines
 * prettyCompactStringify([{ x: 1, y: 2 }, { x: 2, y: 1 }], { maxLength: 20 })
 * // => "[\n  {\"x\": 1, \"y\": 2},\n  {\"x\": 2, \"y\": 1}\n]"
 */
export function prettyCompactStringify(
  value: unknown,
  options: PrettyCompactStringifyOptions = {}
): string {
  const { maxLength = 80, indent = 2, replacer = null } = options;

  return stringifyValue(value, '', indent, maxLength, replacer);
}

function stringifyValue(
  value: unknown,
  currentIndent: string,
  indentStep: number,
  maxLength: number,
  replacer: ((key: string, value: unknown) => unknown) | (string | number)[] | null
): string {
  // Handle primitives
  if (value === null || value === undefined) {
    return 'null';
  }

  const type = typeof value;
  if (type === 'boolean' || type === 'number') {
    return String(value);
  }
  if (type === 'string') {
    return JSON.stringify(value);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }

    // Try compact form first
    const compactItems = value.map((item) =>
      stringifyValue(item, '', indentStep, maxLength, replacer)
    );
    const compactResult = '[' + compactItems.join(', ') + ']';

    if (compactResult.length <= maxLength && !compactResult.includes('\n')) {
      return compactResult;
    }

    // Fall back to expanded form
    const nextIndent = currentIndent + ' '.repeat(indentStep);
    const expandedItems = value.map(
      (item) => nextIndent + stringifyValue(item, nextIndent, indentStep, maxLength, replacer)
    );
    return '[\n' + expandedItems.join(',\n') + '\n' + currentIndent + ']';
  }

  // Handle objects
  if (type === 'object') {
    const obj = value as Record<string, unknown>;
    let keys = Object.keys(obj);

    // Apply replacer if it's an array
    if (Array.isArray(replacer)) {
      const allowedKeys = new Set(replacer.map(String));
      keys = keys.filter((k) => allowedKeys.has(k));
    }

    if (keys.length === 0) {
      return '{}';
    }

    // Build key-value pairs
    const pairs = keys
      .map((key) => {
        let val = obj[key];

        // Apply replacer if it's a function
        if (typeof replacer === 'function') {
          val = replacer(key, val);
        }

        if (val === undefined) {
          return null;
        }

        const stringifiedValue = stringifyValue(val, '', indentStep, maxLength, replacer);
        return { key, value: stringifiedValue };
      })
      .filter((pair): pair is { key: string; value: string } => pair !== null);

    if (pairs.length === 0) {
      return '{}';
    }

    // Try compact form first
    const compactPairs = pairs.map((p) => JSON.stringify(p.key) + ': ' + p.value);
    const compactResult = '{' + compactPairs.join(', ') + '}';

    if (compactResult.length <= maxLength && !compactResult.includes('\n')) {
      return compactResult;
    }

    // Fall back to expanded form
    const nextIndent = currentIndent + ' '.repeat(indentStep);
    const expandedPairs = pairs.map((p) => {
      const expandedValue = stringifyValue(obj[p.key], nextIndent, indentStep, maxLength, replacer);
      return nextIndent + JSON.stringify(p.key) + ': ' + expandedValue;
    });
    return '{\n' + expandedPairs.join(',\n') + '\n' + currentIndent + '}';
  }

  // Fallback for any other type
  return JSON.stringify(value);
}
