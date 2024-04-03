/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { DataView } from '@kbn/data-views-plugin/common';
import {
  METRIC_ID,
  XY_ID,
  METRIC_TREND_LINE_ID,
  XY_DATA_ID,
  XY_REFERENCE_LINE_ID,
} from './constants';
import type { XYVisualOptions } from './xy_chart';
import type { MetricLayerConfig, XYDataLayerConfig, XYReferenceLinesLayerConfig } from './layers';

export { XYChart, type XYVisualOptions } from './xy_chart';
export { MetricChart } from './metric_chart';
export * from './layers';
export type XYLayerConfig = XYDataLayerConfig | XYReferenceLinesLayerConfig;

interface ChartModelBase {
  id: string;
  title?: string;
  dataView?: DataView;
}
export interface XYChartModel extends ChartModelBase {
  visualOptions?: XYVisualOptions;
  visualizationType: typeof XY_ID;
  layers: XYLayerConfig[];
}
export interface MetricChartModel extends ChartModelBase {
  visualizationType: typeof METRIC_ID;
  layers: MetricLayerConfig;
}

export type ChartModel = XYChartModel | MetricChartModel;
export type ChartTypes = typeof XY_ID | typeof METRIC_ID;
export { METRIC_ID, XY_ID, METRIC_TREND_LINE_ID, XY_DATA_ID, XY_REFERENCE_LINE_ID };
