/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PointSeries } from './point_series';
import { PieChart } from './pie_chart';
import { GaugeChart } from './gauge_chart';

export const visTypes = {
  pie: PieChart,
  point_series: PointSeries,
  gauge: GaugeChart,
  goal: GaugeChart,
  metric: GaugeChart,
};
