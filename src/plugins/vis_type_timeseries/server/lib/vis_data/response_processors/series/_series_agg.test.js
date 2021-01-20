/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SeriesAgg as seriesAgg } from './_series_agg';

describe('seriesAgg', () => {
  const series = [
    [
      [0, 2],
      [1, 1],
      [2, 3],
    ],
    [
      [0, 4],
      [1, 2],
      [2, 3],
    ],
    [
      [0, 2],
      [1, 1],
      [2, 3],
    ],
  ];

  describe('basic', () => {
    test('returns the series sum', () => {
      expect(seriesAgg.sum(series)).toEqual([
        [
          [0, 8],
          [1, 4],
          [2, 9],
        ],
      ]);
    });

    test('returns the series max', () => {
      expect(seriesAgg.max(series)).toEqual([
        [
          [0, 4],
          [1, 2],
          [2, 3],
        ],
      ]);
    });

    test('returns the series min', () => {
      expect(seriesAgg.min(series)).toEqual([
        [
          [0, 2],
          [1, 1],
          [2, 3],
        ],
      ]);
    });

    test('returns the series mean', () => {
      expect(seriesAgg.mean(series)).toEqual([
        [
          [0, 8 / 3],
          [1, 4 / 3],
          [2, 3],
        ],
      ]);
    });
  });

  describe('overall', () => {
    test('returns the series overall sum', () => {
      expect(seriesAgg.overall_sum(series)).toEqual([
        [
          [0, 21],
          [1, 21],
          [2, 21],
        ],
      ]);
    });

    test('returns the series overall max', () => {
      expect(seriesAgg.overall_max(series)).toEqual([
        [
          [0, 4],
          [1, 4],
          [2, 4],
        ],
      ]);
    });

    test('returns the series overall min', () => {
      expect(seriesAgg.overall_min(series)).toEqual([
        [
          [0, 1],
          [1, 1],
          [2, 1],
        ],
      ]);
    });

    test('returns the series overall mean', () => {
      const value = (8 + 4 + 9) / 3;
      expect(seriesAgg.overall_avg(series)).toEqual([
        [
          [0, value],
          [1, value],
          [2, value],
        ],
      ]);
    });
  });

  describe('cumulative sum', () => {
    test('returns the series cumulative sum', () => {
      expect(seriesAgg.cumulative_sum(series)).toEqual([
        [
          [0, 8],
          [1, 12],
          [2, 21],
        ],
      ]);
    });
  });
});
