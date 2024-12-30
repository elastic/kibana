/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const getDefaultDecoration = (series) => {
  const pointSize =
    series.point_size != null ? Number(series.point_size) : Number(series.line_width);
  const showPoints = series.chart_type === 'line' && pointSize !== 0;

  return {
    seriesId: series.id,
    stack: series.stacked,
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
