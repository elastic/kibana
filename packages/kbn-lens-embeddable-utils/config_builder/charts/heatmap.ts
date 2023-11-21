/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  FormBasedPersistedState,
  FormulaPublicApi,
  HeatmapVisualizationState,
} from '@kbn/lens-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { BuildDependencies, DEFAULT_LAYER_ID, LensAttributes, LensHeatmapConfig } from '../types';
import {
  addLayerColumn,
  buildDatasourceStates,
  buildReferences,
  getAdhocDataviews,
} from '../utils';
import { getBreakdownColumn, getFormulaColumn, getValueColumn } from '../columns';

const ACCESSOR = 'metric_formula_accessor';

function buildVisualizationState(config: LensHeatmapConfig): HeatmapVisualizationState {
  if (config.layers.length !== 1) {
    throw new Error('heatmap must define a single layer');
  }

  const layer = config.layers[0];

  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: 'data',
    shape: 'heatmap',
    valueAccessor: ACCESSOR,
    ...(layer.xAxis
      ? {
          xAccessor: `${ACCESSOR}_x`,
        }
      : {}),

    ...(layer.breakdown
      ? {
          yAccessor: `${ACCESSOR}_y`,
        }
      : {}),
    gridConfig: {
      type: 'heatmap_grid',
      isCellLabelVisible: false,
      isXAxisLabelVisible: false,
      isXAxisTitleVisible: false,
      isYAxisLabelVisible: false,
      isYAxisTitleVisible: false,
    },
    legend: {
      isVisible: config.legend?.show || true,
      position: config.legend?.position || 'left',
      type: 'heatmap_legend',
    },
  };
}

function buildFormulaLayer(
  layer: LensHeatmapConfig['layers'][0],
  i: number,
  dataView: DataView,
  formulaAPI: FormulaPublicApi
): FormBasedPersistedState['layers'][0] {
  const defaultLayer = {
    ...getFormulaColumn(
      ACCESSOR,
      {
        value: layer.value,
      },
      dataView,
      formulaAPI
    ),
  };

  if (layer.xAxis) {
    const columnName = `${ACCESSOR}_x`;
    const breakdownColumn = getBreakdownColumn({
      options: layer.xAxis,
      dataView,
    });
    addLayerColumn(defaultLayer, columnName, breakdownColumn, true);
  }

  if (layer.breakdown) {
    const columnName = `${ACCESSOR}_y`;
    const breakdownColumn = getBreakdownColumn({
      options: layer.breakdown,
      dataView,
    });
    addLayerColumn(defaultLayer, columnName, breakdownColumn, true);
  }

  return defaultLayer;
}

function getValueColumns(layer: LensHeatmapConfig['layers'][0]) {
  if (layer.breakdown && typeof layer.breakdown !== 'string') {
    throw new Error('breakdown must be a field name when not using index source');
  }
  if (typeof layer.xAxis !== 'string') {
    throw new Error('xAxis must be a field name when not using index source');
  }
  return [
    ...(layer.breakdown ? [getValueColumn(`${ACCESSOR}_y`, layer.breakdown as string)] : []),
    getValueColumn(`${ACCESSOR}_x`, layer.xAxis as string),
    getValueColumn(ACCESSOR, layer.value),
  ];
}

export async function buildHeatmap(
  config: LensHeatmapConfig,
  { dataViewsAPI, formulaAPI }: BuildDependencies
): Promise<LensAttributes> {
  const dataviews: Record<string, DataView> = {};
  const _buildFormulaLayer = (cfg: unknown, i: number, dataView: DataView) =>
    buildFormulaLayer(cfg as LensHeatmapConfig['layers'][0], i, dataView, formulaAPI);
  const datasourceStates = await buildDatasourceStates(
    config,
    dataviews,
    _buildFormulaLayer,
    getValueColumns,
    dataViewsAPI
  );

  return {
    title: config.title,
    visualizationType: 'lnsHeatmap',
    references: buildReferences(dataviews),
    state: {
      datasourceStates,
      internalReferences: [],
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: buildVisualizationState(config),
      // Getting the spec from a data view is a heavy operation, that's why the result is cached.
      adHocDataViews: getAdhocDataviews(dataviews),
    },
  };
}
