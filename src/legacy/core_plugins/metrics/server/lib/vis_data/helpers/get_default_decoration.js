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

import Color from 'color';

const getDecorationColor = (color, fill) => {
  const initialColor = new Color(color).rgb();

  const opacity = Math.min(Number(fill) * initialColor.valpha, 1);
  const [r, g, b] = initialColor.color;

  return {
    fill: opacity > 0,
    fillColor: new Color([
      r, g, b, opacity
    ]).string()
  };
};

export default series => {
  const pointSize = series.point_size != null ? Number(series.point_size) : Number(series.line_width);
  const showPoints = series.chart_type === 'line' && pointSize !== 0;
  const decorationColor = getDecorationColor(series.color, series.fill);

  return {
    stack: series.stacked && series.stacked !== 'none' || false,
    lines: {
      ...decorationColor,
      show: series.chart_type === 'line' && series.line_width !== 0,
      lineWidth: Number(series.line_width),
      steps: series.steps || false
    },
    bars: {
      ...decorationColor,
      show: series.chart_type === 'bar',
      lineWidth: Number(series.line_width)
    },
    points: {
      show: showPoints,
      radius: 1,
      lineWidth: showPoints ? pointSize : 5
    }
  };
};
