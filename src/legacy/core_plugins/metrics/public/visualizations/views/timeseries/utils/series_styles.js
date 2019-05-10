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

import { get } from 'lodash';
// import { CurveType } from '@elastic/charts';

const DEFAULT_COLOR = '#000';

export const getAreaSeriesStyles = ({ points, lines, color }) => ({
  areaSeriesStyle: {
    line: {
      visible: Boolean(lines),
      stroke: '',
      strokeWidth: get(lines, 'lineWidth', 0),
    },
    area: {
      fill: color,
      opacity: get(lines, 'fill', 1),
      visible: true,
    },
    point: {
      visible: Boolean(points),
      radius: get(points, 'radius', 0.5),
      opacity: 1,
      stroke: '',
      strokeWidth: get(points, 'lineWidth', 0),
    },
  },
});

export const getBarStyles = ({ show = true, lineWidth = 1, fill = 1 }, color) => ({
  barSeriesStyle: {
    border: {
      stroke: color || DEFAULT_COLOR,
      strokeWidth: lineWidth,
      visible: show,
    },
    opacity: fill,
  },
});

export const getSeriesColors = (color, specId) => {
  const map = new Map();
  /**
   * TODO: colorValues for each column should be defined.
   */
  const seriesColorsValues = { specId, colorValues: [] };

  map.set(seriesColorsValues, color);

  return map;
};
