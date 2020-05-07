/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
