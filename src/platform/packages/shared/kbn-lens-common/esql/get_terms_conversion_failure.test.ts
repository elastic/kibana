/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTermsConversionFailure } from './get_terms_conversion_failure';
import { createTermsColumn } from './__mocks__/esql_query_mocks';

describe('getTermsConversionFailure', () => {
  it('returns undefined for an eligible terms column', () => {
    expect(
      getTermsConversionFailure(createTermsColumn(), { hasDateHistogram: false })
    ).toBeUndefined();
  });

  it('returns terms_not_supported when a date histogram is present', () => {
    expect(getTermsConversionFailure(createTermsColumn(), { hasDateHistogram: true })).toBe(
      'terms_not_supported'
    );
  });

  it('returns terms_not_supported for multi-terms secondary fields', () => {
    expect(
      getTermsConversionFailure(createTermsColumn({ secondaryFields: ['geo.src'] }), {
        hasDateHistogram: false,
      })
    ).toBe('terms_not_supported');
  });

  it('returns terms_not_supported when accuracy mode is enabled', () => {
    expect(
      getTermsConversionFailure(createTermsColumn({ accuracyMode: true }), {
        hasDateHistogram: false,
      })
    ).toBe('terms_not_supported');
  });

  it('returns terms_not_supported when include filters are set', () => {
    expect(
      getTermsConversionFailure(createTermsColumn({ include: ['host-a'] }), {
        hasDateHistogram: false,
      })
    ).toBe('terms_not_supported');
  });

  it('returns terms_not_supported when exclude filters are set', () => {
    expect(
      getTermsConversionFailure(createTermsColumn({ exclude: ['host-b'] }), {
        hasDateHistogram: false,
      })
    ).toBe('terms_not_supported');
  });

  it('returns terms_other_bucket_not_supported when other bucket is enabled', () => {
    expect(
      getTermsConversionFailure(createTermsColumn({ otherBucket: true }), {
        hasDateHistogram: false,
      })
    ).toBe('terms_other_bucket_not_supported');
  });

  it('returns terms_other_bucket_not_supported when other bucket is unset', () => {
    const column = createTermsColumn();
    delete column.params.otherBucket;
    expect(getTermsConversionFailure(column, { hasDateHistogram: false })).toBe(
      'terms_other_bucket_not_supported'
    );
  });

  it.each([
    { type: 'rare' as const, maxDocCount: 3 },
    { type: 'significant' as const },
    { type: 'custom' as const },
  ])('returns terms_order_by_not_supported for orderBy $type', (orderBy) => {
    expect(
      getTermsConversionFailure(createTermsColumn({ orderBy }), { hasDateHistogram: false })
    ).toBe('terms_order_by_not_supported');
  });

  it('allows orderBy column and alphabetical', () => {
    expect(
      getTermsConversionFailure(
        createTermsColumn({ orderBy: { type: 'column', columnId: 'metric-1' } }),
        { hasDateHistogram: false }
      )
    ).toBeUndefined();
    expect(
      getTermsConversionFailure(createTermsColumn({ orderBy: { type: 'alphabetical' } }), {
        hasDateHistogram: false,
      })
    ).toBeUndefined();
  });
});
