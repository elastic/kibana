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
  GaugeVisualizationState,
} from '@kbn/lens-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import {
  BuildDependencies,
  DEFAULT_LAYER_ID,
  LensAttributes,
  LensBaseConfig,
  LensGaugeConfig,
} from '../types';
import {
  addLayerFormulaColumns,
  buildDatasourceStates,
  buildReferences,
  getAdhocDataviews,
} from '../utils';
import { getFormulaColumn, getValueColumn } from '../columns';

const ACCESSOR = 'metric_formula_accessor';

function buildVisualizationState(
  config: LensGaugeConfig & LensBaseConfig
): GaugeVisualizationState {
  if (config.layers.length !== 1) {
    throw new Error('metric must define a single layer');
  }

  const layer = config.layers[0];

  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: 'data',
    showBar: false,
    ticksPosition: 'auto',
    shape: layer.shape || 'horizontalBullet',
    labelMajorMode: 'auto',
    metricAccessor: ACCESSOR,
    ...(layer.queryGoalValue
      ? {
          goalAccessor: `${ACCESSOR}_goal`,
        }
      : {}),

    ...(layer.queryMaxValue
      ? {
          maxAccessor: `${ACCESSOR}_max`,
          showBar: true,
        }
      : {}),

    ...(layer.queryMinValue
      ? {
          minAccessor: `${ACCESSOR}_min`,
        }
      : {}),
  };
}

function buildFormulaLayer(
  layer: LensGaugeConfig['layers'][0],
  i: number,
  dataView: DataView,
  formulaAPI: FormulaPublicApi
): FormBasedPersistedState['layers'][0] {
  const layers = {
    [DEFAULT_LAYER_ID]: {
      ...getFormulaColumn(
        ACCESSOR,
        {
          value: layer.query,
        },
        dataView,
        formulaAPI
      ),
    },
  };

  const defaultLayer = layers[DEFAULT_LAYER_ID];

  if (layer.queryGoalValue) {
    const columnName = `${ACCESSOR}_goal`;
    const formulaColumn = getFormulaColumn(
      columnName,
      {
        value: layer.queryGoalValue,
      },
      dataView,
      formulaAPI
    );

    addLayerFormulaColumns(defaultLayer, formulaColumn);
  }

  if (layer.queryMinValue) {
    const columnName = `${ACCESSOR}_min`;
    const formulaColumn = getFormulaColumn(
      columnName,
      {
        value: layer.queryMinValue,
      },
      dataView,
      formulaAPI
    );

    addLayerFormulaColumns(defaultLayer, formulaColumn);
  }

  if (layer.queryMaxValue) {
    const columnName = `${ACCESSOR}_max`;
    const formulaColumn = getFormulaColumn(
      columnName,
      {
        value: layer.queryMaxValue,
      },
      dataView,
      formulaAPI
    );

    addLayerFormulaColumns(defaultLayer, formulaColumn);
  }

  return defaultLayer;
}

function getValueColumns(layer: LensGaugeConfig['layers'][0]) {
  return [
    getValueColumn(ACCESSOR, layer.query),
    ...(layer.queryMaxValue ? [getValueColumn(`${ACCESSOR}_max`, layer.queryMaxValue)] : []),
    ...(layer.queryMinValue ? [getValueColumn(`${ACCESSOR}_secondary`, layer.queryMinValue)] : []),
    ...(layer.queryGoalValue
      ? [getValueColumn(`${ACCESSOR}_secondary`, layer.queryGoalValue)]
      : []),
  ];
}

export async function buildGauge(
  config: LensGaugeConfig & LensBaseConfig,
  { dataViewsAPI, formulaAPI }: BuildDependencies
): Promise<LensAttributes> {
  const dataviews: Record<string, DataView> = {};
  const _buildFormulaLayer = (cfg: unknown, i: number, dataView: DataView) =>
    buildFormulaLayer(cfg as LensGaugeConfig['layers'][0], i, dataView, formulaAPI);
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
