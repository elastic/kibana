/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { OrderedChart } from './point_series';

export function orderedDateAxis(chart: OrderedChart) {
  const x = chart.aspects.x[0];
  const bounds = 'bounds' in x.params ? x.params.bounds : undefined;

  chart.ordered.date = true;

  if (bounds) {
    chart.ordered.min = typeof bounds.min === 'string' ? Date.parse(bounds.min) : bounds.min;
    chart.ordered.max = typeof bounds.max === 'string' ? Date.parse(bounds.max) : bounds.max;
  } else {
    chart.ordered.endzones = false;
  }
}
