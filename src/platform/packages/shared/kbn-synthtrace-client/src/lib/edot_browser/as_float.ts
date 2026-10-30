/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Rounds a value like `performance.now()` does and guarantees a fractional part in JSON, so
 * Elasticsearch dynamic mapping types the field as `float` even when the value is integral.
 */
export const asFloat = (value: number, decimals: number = 1): number => {
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return Number.isInteger(rounded) ? rounded + 1 / (factor * 100) : rounded;
};
