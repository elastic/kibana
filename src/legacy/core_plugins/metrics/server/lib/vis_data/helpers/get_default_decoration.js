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

export const getDefaultDecoration = series => {
  const pointSize =
    series.point_size != null ? Number(series.point_size) : Number(series.line_width);
  const showPoints = series.chart_type === 'line' && pointSize !== 0;
  let stack;
  switch (series.stacked) {
    case 'stacked':
    case 'percent':
      stack = true;
      break;
    case 'stacked_within_series':
      stack = series.id;
      break;
    default:
      stack = false;
  }

  return {
    stack,
    lines: {
      show: series.chart_type === 'line' && series.line_width !== 0,
      fill: Number(series.fill),
      lineWidth: Number(series.line_width),
      steps: series.steps || false,
    },
    points: {
      show: showPoints,
      radius: 1,
      lineWidth: showPoints ? pointSize : 5,
    },
    bars: {
      show: series.chart_type === 'bar',
      fill: Number(series.fill),
      lineWidth: Number(series.line_width),
    },
  };
};
