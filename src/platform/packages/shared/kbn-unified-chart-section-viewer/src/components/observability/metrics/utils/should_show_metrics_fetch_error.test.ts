/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  isSuppressedMetricsFetchError,
  shouldShowMetricsFetchError,
} from './should_show_metrics_fetch_error';

describe('isSuppressedMetricsFetchError', () => {
  it('returns true for AbortError', () => {
    const err = new Error('aborted');
    err.name = 'AbortError';
    expect(isSuppressedMetricsFetchError(err)).toBe(true);
  });

  it('returns false for other errors', () => {
    expect(isSuppressedMetricsFetchError(new Error('network'))).toBe(false);
    expect(isSuppressedMetricsFetchError(new TypeError('x'))).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(isSuppressedMetricsFetchError(undefined)).toBe(false);
    expect(isSuppressedMetricsFetchError(null)).toBe(false);
    expect(isSuppressedMetricsFetchError('string')).toBe(false);
  });
});

describe('shouldShowMetricsFetchError', () => {
  it('returns false when there is no error', () => {
    expect(shouldShowMetricsFetchError(undefined, false)).toBe(false);
    expect(shouldShowMetricsFetchError(null, false)).toBe(false);
  });

  it('returns false while loading', () => {
    expect(shouldShowMetricsFetchError(new Error('fail'), true)).toBe(false);
  });

  it('returns false for suppressed errors', () => {
    const err = new Error('aborted');
    err.name = 'AbortError';
    expect(shouldShowMetricsFetchError(err, false)).toBe(false);
  });

  it('returns true for a non-suppressed error when not loading', () => {
    expect(shouldShowMetricsFetchError(new Error('METRICS_INFO failed'), false)).toBe(true);
  });
});
