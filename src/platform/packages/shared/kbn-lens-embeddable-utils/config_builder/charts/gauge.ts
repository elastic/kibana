/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FormBasedPersistedState, GaugeVisualizationState } from '@kbn/lens-common';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { BuildDependencies, LensAttributes, LensGaugeConfig } from '../types';
import {
  addLayerFormulaColumns,
  buildDatasourceStates,
  extractReferences,
  mapToFormula,
} from '../utils';
import { getFormulaColumn, getValueColumn } from '../columns';
import { DEFAULT_LAYER_ID } from '../constants';

const ACCESSOR = 'metric_formula_accessor';

function getAccessorName(type: 'goal' | 'max' | 'min' | 'secondary') {
  return `${ACCESSOR}_${type}`;
}

function buildVisualizationState(config: LensGaugeConfig): GaugeVisualizationState {
  const layer = config;

  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: 'data',
    ticksPosition: 'auto',
    shape: layer.shape || 'horizontalBullet',
    labelMajorMode: 'auto',
    metricAccessor: ACCESSOR,
    ...(layer.queryGoalValue
      ? {
          goalAccessor: getAccessorName('goal'),
        }
      : {}),

    ...(layer.queryMaxValue
      ? {
          maxAccessor: getAccessorName('max'),
          showBar: true,
        }
      : {}),

    ...(layer.queryMinValue
      ? {
          minAccessor: getAccessorName('min'),
        }
      : {}),
  };
}

function buildFormulaLayer(
  layer: LensGaugeConfig,
  i: number,
  dataView: DataView
): FormBasedPersistedState['layers'][0] {
  const layers = {
    [DEFAULT_LAYER_ID]: {
      ...getFormulaColumn(ACCESSOR, mapToFormula(layer), dataView),
    },
  };

  const defaultLayer = layers[DEFAULT_LAYER_ID];

  if (layer.queryGoalValue) {
    const columnName = getAccessorName('goal');
    const formulaColumn = getFormulaColumn(columnName, { formula: layer.queryGoalValue }, dataView);

    addLayerFormulaColumns(defaultLayer, formulaColumn);
  }

  if (layer.queryMinValue) {
    const columnName = getAccessorName('min');
    const formulaColumn = getFormulaColumn(columnName, { formula: layer.queryMinValue }, dataView);

    addLayerFormulaColumns(defaultLayer, formulaColumn);
  }

  if (layer.queryMaxValue) {
    const columnName = getAccessorName('max');
    const formulaColumn = getFormulaColumn(columnName, { formula: layer.queryMaxValue }, dataView);

    addLayerFormulaColumns(defaultLayer, formulaColumn);
  }

  return defaultLayer;
}

function getValueColumns(layer: LensGaugeConfig) {
  return [
    getValueColumn(ACCESSOR, layer.value),
    ...(layer.queryMaxValue ? [getValueColumn(getAccessorName('max'), layer.queryMaxValue)] : []),
    ...(layer.queryMinValue ? [getValueColumn(getAccessorName('min'), layer.queryMinValue)] : []),
    ...(layer.queryGoalValue
      ? [getValueColumn(getAccessorName('goal'), layer.queryGoalValue)]
      : []),
  ];
}

export async function buildGauge(
  config: LensGaugeConfig,
  { dataViewsAPI }: BuildDependencies
): Promise<LensAttributes> {
  const dataviews: Record<string, DataView> = {};
  const _buildFormulaLayer = (cfg: unknown, i: number, dataView: DataView) =>
    buildFormulaLayer(cfg as LensGaugeConfig, i, dataView);
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
    visualizationType: 'lnsGauge',
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
