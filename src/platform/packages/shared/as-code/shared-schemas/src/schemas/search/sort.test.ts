/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asCodeSortQuerySchema } from './sort';

describe('asCodeSortQuerySchema', () => {
  it.each(['meta.updated_at', '-meta.updated_at', 'meta.created_at', '-meta.created_at'])(
    'accepts %s',
    (sort) => {
      expect(asCodeSortQuerySchema.parse(sort)).toBe(sort);
    }
  );

  it('allows the parameter to be omitted', () => {
    expect(asCodeSortQuerySchema.parse(undefined)).toBeUndefined();
  });

  it('trims surrounding whitespace', () => {
    expect(asCodeSortQuerySchema.parse('  -meta.updated_at  ')).toBe('-meta.updated_at');
  });

  it('rejects more than one field', () => {
    const result = asCodeSortQuerySchema.safeParse('meta.updated_at,-meta.created_at');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/one field/);
    }
  });

  it('rejects a field outside the timestamp namespace', () => {
    const result = asCodeSortQuerySchema.safeParse('title');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/meta\.updated_at or meta\.created_at/);
    }
  });

  it('rejects an empty value', () => {
    expect(asCodeSortQuerySchema.safeParse('').success).toBe(false);
    expect(asCodeSortQuerySchema.safeParse('-').success).toBe(false);
  });
});
