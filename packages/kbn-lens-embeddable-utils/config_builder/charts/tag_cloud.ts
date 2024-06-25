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
  TagcloudState,
} from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { BuildDependencies, DEFAULT_LAYER_ID, LensAttributes, LensTagCloudConfig } from '../types';
import {
  addLayerColumn,
  buildDatasourceStates,
  buildReferences,
  getAdhocDataviews,
  isFormulaDataset,
  mapToFormula,
} from '../utils';
import { getBreakdownColumn, getFormulaColumn, getValueColumn } from '../columns';

const ACCESSOR = 'metric_formula_accessor';

function getAccessorName(type: 'breakdown') {
  return `${ACCESSOR}_${type}`;
}

function buildVisualizationState(config: LensTagCloudConfig): TagcloudState {
  const layer = config;
  const isFormula = isFormulaDataset(config.dataset) || isFormulaDataset(layer.dataset);

  return {
    layerId: DEFAULT_LAYER_ID,
    valueAccessor: !isFormula ? layer.value : ACCESSOR,
    maxFontSize: 72,
    minFontSize: 12,
    orientation: 'single',
    showLabel: true,
    ...(layer.breakdown
      ? {
          tagAccessor: !isFormula ? (layer.breakdown as string) : getAccessorName('breakdown'),
        }
      : {}),
  };
}

function buildFormulaLayer(
  layer: LensTagCloudConfig,
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

  if (layer.breakdown) {
    const columnName = getAccessorName('breakdown');
    const breakdownColumn = getBreakdownColumn({
      options: layer.breakdown,
      dataView,
    });
    addLayerColumn(defaultLayer, columnName, breakdownColumn, true);
  } else {
    throw new Error('breakdown must be defined on tagcloud!');
  }

  return defaultLayer;
}

function getValueColumns(layer: LensTagCloudConfig) {
  if (layer.breakdown && typeof layer.breakdown !== 'string') {
    throw new Error('breakdown must be a field name when not using index source');
  }

  return [
    getValueColumn(ACCESSOR, layer.value),
    getValueColumn(getAccessorName('breakdown'), layer.breakdown as string),
  ];
}

export async function buildTagCloud(
  config: LensTagCloudConfig,
  { dataViewsAPI, formulaAPI }: BuildDependencies
): Promise<LensAttributes> {
  const dataviews: Record<string, DataView> = {};
  const _buildFormulaLayer = (cfg: unknown, i: number, dataView: DataView) =>
    buildFormulaLayer(cfg as LensTagCloudConfig, i, dataView, formulaAPI);
  const datasourceStates = await buildDatasourceStates(
    config,
    dataviews,
    _buildFormulaLayer,
    getValueColumns,
    dataViewsAPI
  );
  return {
    title: config.title,
    visualizationType: 'lnsTagcloud',
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
