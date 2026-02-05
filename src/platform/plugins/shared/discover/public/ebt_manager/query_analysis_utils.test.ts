/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MultiMatchAnalysis } from './query_analysis_utils';
import { mergeMultiMatchAnalyses } from './query_analysis_utils';

describe('mergeMultiMatchAnalyses', () => {
  it('should return empty analysis for empty input array', () => {
    const result = mergeMultiMatchAnalyses([]);
    expect(result.typeCounts.size).toBe(0);
    expect(result.rawTypes).toEqual([]);
  });

  it('should return the same analysis if only one is provided', () => {
    const analysis: MultiMatchAnalysis = {
      typeCounts: new Map([
        ['match_phrase', 2],
        ['best_fields', 1],
      ]),
      rawTypes: ['phrase', 'match_phrase', 'best_fields'],
    };

    const result = mergeMultiMatchAnalyses([analysis]);

    expect(result.typeCounts).toEqual(analysis.typeCounts);
    expect(result.rawTypes).toEqual(analysis.rawTypes);
  });

  it('should correctly merge counts and raw types from multiple analyses', () => {
    const analysis1: MultiMatchAnalysis = {
      typeCounts: new Map([
        ['match_phrase', 2],
        ['best_fields', 1],
      ]),
      rawTypes: ['phrase', 'match_phrase', 'best_fields'],
    };

    const analysis2: MultiMatchAnalysis = {
      typeCounts: new Map([
        ['match_phrase', 1],
        ['most_fields', 3],
      ]),
      rawTypes: ['phrase', 'most_fields', 'most_fields', 'most_fields'],
    };

    const result = mergeMultiMatchAnalyses([analysis1, analysis2]);

    // Check counts
    expect(result.typeCounts.get('match_phrase')).toBe(3); // 2 + 1
    expect(result.typeCounts.get('best_fields')).toBe(1); // 1 + 0
    expect(result.typeCounts.get('most_fields')).toBe(3); // 0 + 3
    expect(result.typeCounts.size).toBe(3);

    // Check raw types
    expect(result.rawTypes).toHaveLength(7);
    expect(result.rawTypes).toEqual([
      'phrase',
      'match_phrase',
      'best_fields',
      'phrase',
      'most_fields',
      'most_fields',
      'most_fields',
    ]);
  });

  it('should handle analyses with empty maps or arrays', () => {
    const analysis1: MultiMatchAnalysis = {
      typeCounts: new Map([['best_fields', 1]]),
      rawTypes: ['best_fields'],
    };

    const emptyAnalysis: MultiMatchAnalysis = {
      typeCounts: new Map(),
      rawTypes: [],
    };

    const result = mergeMultiMatchAnalyses([analysis1, emptyAnalysis]);

    expect(result.typeCounts.get('best_fields')).toBe(1);
    expect(result.typeCounts.size).toBe(1);
    expect(result.rawTypes).toEqual(['best_fields']);
  });
});
