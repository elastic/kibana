/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type { DataView } from '@kbn/data-views-plugin/common';
import type {
  FormulaPublicApi,
  FormBasedPersistedState,
  PersistedIndexPatternLayer,
  TermsIndexPatternColumn,
  HeatmapVisualizationState,
} from '@kbn/lens-plugin/public';
import type { ChartColumn, ChartLayer, FormulaValueConfig } from '../../types';
import { getDefaultReferences, getTopValuesColumn, type TopValuesColumnParams } from '../../utils';
import { FormulaColumn } from './columns/formula';

const X_BREAKDOWN_COLUMN_NAME = 'aggs_breakdown_x';
const Y_BREAKDOWN_COLUMN_NAME = 'aggs_breakdown_y';

interface TopValuesBucketedColumn {
  type: 'top_values';
  field: TermsIndexPatternColumn['sourceField'];
  params?: Partial<TopValuesColumnParams>;
}

export interface HeatmapLayerOptions {
  // Add more types as support for them is implemented
  breakdown_x: TopValuesBucketedColumn;
  breakdown_y: TopValuesBucketedColumn;
  // Add more types as support for them is implemented
}

export interface HeatmapLayerConfig {
  data: FormulaValueConfig;
  options: HeatmapLayerOptions;
  /**
   * It is possible to define a specific dataView for the layer. It will override the global chart one
   **/
  dataView?: DataView;
}

export class HeatmapLayer implements ChartLayer<HeatmapVisualizationState> {
  private column: ChartColumn;
  private layerConfig: HeatmapLayerConfig;
  constructor(layerConfig: HeatmapLayerConfig) {
    this.column = new FormulaColumn(layerConfig.data);
    this.layerConfig = {
      ...layerConfig,
      options: {
        ...layerConfig.options,
      },
    };
  }

  getLayer(
    layerId: string,
    accessorId: string,
    chartDataView: DataView,
    formulaAPI: FormulaPublicApi
  ): FormBasedPersistedState['layers'] {
    const columnOrder: string[] = [];
    const options = this.layerConfig.options;

    const baseLayer: PersistedIndexPatternLayer = {
      columnOrder,
      columns: {
        ...getTopValuesColumn({
          columnName: X_BREAKDOWN_COLUMN_NAME,
          field: options?.breakdown_x.field,
          options: {
            ...options.breakdown_x.params,
          },
        }),
        ...getTopValuesColumn({
          columnName: Y_BREAKDOWN_COLUMN_NAME,
          field: options?.breakdown_y.field,
          options: {
            ...options.breakdown_y.params,
          },
        }),
      },
    };

    return {
      [layerId]: {
        ...this.column.getData(
          accessorId,
          baseLayer,
          this.layerConfig.dataView ?? chartDataView,
          formulaAPI
        ),
      },
    };
  }

  getReference(layerId: string, chartDataView: DataView): SavedObjectReference[] {
    return getDefaultReferences(this.layerConfig.dataView ?? chartDataView, layerId);
  }

  getLayerConfig(layerId: string, accessorId: string): HeatmapVisualizationState {
    return {
      layerId,
      layerType: 'data',
      shape: 'heatmap',
      legend: {
        isVisible: true,
        position: 'right',
        type: 'heatmap_legend',
      },
      gridConfig: {
        type: 'heatmap_grid',
        isCellLabelVisible: false,
        isYAxisLabelVisible: true,
        isXAxisLabelVisible: true,
        isYAxisTitleVisible: false,
        isXAxisTitleVisible: false,
      },
      valueAccessor: accessorId,
      xAccessor: X_BREAKDOWN_COLUMN_NAME,
      yAccessor: Y_BREAKDOWN_COLUMN_NAME,
    };
  }

  getName(): string | undefined {
    return this.column.getValueConfig().label;
  }

  getDataView(): DataView | undefined {
    return this.layerConfig.dataView;
  }
}
