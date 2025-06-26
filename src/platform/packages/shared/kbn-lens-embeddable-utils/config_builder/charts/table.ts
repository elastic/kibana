/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  FormBasedPersistedState,
  FormulaPublicApi,
  DatatableVisualizationState,
} from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { BuildDependencies, DEFAULT_LAYER_ID, LensAttributes, LensTableConfig } from '../types';
import {
  addLayerColumn,
  buildDatasourceStates,
  buildReferences,
  getAdhocDataviews,
  mapToFormula,
} from '../utils';
import { getBreakdownColumn, getFormulaColumn, getValueColumn } from '../columns';

const ACCESSOR = 'metric_formula_accessor';
function buildVisualizationState(config: LensTableConfig): DatatableVisualizationState {
  const layer = config;

  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: 'data',
    columns: [
      { columnId: ACCESSOR },
      ...(layer.breakdown || []).map((breakdown, i) => ({
        columnId: `${ACCESSOR}_breakdown_${i}`,
      })),
      ...(layer.splitBy || []).map((breakdown, i) => ({ columnId: `${ACCESSOR}_splitby_${i}` })),
    ],
  };
}
function buildFormulaLayer(
  layer: LensTableConfig,
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
    layer.breakdown.reverse().forEach((breakdown, x) => {
      const columnName = `${ACCESSOR}_breakdown_${x}`;
      const breakdownColumn = getBreakdownColumn({
        options: breakdown,
        dataView,
      });
      addLayerColumn(defaultLayer, columnName, breakdownColumn, true);
    });
  } else {
    throw new Error('breakdown must be defined for table!');
  }

  if (layer.splitBy) {
    layer.splitBy.forEach((breakdown, x) => {
      const columnName = `${ACCESSOR}_splitby_${x}`;
      const breakdownColumn = getBreakdownColumn({
        options: breakdown,
        dataView,
      });
      addLayerColumn(defaultLayer, columnName, breakdownColumn, true);
    });
  }

  return defaultLayer;
}

function getValueColumns(layer: LensTableConfig) {
  if (layer.breakdown && layer.breakdown.filter((b) => typeof b !== 'string').length) {
    throw new Error('breakdown must be a field name when not using index source');
  }
  if (layer.splitBy && layer.splitBy.filter((s) => typeof s !== 'string').length) {
    throw new Error('xAxis must be a field name when not using index source');
  }
  return [
    ...(layer.breakdown
      ? layer.breakdown.map((b, i) => {
          return getValueColumn(`${ACCESSOR}_breakdown_${i}`, b as string);
        })
      : []),
    ...(layer.splitBy
      ? layer.splitBy.map((b, i) => {
          return getValueColumn(`${ACCESSOR}_splitby_${i}`, b as string);
        })
      : []),
    getValueColumn(ACCESSOR, layer.value),
  ];
}

export async function buildTable(
  config: LensTableConfig,
  { dataViewsAPI, formulaAPI }: BuildDependencies
): Promise<LensAttributes> {
  const dataviews: Record<string, DataView> = {};
  const _buildFormulaLayer = (cfg: unknown, i: number, dataView: DataView) =>
    buildFormulaLayer(cfg as LensTableConfig, i, dataView, formulaAPI);
  const datasourceStates = await buildDatasourceStates(
    config,
    dataviews,
    _buildFormulaLayer,
    getValueColumns,
    dataViewsAPI
  );
  return {
    title: config.title,
    visualizationType: 'lnsDatatable',
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
