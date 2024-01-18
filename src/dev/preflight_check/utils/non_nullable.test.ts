/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { nonNullable } from './non_nullable';

describe('nonNullable', () => {
  it('returns true for non-nullable values', () => {
    expect(nonNullable(0)).toBe(true);
    expect(nonNullable('')).toBe(true);
    expect(nonNullable(false)).toBe(true);
    expect(nonNullable({})).toBe(true);
    expect(nonNullable([])).toBe(true);
    expect(nonNullable(() => {})).toBe(true);
  });

  it('returns false for nullable values', () => {
    expect(nonNullable(null)).toBe(false);
    expect(nonNullable(undefined)).toBe(false);
  });
});
