/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function isPropertyAccess(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }

  // Trim whitespace
  const trimmed = str.trim();
  if (!trimmed) {
    return false;
  }

  // Regular expression to match valid property access patterns
  // Pattern explanation:
  // - Start with a valid identifier: [a-zA-Z_$][a-zA-Z0-9_$]*
  // - Followed by zero or more property accessors:
  //   - Dot notation for identifiers: \.[a-zA-Z_$][a-zA-Z0-9_$]*
  //   - Dot notation for array indices: \.[0-9]+
  //   - Bracket notation with single quotes: \['[^']*'\]
  //   - Bracket notation with double quotes: \["[^"]*"\]
  //   - Bracket notation with numeric indices: \[[0-9]+\]
  const propertyAccessPattern =
    /^[a-zA-Z_$][a-zA-Z0-9_$]*(?:(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)|(?:\.[0-9]+)|(?:\['[^']*'\])|(?:\["[^"]*"\])|(?:\[[0-9]+\]))*$/;

  return propertyAccessPattern.test(trimmed);
}
