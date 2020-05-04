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

import { CurveType } from '@elastic/charts';

const DEFAULT_COLOR = '#000';

export const getAreaStyles = ({ points, lines, color }) => ({
  areaSeriesStyle: {
    line: {
      stroke: color,
      strokeWidth: Number(lines.lineWidth) || 0,
      visible: Boolean(lines.show && lines.lineWidth),
    },
    area: {
      fill: color,
      opacity: lines.fill <= 0 ? 0 : lines.fill,
      visible: Boolean(lines.show),
    },
    point: {
      radius: points.radius || 0.5,
      stroke: color || DEFAULT_COLOR,
      strokeWidth: points.lineWidth || 5,
      visible: points.lineWidth > 0 && Boolean(points.show),
    },
  },
  curve: lines.steps ? CurveType.CURVE_STEP : CurveType.LINEAR,
});

export const getBarStyles = ({ show = true, lineWidth = 0, fill = 1 }, color) => ({
  barSeriesStyle: {
    rectBorder: {
      stroke: color || DEFAULT_COLOR,
      strokeWidth: lineWidth,
      visible: show,
    },
    rect: {
      fill: color || DEFAULT_COLOR,
      opacity: fill,
    },
  },
});
