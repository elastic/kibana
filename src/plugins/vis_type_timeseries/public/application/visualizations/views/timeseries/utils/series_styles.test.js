/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getBarStyles, getAreaStyles } from './series_styles';

describe('src/legacy/core_plugins/metrics/public/visualizations/views/timeseries/utils/series_styles.js', () => {
  let bars;
  let color;
  let points;
  let lines;

  beforeEach(() => {
    bars = {
      fill: 0.5,
      lineWidth: 2,
      show: true,
    };
    color = 'rgb(224, 0, 221)';
    points = {
      lineWidth: 1,
      show: true,
      radius: 1,
    };
    lines = {
      fill: 0,
      lineWidth: 1,
      show: true,
      steps: true,
    };
  });

  describe('getBarStyles()', () => {
    test('should match a snapshot', () => {
      expect(getBarStyles(bars, color)).toMatchSnapshot();
    });

    test('should set default values if bars and colors are empty', () => {
      bars = {};
      color = '';

      expect(getBarStyles(bars, color)).toMatchSnapshot();
    });
  });

  describe('getAreaStyles()', () => {
    test('should match a snapshot', () => {
      expect(getAreaStyles({ points, lines, color })).toMatchSnapshot();
    });

    test('should set default values if points, lines and color are empty', () => {
      points = {};
      lines = {};
      color = '';

      expect(getAreaStyles({ points, lines, color })).toMatchSnapshot();
    });
  });
});
