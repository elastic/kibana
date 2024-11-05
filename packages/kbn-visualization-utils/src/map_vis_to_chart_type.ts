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
  switch (visualizationType) {
    case LensVisualizationType.XY:
      return ChartType.XY;
    case LensVisualizationType.Metric:
    case LensVisualizationType.LegacyMetric:
      return ChartType.Metric;
    case LensVisualizationType.Pie:
      return ChartType.Pie;
    case LensVisualizationType.Heatmap:
      return ChartType.Heatmap;
    case LensVisualizationType.Gauge:
      return ChartType.Gauge;
    case LensVisualizationType.Datatable:
      return ChartType.Table;
  }
};
