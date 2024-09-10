/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Chart } from './point_series';

export function initYAxis(chart: Chart) {
  const y = chart.aspects.y;

  if (Array.isArray(y)) {
    // TODO: vis option should allow choosing this format
    chart.yAxisFormat = y[0].format;
    chart.yAxisLabel = y.length > 1 ? '' : y[0].title;
  }

  const z = chart.aspects.series;
  if (z) {
    chart.zAxisFormat = z[0].format;
    chart.zAxisLabel = '';
  }
}
