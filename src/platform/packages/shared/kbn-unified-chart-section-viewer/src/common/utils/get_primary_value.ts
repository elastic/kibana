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
 * - If value is a single value: returns it as-is (or undefined if null/undefined).
 * Use this instead of scattering `[0]` when consuming MetricField array properties.
 */

type MaybeArray<T> = T | T[] | null | undefined;

export function getPrimaryValue<T>(value: MaybeArray<T>): T | undefined {
  if (value == null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    const first = value.find((v) => v != null);
    return first as T | undefined;
  }
  return value;
}
