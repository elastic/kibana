/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Mark a value as possibly undefined. Useful for array and object access
 * which won't account for the possibility where the item at the specified
 * index is undefined. E.g.:
 *
 * const val = maybe(obj[key]);
 */
export function maybe<T>(value: T): T | undefined;

export function maybe(val: unknown) {
  return val;
}
