/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isSuppressedFetchError } from './is_suppressed_fetch_error';

describe('isSuppressedFetchError', () => {
  it('returns true for AbortError', () => {
    const err = new Error('aborted');
    err.name = 'AbortError';
    expect(isSuppressedFetchError(err)).toBe(true);
  });

  it('returns false for other errors', () => {
    expect(isSuppressedFetchError(new Error('network'))).toBe(false);
    expect(isSuppressedFetchError(new TypeError('x'))).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(isSuppressedFetchError(undefined)).toBe(false);
    expect(isSuppressedFetchError(null)).toBe(false);
    expect(isSuppressedFetchError('string')).toBe(false);
  });
});
