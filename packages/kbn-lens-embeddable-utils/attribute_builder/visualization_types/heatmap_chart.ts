/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FormBasedPersistedState, HeatmapVisualizationState } from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedObjectReference } from '@kbn/core/server';
import type { Chart, ChartConfig, ChartLayer } from '../types';
import { DEFAULT_LAYER_ID } from '../utils';

const ACCESSOR = 'heatmap_formula_accessor';

export class HeatmapChart implements Chart<HeatmapVisualizationState> {
  constructor(private chartConfig: ChartConfig<ChartLayer<HeatmapVisualizationState>>) {}

  getVisualizationType(): string {
    return 'lnsHeatmap';
  }

  getLayers(): FormBasedPersistedState['layers'] {
    return this.chartConfig.layers.getLayer(
      DEFAULT_LAYER_ID,
      ACCESSOR,
      this.chartConfig.dataView,
      this.chartConfig.formulaAPI
    );
  }

  getVisualizationState(): HeatmapVisualizationState {
    return this.chartConfig.layers.getLayerConfig(DEFAULT_LAYER_ID, ACCESSOR);
  }

  getReferences(): SavedObjectReference[] {
    return this.chartConfig.layers.getReference(DEFAULT_LAYER_ID, this.chartConfig.dataView);
  }

  getDataViews(): DataView[] {
    return [this.chartConfig.dataView, this.chartConfig.layers.getDataView()].filter(
      (x): x is DataView => !!x
    );
  }

  getTitle(): string {
    return this.chartConfig.title ?? '';
  }
}
