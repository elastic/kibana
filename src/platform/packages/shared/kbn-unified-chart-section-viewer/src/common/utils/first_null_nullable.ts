/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Returns the "primary" (first/single) value for display or chart use.
 * - If value is an array: returns the first element that is not null/undefined, or undefined.
 */

export function firstNonNullable<T>(values: T[]): T extends NonNullable<T> ? T : T | undefined {
  // Find the first element that isn't null or undefined
  const found = values.find((v) => v != null);

  // We use 'as any' for the final return to satisfy the complex conditional type
  return found as any;
}
