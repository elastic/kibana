/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createMatcherError } from './utils';

describe('createMatcherError', () => {
  it('creates error with expected format', () => {
    const error = createMatcherError({
      expected: 200,
      matcherName: 'toHaveStatusCode',
      received: 404,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('expect(');
    expect(error.message).toContain('toHaveStatusCode');
    expect(error.message).toContain('Expected:');
    expect(error.message).toContain('200');
    expect(error.message).toContain('Received:');
    expect(error.message).toContain('404');
  });

  it('includes "not" in expected when negated', () => {
    const error = createMatcherError({
      expected: 200,
      matcherName: 'toHaveStatusCode',
      received: 200,
      isNegated: true,
    });

    expect(error.message).toContain('Expected: not');
  });
});
