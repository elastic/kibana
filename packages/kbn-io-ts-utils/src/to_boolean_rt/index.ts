/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

export function isPrimitive(value: unknown): value is string | number | boolean | null | undefined {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    value === undefined
  );
}

export const toBooleanRt = new t.Type<boolean, boolean, unknown>(
  'ToBoolean',
  t.boolean.is,
  (input, context) => {
    if (!isPrimitive(input)) {
      return t.failure(input, context);
    }
    let value: boolean;
    if (typeof input === 'string') {
      value = input === 'true';
    } else {
      value = !!input;
    }

    return t.success(value);
  },
  t.identity
);
