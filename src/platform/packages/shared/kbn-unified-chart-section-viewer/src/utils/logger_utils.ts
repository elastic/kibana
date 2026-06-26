/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Narrows a catch block's value to the shape accepted by `Logger.error` /
 * `Logger.warn`: an `Error` instance (auto-serialized to ECS by the platform)
 * or a plain string. Non-Error / non-string values are JSON-serialized so
 * operators retain at least the shape of the failure (e.g. `{ code: 401 }`
 * instead of `'[object Object]'`); cyclic refs or values JSON cannot encode
 * (e.g. `BigInt`, `undefined`) fall back to `String(value)`.
 */
export const toLoggable = (value: unknown): Error | string => {
  if (value instanceof Error) return value;
  if (typeof value === 'string') return value;
  try {
    const serialized = JSON.stringify(value);
    return serialized ?? String(value);
  } catch {
    return String(value);
  }
};
