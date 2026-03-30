/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstNonNullable } from './first_null_nullable';

describe('firstNonNullable', () => {
  it('returns first non-null element from array', () => {
    expect(firstNonNullable(['a', 'b'])).toBe('a');
    expect(firstNonNullable([null, 'b'])).toBe('b');
    expect(firstNonNullable([undefined, 'b'])).toBe('b');
    expect(firstNonNullable([null, undefined, 'c'])).toBe('c');
  });

  it('returns undefined for empty array', () => {
    expect(firstNonNullable([])).toBeUndefined();
  });

  it('returns undefined for array of only null/undefined', () => {
    expect(firstNonNullable([null, undefined])).toBeUndefined();
  });
});
