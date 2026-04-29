/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  isOffsetInsideMaskedRange,
  liquidAwareEsqlSlice,
} from './liquid_aware_esql_slice';

describe('liquidAwareEsqlSlice', () => {
  it('returns the input unchanged when no Liquid markers are present', () => {
    const result = liquidAwareEsqlSlice('FROM logs-* | LIMIT 10');
    expect(result.text).toBe('FROM logs-* | LIMIT 10');
    expect(result.maskedRanges).toEqual([]);
  });

  it('replaces a {{ ... }} expression with whitespace of the same length', () => {
    const input = 'FROM logs-{{ inputs.env }}-*';
    const result = liquidAwareEsqlSlice(input);
    expect(result.text).toHaveLength(input.length);
    expect(result.text.startsWith('FROM logs-')).toBe(true);
    expect(result.text.endsWith('-*')).toBe(true);
    // The masked region should be entirely whitespace.
    expect(result.text.slice(10, 26)).toBe(' '.repeat(16));
    expect(result.maskedRanges).toEqual([{ start: 10, end: 26 }]);
  });

  it('replaces {%- ... -%} block markers with whitespace', () => {
    const input = '{%- if true -%}FROM logs-*{%- endif -%}';
    const result = liquidAwareEsqlSlice(input);
    expect(result.text).toHaveLength(input.length);
    expect(result.text.includes('FROM logs-*')).toBe(true);
    expect(result.maskedRanges).toHaveLength(2);
  });

  it('handles multiple Liquid spans on one line', () => {
    const input = 'FROM {{ a }} | WHERE {{ b }}';
    const result = liquidAwareEsqlSlice(input);
    expect(result.maskedRanges).toHaveLength(2);
    expect(result.text.length).toBe(input.length);
  });

  it('isOffsetInsideMaskedRange detects offsets inside any masked region', () => {
    const ranges = [
      { start: 10, end: 20 },
      { start: 30, end: 40 },
    ];
    expect(isOffsetInsideMaskedRange(15, ranges)).toBe(true);
    expect(isOffsetInsideMaskedRange(35, ranges)).toBe(true);
    expect(isOffsetInsideMaskedRange(20, ranges)).toBe(false); // end-exclusive
    expect(isOffsetInsideMaskedRange(25, ranges)).toBe(false);
    expect(isOffsetInsideMaskedRange(0, ranges)).toBe(false);
  });
});
