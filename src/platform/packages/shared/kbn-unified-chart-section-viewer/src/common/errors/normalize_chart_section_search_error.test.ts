/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlResponseError } from './esql_response_error';
import { normalizeChartSectionSearchError } from './normalize_chart_section_search_error';

describe('normalizeChartSectionSearchError', () => {
  it('returns the same Error instance', () => {
    const error = new Error('network');
    expect(normalizeChartSectionSearchError(error)).toBe(error);
  });

  it('returns EsqlResponseError instances unchanged', () => {
    const error = new EsqlResponseError({ type: 'x', reason: 'y' });
    expect(normalizeChartSectionSearchError(error)).toBe(error);
  });

  it('wraps non-empty strings in Error', () => {
    const error = normalizeChartSectionSearchError('fetch failed');
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('fetch failed');
  });

  it('wraps other values with String()', () => {
    expect(normalizeChartSectionSearchError(42).message).toBe('42');
    expect(normalizeChartSectionSearchError(null).message).toBe('null');
  });
});
