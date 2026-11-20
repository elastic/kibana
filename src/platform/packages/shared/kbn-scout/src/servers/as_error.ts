/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inspect } from 'util';

/** Narrows a caught value (whatever was thrown, hence `unknown`) to an `Error` with a readable message. */
export function asError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  // a thrown plain object keeps its fields instead of collapsing to "[object Object]"
  return new Error(typeof value === 'string' ? value : inspect(value, { depth: 4 }));
}
