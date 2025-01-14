/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDefaultDecoration } from './get_default_decoration';

describe('getDefaultDecoration', () => {
  describe('stack option', () => {
    test('should set a stack option to none', () => {
      const series = {
        id: 'test_id',
        stacked: 'none',
      };
      expect(getDefaultDecoration(series)).toHaveProperty('stack', 'none');
    });

    test('should set a stack option to stacked/percent', () => {
      const series = {
        stacked: 'stacked',
        id: 'test_id',
      };

      expect(getDefaultDecoration(series)).toHaveProperty('stack', 'stacked');

      series.stacked = 'percent';

      expect(getDefaultDecoration(series)).toHaveProperty('stack', 'percent');
    });

    test('should set a stack option to stacked_within_series', () => {
      const series = {
        stacked: 'stacked_within_series',
        id: 'test_id',
      };

      expect(getDefaultDecoration(series)).toHaveProperty('stack', 'stacked_within_series');
    });
  });

  describe('lines', () => {
    test('return decoration for lines', () => {
      const series = {
        point_size: 10,
        chart_type: 'line',
        line_width: 10,
        fill: 1,
      };
      const result = getDefaultDecoration(series);
      expect(result.lines).toHaveProperty('show', true);
      expect(result.lines).toHaveProperty('fill', 1);
      expect(result.lines).toHaveProperty('lineWidth', 10);
      expect(result.points).toHaveProperty('show', true);
      expect(result.points).toHaveProperty('radius', 1);
      expect(result.points).toHaveProperty('lineWidth', 10);
      expect(result.bars).toHaveProperty('show', false);
      expect(result.bars).toHaveProperty('fill', 1);
      expect(result.bars).toHaveProperty('lineWidth', 10);
    });

    test('return decoration for lines without points', () => {
      const series = {
        chart_type: 'line',
        line_width: 10,
        fill: 1,
      };
      const result = getDefaultDecoration(series);
      expect(result.points).toHaveProperty('show', true);
      expect(result.points).toHaveProperty('lineWidth', 10);
    });

    test('return decoration for lines with points set to zero (off)', () => {
      const series = {
        chart_type: 'line',
        line_width: 10,
        fill: 1,
        point_size: 0,
      };
      const result = getDefaultDecoration(series);
      expect(result.points).toHaveProperty('show', false);
    });

    test('return decoration for lines (off)', () => {
      const series = {
        chart_type: 'line',
        line_width: 0,
      };
      const result = getDefaultDecoration(series);
      expect(result.lines).toHaveProperty('show', false);
    });
  });

  describe('bars', () => {
    test('return decoration for bars', () => {
      const series = {
        chart_type: 'bar',
        line_width: 10,
        fill: 1,
      };
      const result = getDefaultDecoration(series);
      expect(result.lines).toHaveProperty('show', false);
      expect(result.points).toHaveProperty('show', false);
      expect(result.bars).toHaveProperty('show', true);
      expect(result.bars).toHaveProperty('fill', 1);
      expect(result.bars).toHaveProperty('lineWidth', 10);
    });
  });
});
