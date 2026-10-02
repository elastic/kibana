/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getTermsConversionFailure,
  getTermsConversionFailures,
  type TermsConversionContext,
} from './get_terms_conversion_failure';
import { createTermsColumn } from './__mocks__/esql_query_mocks';

const context = (overrides: Partial<TermsConversionContext> = {}): TermsConversionContext => ({
  hasDateHistogram: false,
  termsBucketCount: 1,
  ...overrides,
});

describe('getTermsConversionFailures', () => {
  it('returns an empty list for an eligible terms column', () => {
    expect(getTermsConversionFailures(createTermsColumn(), context())).toEqual([]);
  });

  it('returns terms_date_histogram_not_supported when a date histogram is present', () => {
    expect(
      getTermsConversionFailures(createTermsColumn(), context({ hasDateHistogram: true }))
    ).toEqual(['terms_date_histogram_not_supported']);
  });

  it('allows an outer/inner terms pair', () => {
    expect(
      getTermsConversionFailures(createTermsColumn(), context({ termsBucketCount: 2 }))
    ).toEqual([]);
  });

  it('returns terms_multi_level_not_supported beyond two terms buckets', () => {
    expect(
      getTermsConversionFailures(createTermsColumn(), context({ termsBucketCount: 3 }))
    ).toEqual(['terms_multi_level_not_supported']);
  });

  it('returns terms_multiple_fields_not_supported for multi-terms secondary fields', () => {
    expect(
      getTermsConversionFailures(createTermsColumn({ secondaryFields: ['geo.src'] }), context())
    ).toEqual(['terms_multiple_fields_not_supported']);
  });

  it('returns terms_accuracy_mode_not_supported when accuracy mode is enabled', () => {
    expect(
      getTermsConversionFailures(createTermsColumn({ accuracyMode: true }), context())
    ).toEqual(['terms_accuracy_mode_not_supported']);
  });

  it('returns terms_include_exclude_not_supported when include filters are set', () => {
    expect(
      getTermsConversionFailures(createTermsColumn({ include: ['host-a'] }), context())
    ).toEqual(['terms_include_exclude_not_supported']);
  });

  it('returns terms_include_exclude_not_supported when exclude filters are set', () => {
    expect(
      getTermsConversionFailures(createTermsColumn({ exclude: ['host-b'] }), context())
    ).toEqual(['terms_include_exclude_not_supported']);
  });

  it('returns terms_other_bucket_not_supported when other bucket is enabled', () => {
    expect(getTermsConversionFailures(createTermsColumn({ otherBucket: true }), context())).toEqual(
      ['terms_other_bucket_not_supported']
    );
  });

  it('allows conversion when other bucket is unset', () => {
    const column = createTermsColumn();
    delete column.params.otherBucket;
    expect(getTermsConversionFailures(column, context())).toEqual([]);
  });

  it.each([{ type: 'rare' as const, maxDocCount: 3 }, { type: 'significant' as const }])(
    'returns terms_order_by_not_supported for orderBy $type',
    (orderBy) => {
      expect(getTermsConversionFailures(createTermsColumn({ orderBy }), context())).toEqual([
        'terms_order_by_not_supported',
      ]);
    }
  );

  it('returns terms_custom_order_by_not_supported for custom ranking', () => {
    expect(
      getTermsConversionFailures(createTermsColumn({ orderBy: { type: 'custom' } }), context())
    ).toEqual(['terms_custom_order_by_not_supported']);
  });

  it('returns every blocker in check order', () => {
    expect(
      getTermsConversionFailures(
        createTermsColumn({
          accuracyMode: true,
          otherBucket: true,
          orderBy: { type: 'rare', maxDocCount: 3 },
        }),
        context({ hasDateHistogram: true })
      )
    ).toEqual([
      'terms_other_bucket_not_supported',
      'terms_date_histogram_not_supported',
      'terms_accuracy_mode_not_supported',
      'terms_order_by_not_supported',
    ]);
  });

  it('allows orderBy column and alphabetical', () => {
    expect(
      getTermsConversionFailures(
        createTermsColumn({ orderBy: { type: 'column', columnId: 'metric-1' } }),
        context()
      )
    ).toEqual([]);
    expect(
      getTermsConversionFailures(
        createTermsColumn({ orderBy: { type: 'alphabetical' } }),
        context()
      )
    ).toEqual([]);
  });
});

describe('getTermsConversionFailure', () => {
  it('returns the first blocker only', () => {
    expect(
      getTermsConversionFailure(
        createTermsColumn({ accuracyMode: true, otherBucket: true }),
        context()
      )
    ).toBe('terms_other_bucket_not_supported');
  });

  it('returns undefined when eligible', () => {
    expect(getTermsConversionFailure(createTermsColumn(), context())).toBeUndefined();
  });
});
