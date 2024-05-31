/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  FormBasedPersistedState,
  FormulaPublicApi,
  GaugeVisualizationState,
} from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { BuildDependencies, DEFAULT_LAYER_ID, LensAttributes, LensGaugeConfig } from '../types';
import {
  addLayerFormulaColumns,
  buildDatasourceStates,
  buildReferences,
  getAdhocDataviews,
  mapToFormula,
} from '../utils';
import { getFormulaColumn, getValueColumn } from '../columns';

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
  dataView: DataView,
  formulaAPI?: FormulaPublicApi
): FormBasedPersistedState['layers'][0] {
  const layers = {
    [DEFAULT_LAYER_ID]: {
      ...getFormulaColumn(ACCESSOR, mapToFormula(layer), dataView, formulaAPI),
    },
  };

  const defaultLayer = layers[DEFAULT_LAYER_ID];

  if (layer.queryGoalValue) {
    const columnName = getAccessorName('goal');
    const formulaColumn = getFormulaColumn(
      columnName,
      { formula: layer.queryGoalValue },
      dataView,
      formulaAPI
    );

    addLayerFormulaColumns(defaultLayer, formulaColumn);
  }

  if (layer.queryMinValue) {
    const columnName = getAccessorName('min');
    const formulaColumn = getFormulaColumn(
      columnName,
      { formula: layer.queryMinValue },
      dataView,
      formulaAPI
    );

    addLayerFormulaColumns(defaultLayer, formulaColumn);
  }

  if (layer.queryMaxValue) {
    const columnName = getAccessorName('max');
    const formulaColumn = getFormulaColumn(
      columnName,
      { formula: layer.queryMaxValue },
      dataView,
      formulaAPI
    );

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
  { dataViewsAPI, formulaAPI }: BuildDependencies
): Promise<LensAttributes> {
  const dataviews: Record<string, DataView> = {};
  const _buildFormulaLayer = (cfg: unknown, i: number, dataView: DataView) =>
    buildFormulaLayer(cfg as LensGaugeConfig, i, dataView, formulaAPI);
  const datasourceStates = await buildDatasourceStates(
    config,
    dataviews,
    _buildFormulaLayer,
    getValueColumns,
    dataViewsAPI
  );
  return {
    title: config.title,
    visualizationType: 'lnsGauge',
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
