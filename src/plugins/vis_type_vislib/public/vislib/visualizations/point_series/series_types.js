/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ColumnChart } from './column_chart';
import { LineChart } from './line_chart';
import { AreaChart } from './area_chart';
import { HeatmapChart } from './heatmap_chart';

export const seriesTypes = {
  histogram: ColumnChart,
  line: LineChart,
  area: AreaChart,
  heatmap: HeatmapChart,
};
