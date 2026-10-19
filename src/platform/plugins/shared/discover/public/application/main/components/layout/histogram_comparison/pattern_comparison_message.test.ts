/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPatternComparisonMessageState } from './pattern_comparison_message';

const selection = {
  key: 'selection',
  label: 'Pattern',
  column: 'CATEGORIZE(message)',
  value: '.*?Pattern.*?',
  documentQuery: 'FROM logs | WHERE MATCH(message, "Pattern")',
};

describe('getPatternComparisonMessageState', () => {
  it('shows a hint only when an eligible visible chart has no selection', () => {
    expect(
      getPatternComparisonMessageState({
        defaultHistogramAvailable: true,
        chartHidden: false,
        selection: undefined,
        result: undefined,
      })
    ).toBe('hint');
    expect(
      getPatternComparisonMessageState({
        defaultHistogramAvailable: false,
        chartHidden: false,
        selection: undefined,
        result: undefined,
      })
    ).toBeUndefined();
  });

  it('shows only approximate or unavailable results for the active selection', () => {
    expect(
      getPatternComparisonMessageState({
        defaultHistogramAvailable: true,
        chartHidden: false,
        selection,
        result: { key: selection.key, status: 'approximate' },
      })
    ).toBe('approximate');
    expect(
      getPatternComparisonMessageState({
        defaultHistogramAvailable: true,
        chartHidden: false,
        selection,
        result: { key: 'stale', status: 'unavailable' },
      })
    ).toBeUndefined();
    expect(
      getPatternComparisonMessageState({
        defaultHistogramAvailable: true,
        chartHidden: false,
        selection,
        result: { key: selection.key, status: 'loading' },
      })
    ).toBeUndefined();
  });
});
