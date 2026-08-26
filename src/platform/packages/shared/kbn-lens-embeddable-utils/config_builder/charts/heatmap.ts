/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FormBasedPersistedState, HeatmapVisualizationState } from '@kbn/lens-common';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { BuildDependencies, LensAttributes, LensHeatmapConfig } from '../types';
import { DEFAULT_LAYER_ID } from '../constants';
import { addLayerColumn, buildDatasourceStates, extractReferences, mapToFormula } from '../utils';
import { getBreakdownColumn, getFormulaColumn, getValueColumn } from '../columns';

const ACCESSOR = 'metric_formula_accessor';

function getAccessorName(type: 'x' | 'y') {
  return `${type}_${ACCESSOR}`;
}

function buildVisualizationState(config: LensHeatmapConfig): HeatmapVisualizationState {
  const layer = config;

  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: 'data',
    shape: 'heatmap',
    valueAccessor: ACCESSOR,
    ...(layer.xAxis
      ? {
          xAccessor: getAccessorName('x'),
        }
      : {}),

    ...(layer.breakdown
      ? {
          yAccessor: getAccessorName('y'),
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
  layer: LensHeatmapConfig,
  i: number,
  dataView: DataView
): FormBasedPersistedState['layers'][0] {
  const defaultLayer = {
    ...getFormulaColumn(ACCESSOR, mapToFormula(layer), dataView),
  };

  if (layer.xAxis) {
    const columnName = getAccessorName('x');
    const breakdownColumn = getBreakdownColumn({
      options: layer.xAxis,
      dataView,
    });
    addLayerColumn(defaultLayer, columnName, breakdownColumn, true);
  }

  if (layer.breakdown) {
    const columnName = getAccessorName('y');
    const breakdownColumn = getBreakdownColumn({
      options: layer.breakdown,
      dataView,
    });
    addLayerColumn(defaultLayer, columnName, breakdownColumn, true);
  }

  return defaultLayer;
}

function getValueColumns(layer: LensHeatmapConfig) {
  if (layer.breakdown && typeof layer.breakdown !== 'string') {
    throw new Error('breakdown must be a field name when not using index source');
  }
  if (typeof layer.xAxis !== 'string') {
    throw new Error('xAxis must be a field name when not using index source');
  }
  return [
    ...(layer.breakdown ? [getValueColumn(getAccessorName('y'), layer.breakdown as string)] : []),
    getValueColumn(getAccessorName('x'), layer.xAxis as string),
    getValueColumn(ACCESSOR, layer.value),
  ];
}

export async function buildHeatmap(
  config: LensHeatmapConfig,
  { dataViewsAPI }: BuildDependencies
): Promise<LensAttributes> {
  const dataviews: Record<string, DataView> = {};
  const _buildFormulaLayer = (cfg: unknown, i: number, dataView: DataView) =>
    buildFormulaLayer(cfg as LensHeatmapConfig, i, dataView);
  const datasourceStates = await buildDatasourceStates(
    config,
    dataviews,
    _buildFormulaLayer,
    getValueColumns,
    dataViewsAPI
  );
  const { references, internalReferences, adHocDataViews } = extractReferences(dataviews);

  return {
    title: config.title,
    visualizationType: 'lnsHeatmap',
    references,
    state: {
      datasourceStates,
      internalReferences,
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: buildVisualizationState(config),
      adHocDataViews,
    },
  };
}
