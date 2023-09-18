/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  FormBasedPersistedState,
  PieLayerState,
  PieVisualizationState,
} from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedObjectReference } from '@kbn/core/server';
import type { Chart, ChartConfig, ChartLayer } from '../types';
import { DEFAULT_LAYER_ID } from '../utils';

const ACCESSOR = 'formula_accessor';

// This needs be more specialized by `preferredSeriesType`
export interface PieVisualOptions {}

export class PieChart implements Chart<PieVisualizationState> {
  private _layers: Array<ChartLayer<PieLayerState>> | null = null;
  constructor(
    private chartConfig: ChartConfig<Array<ChartLayer<PieLayerState>>> & {
      visualOptions?: PieVisualOptions;
    }
  ) {}

  getVisualizationType(): string {
    return 'lnsPie';
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

  getVisualizationState(): PieVisualizationState {
    const state = {
      ...getPieVisualizationState({
        layers: [
          ...this.chartConfig.layers.map((layerItem, index) => {
            const layerId = `${DEFAULT_LAYER_ID}_${index}`;
            const accessorId = `${ACCESSOR}_${index}`;
            return layerItem.getLayerConfig(layerId, accessorId);
          }),
        ],
      }),
    };

    return state;
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

export const getPieVisualizationState = (
  custom: Omit<Partial<PieVisualizationState>, 'layers'> & {
    layers: PieVisualizationState['layers'];
  }
): PieVisualizationState => ({
  shape: 'pie',
  ...custom,
});
