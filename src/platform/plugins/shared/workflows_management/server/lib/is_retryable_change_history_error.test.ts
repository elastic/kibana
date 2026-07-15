/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isRetryableChangeHistoryError } from './is_retryable_change_history_error';

describe('isRetryableChangeHistoryError', () => {
  it('returns true for 5xx status codes', () => {
    expect(isRetryableChangeHistoryError({ statusCode: 503 })).toBe(true);
    expect(isRetryableChangeHistoryError({ meta: { statusCode: 500 } })).toBe(true);
  });

  it('returns true for retryable 4xx status codes', () => {
    expect(isRetryableChangeHistoryError({ statusCode: 429 })).toBe(true);
    expect(isRetryableChangeHistoryError({ statusCode: 408 })).toBe(true);
  });

  it('returns false for non-retryable 4xx status codes', () => {
    expect(isRetryableChangeHistoryError({ statusCode: 400 })).toBe(false);
    expect(isRetryableChangeHistoryError({ statusCode: 404 })).toBe(false);
  });

  it('returns true for known transient connection error names', () => {
    expect(isRetryableChangeHistoryError({ name: 'ConnectionError' })).toBe(true);
    expect(isRetryableChangeHistoryError({ name: 'NoLivingConnectionsError' })).toBe(true);
    expect(isRetryableChangeHistoryError({ name: 'TimeoutError' })).toBe(true);
  });

  it('returns false for unknown errors', () => {
    expect(isRetryableChangeHistoryError(new Error('boom'))).toBe(false);
    expect(isRetryableChangeHistoryError(null)).toBe(false);
  });

  describe('wrapped errors (Error with cause)', () => {
    it('returns true when cause has a retryable 5xx status code', () => {
      const cause = { statusCode: 503, name: 'ResponseError' };
      const wrapped = new Error('Error saving change history: ...', { cause });
      expect(isRetryableChangeHistoryError(wrapped)).toBe(true);
    });

    it('returns true when cause has a retryable connection error name', () => {
      const cause = { name: 'NoLivingConnectionsError' };
      const wrapped = new Error('Error saving change history: ...', { cause });
      expect(isRetryableChangeHistoryError(wrapped)).toBe(true);
    });

    it('returns true when cause has a retryable 429 status code', () => {
      const cause = { statusCode: 429 };
      const wrapped = new Error('Error saving change history: ...', { cause });
      expect(isRetryableChangeHistoryError(wrapped)).toBe(true);
    });

    it('returns false when cause has a non-retryable 4xx status code', () => {
      const cause = { statusCode: 400 };
      const wrapped = new Error('Error saving change history: ...', { cause });
      expect(isRetryableChangeHistoryError(wrapped)).toBe(false);
    });

    it('returns true when cause has meta.statusCode with a 5xx', () => {
      const cause = { meta: { statusCode: 502 } };
      const wrapped = new Error('Error saving change history: ...', { cause });
      expect(isRetryableChangeHistoryError(wrapped)).toBe(true);
    });
  });
});
