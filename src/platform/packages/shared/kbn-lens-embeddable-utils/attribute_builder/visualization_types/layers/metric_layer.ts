/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type { DataView } from '@kbn/data-views-plugin/common';
import type {
  FormulaPublicApi,
  FormBasedPersistedState,
  MetricVisualizationState,
  PersistedIndexPatternLayer,
} from '@kbn/lens-plugin/public';
import type { ChartColumn, ChartLayer, FormulaValueConfig } from '../../types';
import { getDefaultReferences, getHistogramColumn } from '../../utils';
import { METRIC_TREND_LINE_ID } from '../constants';
import { FormulaColumn } from './columns/formula';

const HISTOGRAM_COLUMN_NAME = 'x_date_histogram';

export interface MetricLayerOptions {
  backgroundColor?: string;
  showTitle?: boolean;
  showTrendLine?: boolean;
  subtitle?: string;
}

export interface MetricLayerConfig {
  data: FormulaValueConfig;
  options?: MetricLayerOptions;
  layerType?: typeof METRIC_TREND_LINE_ID;
  /**
   * It is possible to define a specific dataView for the layer. It will override the global chart one
   **/
  dataView?: DataView;
}

export class MetricLayer implements ChartLayer<MetricVisualizationState> {
  private column: ChartColumn;
  private layerConfig: MetricLayerConfig;
  constructor(layerConfig: MetricLayerConfig) {
    this.column = new FormulaColumn(layerConfig.data);
    this.layerConfig = {
      ...layerConfig,
      layerType: layerConfig.layerType ?? 'metricTrendline',
    };
  }

  getLayer(
    layerId: string,
    accessorId: string,
    chartDataView: DataView,
    formulaAPI: FormulaPublicApi
  ): FormBasedPersistedState['layers'] {
    const baseLayer: PersistedIndexPatternLayer = {
      columnOrder: [HISTOGRAM_COLUMN_NAME],
      columns: getHistogramColumn({
        columnName: HISTOGRAM_COLUMN_NAME,
        options: {
          sourceField: (this.layerConfig.dataView ?? chartDataView).timeFieldName,
          params: {
            interval: 'auto',
            includeEmptyRows: true,
          },
        },
      }),
      sampling: 1,
    };

    return {
      [layerId]: {
        ...this.column.getData(
          accessorId,
          {
            columnOrder: [],
            columns: {},
          },
          this.layerConfig.dataView ?? chartDataView,
          formulaAPI
        ),
      },
      ...(this.layerConfig.options?.showTrendLine
        ? {
            [`${layerId}_trendline`]: {
              linkToLayers: [layerId],
              ...this.column.getData(
                `${accessorId}_trendline`,
                baseLayer,
                this.layerConfig.dataView ?? chartDataView,
                formulaAPI
              ),
            },
          }
        : {}),
    };
  }
  getReference(layerId: string, chartDataView: DataView): SavedObjectReference[] {
    return [
      ...getDefaultReferences(this.layerConfig.dataView ?? chartDataView, layerId),
      ...getDefaultReferences(this.layerConfig.dataView ?? chartDataView, `${layerId}_trendline`),
    ];
  }

  getLayerConfig(layerId: string, accessorId: string): MetricVisualizationState {
    const { subtitle, backgroundColor, showTrendLine } = this.layerConfig.options ?? {};

    return {
      layerId,
      layerType: 'data',
      metricAccessor: accessorId,
      color: backgroundColor,
      subtitle,
      showBar: false,
      ...(showTrendLine
        ? {
            trendlineLayerId: `${layerId}_trendline`,
            trendlineLayerType: 'metricTrendline',
            trendlineMetricAccessor: `${accessorId}_trendline`,
            trendlineTimeAccessor: HISTOGRAM_COLUMN_NAME,
          }
        : {}),
    };
  }
  getName(): string | undefined {
    return this.column.getValueConfig().label;
  }

  getDataView(): DataView | undefined {
    return this.layerConfig.dataView;
  }
}
