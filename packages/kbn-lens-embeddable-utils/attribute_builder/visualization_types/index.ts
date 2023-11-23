/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import {
  METRIC_ID,
  XY_ID,
  METRIC_TREND_LINE_ID,
  XY_DATA_ID,
  XY_REFERENCE_LINE_ID,
} from './constants';
import {
  MetricLayerConfig,
  MetricLayerOptions,
  XYDataLayerConfig,
  XYLayerOptions,
  XYReferenceLinesLayerConfig,
} from './layers';
import type { XYVisualOptions } from './xy_chart';

export { XYChart, type XYVisualOptions } from './xy_chart';
export { MetricChart } from './metric_chart';

export * from './layers';

export type LayerConfigOptions = XYLayerOptions | MetricLayerOptions;
export type XYLayerModel = Array<XYDataLayerConfig | XYReferenceLinesLayerConfig>;
export type MetricsLayerModel = MetricLayerConfig;
export type LayerModel = XYLayerModel | MetricsLayerModel;

export interface XYChartModel {
  visualOptions?: XYVisualOptions;
  visualizationType: typeof XY_ID;
}
interface MetricChartModel {
  visualizationType: typeof METRIC_ID;
}

interface ChartModelBase<TLayer extends LayerModel = LayerModel> {
  id: string;
  title: string;
  layers: TLayer;
  visualizationType: ChartTypes;
  dataView?: DataView;
}

export type ChartModel<TLayer extends LayerModel = LayerModel> = ChartModelBase<TLayer> &
  ([ChartModelBase<TLayer>['visualizationType']] extends [infer U]
    ? U extends typeof XY_ID
      ? XYChartModel
      : MetricChartModel
    : never);

export type ChartTypes = typeof XY_ID | typeof METRIC_ID;
export { METRIC_ID, XY_ID, METRIC_TREND_LINE_ID, XY_DATA_ID, XY_REFERENCE_LINE_ID };
