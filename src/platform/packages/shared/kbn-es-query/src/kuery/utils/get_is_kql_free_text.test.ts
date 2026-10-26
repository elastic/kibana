/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getIsKqlFreeTextExpression } from './get_is_kql_free_text';

describe('getIsKqlFreeTextExpression', () => {
  it('returns true for simple free text', () => {
    expect(getIsKqlFreeTextExpression('foo')).toBe(true);
    expect(getIsKqlFreeTextExpression('bar baz')).toBe(true);
    expect(getIsKqlFreeTextExpression('"quoted text"')).toBe(true);
  });

  it('returns false for fielded queries', () => {
    expect(getIsKqlFreeTextExpression('service.name: my-service')).toBe(false);
    expect(getIsKqlFreeTextExpression('host.name: "host"')).toBe(false);
    expect(getIsKqlFreeTextExpression('user.id: 123 or user.name: "Alice"')).toBe(false);
  });

  it('returns true for mixed fielded and free text', () => {
    expect(getIsKqlFreeTextExpression('service.name: my-service AND foo')).toBe(true);
    expect(getIsKqlFreeTextExpression('bar OR host.name: "host"')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(getIsKqlFreeTextExpression('')).toBe(false);
  });

  it('returns false for nested field queries', () => {
    expect(getIsKqlFreeTextExpression('user.names:{ first: "Alice" and last: "White" }')).toBe(
      false
    );
  });
});
