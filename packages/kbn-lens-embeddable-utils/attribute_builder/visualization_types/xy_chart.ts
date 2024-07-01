/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  AxisExtentConfig,
  FormBasedPersistedState,
  LegendConfig,
  XYArgs,
  XYLayerConfig,
  XYState,
} from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedObjectReference } from '@kbn/core/server';
import { AxesSettingsConfig } from '@kbn/visualizations-plugin/common';
import { LegendValue } from '@elastic/charts';
import type { Chart, ChartConfig, ChartLayer } from '../types';
import { DEFAULT_LAYER_ID } from '../utils';
import { XY_ID } from './constants';

const ACCESSOR = 'formula_accessor';

// This needs be more specialized by `preferredSeriesType`
export interface XYVisualOptions {
  lineInterpolation?: XYArgs['curveType'];
  missingValues?: XYArgs['fittingFunction'];
  endValues?: XYArgs['endValue'];
  showDottedLine?: boolean;
  valueLabels?: XYArgs['valueLabels'];
  axisTitlesVisibilitySettings?: AxesSettingsConfig;
  legend?: LegendConfig;
  yLeftExtent?: AxisExtentConfig;
}

export class XYChart implements Chart<XYState> {
  private _layers: Array<ChartLayer<XYLayerConfig>> | null = null;
  constructor(
    private chartConfig: ChartConfig<Array<ChartLayer<XYLayerConfig>>> & {
      visualOptions?: XYVisualOptions;
    }
  ) {}

  getVisualizationType(): string {
    return XY_ID;
  }

  private get layers() {
    if (!this._layers) {
      this._layers = Array.isArray(this.chartConfig.layers)
        ? this.chartConfig.layers
        : [this.chartConfig.layers];
    }

    return this._layers;
  }

  getLayers(): FormBasedPersistedState['layers'] {
    return this.layers.reduce((acc, curr, index) => {
      const layerId = `${DEFAULT_LAYER_ID}_${index}`;
      const accessorId = `${ACCESSOR}_${index}`;
      return {
        ...acc,
        ...curr.getLayer(
          layerId,
          accessorId,
          this.chartConfig.dataView,
          this.chartConfig.formulaAPI
        ),
      };
    }, {});
  }

  getVisualizationState(): XYState {
    return {
      ...getXYVisualizationState({
        layers: [
          ...this.chartConfig.layers.map((layerItem, index) => {
            const layerId = `${DEFAULT_LAYER_ID}_${index}`;
            const accessorId = `${ACCESSOR}_${index}`;
            return layerItem.getLayerConfig(layerId, accessorId);
          }),
        ],
      }),
      legend: this.chartConfig.visualOptions?.legend ?? {
        isVisible: false,
        position: 'right',
        showSingleSeries: false,
      },
      fittingFunction: this.chartConfig.visualOptions?.missingValues ?? 'None',
      endValue: this.chartConfig.visualOptions?.endValues,
      curveType: this.chartConfig.visualOptions?.lineInterpolation,
      emphasizeFitting: !this.chartConfig.visualOptions?.showDottedLine,
      valueLabels: this.chartConfig.visualOptions?.valueLabels,
      axisTitlesVisibilitySettings: this.chartConfig.visualOptions
        ?.axisTitlesVisibilitySettings ?? {
        x: false,
        yLeft: false,
        yRight: true,
      },
      yLeftExtent: this.chartConfig.visualOptions?.yLeftExtent,
    };
  }

  getReferences(): SavedObjectReference[] {
    return this.layers.flatMap((p, index) => {
      const layerId = `${DEFAULT_LAYER_ID}_${index}`;
      return p.getReference(layerId, this.chartConfig.dataView);
    });
  }

  getDataViews(): DataView[] {
    return [
      this.chartConfig.dataView,
      ...this.chartConfig.layers.map((p) => p.getDataView()).filter((x): x is DataView => !!x),
    ];
  }

  getTitle(): string {
    return this.chartConfig.title ?? this.layers[0].getName() ?? '';
  }
}

export const getXYVisualizationState = (
  custom: Omit<Partial<XYState>, 'layers'> & { layers: XYState['layers'] }
): XYState => ({
  legend: {
    isVisible: false,
    position: 'right',
    showSingleSeries: false,
    legendStats: [LegendValue.CurrentAndLastValue],
  },
  valueLabels: 'show',
  yLeftScale: 'linear',
  tickLabelsVisibilitySettings: {
    x: true,
    yLeft: true,
    yRight: true,
  },
  labelsOrientation: {
    x: 0,
    yLeft: 0,
    yRight: 0,
  },
  gridlinesVisibilitySettings: {
    x: true,
    yLeft: true,
    yRight: true,
  },
  preferredSeriesType: 'line',
  hideEndzones: true,
  ...custom,
});
