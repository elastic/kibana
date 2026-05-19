/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findChangedRegion } from './utils';

describe('findChangedRegion', () => {
  it('identifies a single changed line at the end', () => {
    const original = [
      'FROM kibana_sample_data_flights',
      '| WHERE AvgTicketPrice > 500',
      '| SORT avg DESCENGING',
    ];
    const fixed = [
      'FROM kibana_sample_data_flights',
      '| WHERE AvgTicketPrice > 500',
      '| SORT avg DESC',
    ];
    expect(findChangedRegion(original, fixed)).toEqual({ prefixLen: 2, suffixLen: 0 });
  });

  it('identifies a single changed line at the beginning', () => {
    const original = ['FROM kibana_sample_data_flits', '| STATS count() BY host'];
    const fixed = ['FROM kibana_sample_data_flights', '| STATS count() BY host'];
    expect(findChangedRegion(original, fixed)).toEqual({ prefixLen: 0, suffixLen: 1 });
  });

  it('treats identical content with different indentation as unchanged', () => {
    const original = [
      'FROM kibana_sample_data_flights',
      '  | WHERE AvgTicketPrice > 500',
      '  | SORT avg DESC',
    ];
    const fixed = [
      'FROM kibana_sample_data_flights',
      '| WHERE AvgTicketPrice > 500',
      '| SORT avg DESC',
    ];
    // All lines match after trimming — indentation-only differences are not a change
    expect(findChangedRegion(original, fixed)).toEqual({ prefixLen: 3, suffixLen: 0 });
  });

  it('returns prefixLen=0 suffixLen=0 when all lines changed', () => {
    const original = ['FROM wrong_index', '| STATS bad_agg'];
    const fixed = ['FROM correct_index', '| STATS count()'];
    expect(findChangedRegion(original, fixed)).toEqual({ prefixLen: 0, suffixLen: 0 });
  });

  it('returns prefixLen equal to length when nothing changed', () => {
    const lines = ['FROM index', '| STATS count()'];
    expect(findChangedRegion(lines, lines)).toEqual({ prefixLen: 2, suffixLen: 0 });
  });

  it('handles a change in the middle with unchanged prefix and suffix', () => {
    const original = [
      'FROM kibana_sample_data_flights',
      '| WHRE AvgTicketPrice > 500',
      '| LIMIT 10',
    ];
    const fixed = ['FROM kibana_sample_data_flights', '| WHERE AvgTicketPrice > 500', '| LIMIT 10'];
    expect(findChangedRegion(original, fixed)).toEqual({ prefixLen: 1, suffixLen: 1 });
  });

  it('handles single-line queries', () => {
    expect(findChangedRegion(['FROM wrong'], ['FROM correct'])).toEqual({
      prefixLen: 0,
      suffixLen: 0,
    });
    expect(findChangedRegion(['FROM same'], ['FROM same'])).toEqual({
      prefixLen: 1,
      suffixLen: 0,
    });
  });
});
