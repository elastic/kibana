/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { nonNullable } from './non_nullable';

describe('nonNullable', () => {
  it('should return true for non-null values', () => {
    expect(nonNullable('foo')).toBe(true);
    expect(nonNullable(0)).toBe(true);
    expect(nonNullable(false)).toBe(true);
    expect(nonNullable(true)).toBe(true);
    expect(nonNullable(1)).toBe(true);
    expect(nonNullable({})).toBe(true);
    expect(nonNullable([])).toBe(true);
  });

  it('should return false for null and undefined values', () => {
    expect(nonNullable(null)).toBe(false);
    expect(nonNullable(undefined)).toBe(false);
  });
});
