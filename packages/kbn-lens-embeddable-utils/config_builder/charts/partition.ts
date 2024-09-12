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
  PieVisualizationState,
} from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  BuildDependencies,
  DEFAULT_LAYER_ID,
  LensAttributes,
  LensPieConfig,
  LensTreeMapConfig,
  LensMosaicConfig,
  LensLegendConfig,
} from '../types';
import {
  addLayerColumn,
  buildDatasourceStates,
  buildReferences,
  getAdhocDataviews,
  mapToFormula,
} from '../utils';
import { getBreakdownColumn, getFormulaColumn, getValueColumn } from '../columns';

const ACCESSOR = 'metric_formula_accessor';

function buildVisualizationState(
  config: LensTreeMapConfig | LensPieConfig | LensMosaicConfig
): PieVisualizationState {
  const layer = config;

  const layerBreakdown = Array.isArray(layer.breakdown) ? layer.breakdown : [layer.breakdown];

  let legendDisplay: 'default' | 'hide' | 'show' = 'default';
  let legendPosition: LensLegendConfig['position'] = 'right';

  if ('legend' in config && config.legend) {
    if ('show' in config.legend) {
      legendDisplay = config.legend ? 'show' : 'hide';
    }
    legendPosition = config.legend.position || 'right';
  }
  return {
    shape: config.chartType,
    layers: [
      {
        layerId: DEFAULT_LAYER_ID,
        layerType: 'data',
        metrics: [ACCESSOR],
        allowMultipleMetrics: false,
        numberDisplay: 'percent',
        categoryDisplay: 'default',
        legendDisplay,
        legendPosition,
        primaryGroups: layerBreakdown.map((breakdown, i) => `${ACCESSOR}_breakdown_${i}`),
      },
    ],
  };
}

function buildFormulaLayer(
  layer: LensTreeMapConfig | LensPieConfig | LensMosaicConfig,
  layerNr: number,
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
    const layerBreakdown = Array.isArray(layer.breakdown) ? layer.breakdown : [layer.breakdown];
    layerBreakdown.reverse().forEach((breakdown, i) => {
      const columnName = `${ACCESSOR}_breakdown_${i}`;
      const breakdownColumn = getBreakdownColumn({
        options: breakdown,
        dataView,
      });
      addLayerColumn(defaultLayer, columnName, breakdownColumn, true);
    });
  } else {
    throw new Error('breakdown must be defined!');
  }

  return defaultLayer;
}

function getValueColumns(layer: LensTreeMapConfig) {
  if (layer.breakdown && layer.breakdown.filter((b) => typeof b !== 'string').length) {
    throw new Error('breakdown must be a field name when not using index source');
  }

  return [
    ...(layer.breakdown
      ? layer.breakdown.map((b, i) => {
          return getValueColumn(`${ACCESSOR}_breakdown_${i}`, b as string);
        })
      : []),
    getValueColumn(ACCESSOR, layer.value),
  ];
}

export async function buildPartitionChart(
  config: LensTreeMapConfig | LensPieConfig,
  { dataViewsAPI, formulaAPI }: BuildDependencies
): Promise<LensAttributes> {
  const dataviews: Record<string, DataView> = {};
  const _buildFormulaLayer = (cfg: any, i: number, dataView: DataView) =>
    buildFormulaLayer(cfg, i, dataView, formulaAPI);
  const datasourceStates = await buildDatasourceStates(
    config,
    dataviews,
    _buildFormulaLayer,
    getValueColumns,
    dataViewsAPI
  );
  return {
    title: config.title,
    visualizationType: 'lnsPie',
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
