/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ChartType, LensVisualizationType } from './types';

type ValueOf<T> = T[keyof T];
type LensToChartMap = {
  [K in ValueOf<typeof LensVisualizationType>]: ChartType;
};
const lensTypesToChartTypes: LensToChartMap = {
  [LensVisualizationType.XY]: ChartType.XY,
  [LensVisualizationType.Metric]: ChartType.Metric,
  [LensVisualizationType.LegacyMetric]: ChartType.Metric,
  [LensVisualizationType.Pie]: ChartType.Pie,
  [LensVisualizationType.Heatmap]: ChartType.Heatmap,
  [LensVisualizationType.Gauge]: ChartType.Gauge,
  [LensVisualizationType.Datatable]: ChartType.Table,
};
function isLensVisualizationType(value: string): value is LensVisualizationType {
  return Object.values(LensVisualizationType).includes(value as LensVisualizationType);
}
export const mapVisToChartType = (visualizationType: string) => {
  if (isLensVisualizationType(visualizationType)) {
    return lensTypesToChartTypes[visualizationType];
  }
};
