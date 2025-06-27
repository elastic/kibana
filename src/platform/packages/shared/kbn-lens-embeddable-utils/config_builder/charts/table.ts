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
  PersistedIndexPatternLayer,
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
import {
  getBreakdownColumn,
  getColumnFromLayer,
  getFormulaColumn,
  getValueColumn,
} from '../columns';

const ACCESSOR = 'metric_formula_accessor';
function buildVisualizationState(config: LensTableConfig): DatatableVisualizationState {
  const layer = config;

  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: 'data',
    columns: [
      ...(layer.metrics || []).map((_, i) => ({
        columnId: `${ACCESSOR}_${i}`,
      })),
      ...(layer.rows || []).map((row, i) => ({
        columnId: `${ACCESSOR}_rows_${i}`,
        href: typeof row === 'string' ? undefined : row.href,
      })),
      ...(layer.splitBy || []).map((_, i) => ({ columnId: `${ACCESSOR}_splitby_${i}` })),
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
    [DEFAULT_LAYER_ID]: layer.metrics.reduce((acc, curr, valueIndex) => {
      const formulaColumn = getFormulaColumn(
        `${ACCESSOR}_${valueIndex}`,
        mapToFormula(curr),
        dataView,
        formulaAPI,
        valueIndex > 0 ? acc : undefined
      );
      return { ...acc, ...formulaColumn };
    }, {} as PersistedIndexPatternLayer),
  };

  const defaultLayer = layers[DEFAULT_LAYER_ID];

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
  if (layer.splitBy && layer.splitBy.filter((s) => typeof s !== 'string').length) {
    throw new Error('xAxis must be a field name when not using index source');
  }
  return [
    ...(layer.rows
      ? layer.rows.map((b, i) => {
          return getValueColumn(
            `${ACCESSOR}_rows_${i}`,
            typeof b === 'string' ? b : 'field' in b ? b.field : ''
          );
        })
      : []),
    ...(layer.splitBy
      ? layer.splitBy.map((b, i) => {
          return getValueColumn(
            `${ACCESSOR}_splitby_${i}`,
            typeof b === 'string' ? b : 'field' in b ? b.field : ''
          );
        })
      : []),
    ...(layer.metrics
      ? layer.metrics.map((b, i) => {
          return getColumnFromLayer(`${ACCESSOR}_${i}`, b);
        })
      : []),
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
