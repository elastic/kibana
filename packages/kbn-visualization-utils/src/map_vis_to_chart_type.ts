/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ChartType, LensVisualizationType } from './types';

export const mapVisToChartType = (visualizationType: string) => {
  let chartType: ChartType | undefined;

  switch (visualizationType) {
    case LensVisualizationType.XY:
      chartType = ChartType.XY;
      break;
    case LensVisualizationType.Metric:
      chartType = ChartType.Metric;
      break;
    case LensVisualizationType.Pie:
      chartType = ChartType.Pie;
      break;
    case LensVisualizationType.Heatmap:
      chartType = ChartType.Heatmap;
      break;
    case LensVisualizationType.Datatable:
      chartType = ChartType.Table;
      break;
    case LensVisualizationType.LegacyMetric:
      chartType = ChartType.Metric;
      break;
  }

  return chartType;
};
