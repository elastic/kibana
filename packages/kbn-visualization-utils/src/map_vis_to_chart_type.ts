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
  [LensVisualizationType.lnsXY]: ChartType.XY,
  [LensVisualizationType.lnsMetric]: ChartType.Metric,
  [LensVisualizationType.lnsLegacyMetric]: ChartType.Metric,
  [LensVisualizationType.lnsPie]: ChartType.Pie,
  [LensVisualizationType.lnsHeatmap]: ChartType.Heatmap,
  [LensVisualizationType.lnsGauge]: ChartType.Gauge,
  [LensVisualizationType.lnsDatatable]: ChartType.Table,
};
function isLensVisualizationType(value: string): value is LensVisualizationType {
  return value in LensVisualizationType;
}
export const mapVisToChartType = (visualizationType: string) => {
  if (isLensVisualizationType(visualizationType)) {
    return lensTypesToChartTypes[visualizationType];
  }
};
