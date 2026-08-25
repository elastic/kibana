/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildJoinedFilter } from './build_joined_filter';

describe('buildJoinedFilter', () => {
  const clause = (field: string) => `${field} IS NOT NULL`;

  it('returns an empty string when fields is undefined', () => {
    expect(buildJoinedFilter(undefined, clause)).toBe('');
  });

  it('returns an empty string when fields is empty', () => {
    expect(buildJoinedFilter([], clause)).toBe('');
  });

  it('builds a single clause without a separator', () => {
    expect(buildJoinedFilter(['a'], clause)).toBe('a IS NOT NULL');
  });

  it('joins multiple clauses with AND by default', () => {
    expect(buildJoinedFilter(['a', 'b'], clause)).toBe('a IS NOT NULL AND b IS NOT NULL');
  });

  it('joins multiple clauses with OR when the separator is provided', () => {
    expect(buildJoinedFilter(['a', 'b'], clause, 'OR')).toBe('a IS NOT NULL OR b IS NOT NULL');
  });
});
