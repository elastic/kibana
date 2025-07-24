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
  MetricVisualizationState,
  PersistedIndexPatternLayer,
} from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { BuildDependencies, DEFAULT_LAYER_ID, LensAttributes, LensMetricConfig } from '../types';
import {
  addLayerColumn,
  addLayerFormulaColumns,
  buildDatasourceStates,
  buildReferences,
  getAdhocDataviews,
  mapToFormula,
} from '../utils';
import {
  getBreakdownColumn,
  getFormulaColumn,
  getHistogramColumn,
  getValueColumn,
} from '../columns';

import { MetricState } from '../zod_schema';

const ACCESSOR = 'metric_formula_accessor';
const HISTOGRAM_COLUMN_NAME = 'x_date_histogram';
const TRENDLINE_LAYER_ID = 'layer_0_trendline';

function getAccessorName(type: 'max' | 'breakdown' | 'secondary') {
  return `${ACCESSOR}_${type}`;
}
function buildVisualizationState(config: MetricState): MetricVisualizationState {
  const layer = config;

  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: 'data',
    metricAccessor: ACCESSOR,
    color: layer.primary_value?.color?.type === 'static' ? layer.primary_value.color.code : undefined,
    subtitle: layer.primary_value?.sub_label,
    showBar: false,

    ...(layer.secondary_value
      ? {
          secondaryMetricAccessor: getAccessorName('secondary'),
        }
      : {}),

    ...(layer.primary_value?.background_chart?.type === 'bar'
      ? {
          maxAccessor: getAccessorName('max'),
          showBar: true,
        }
      : {}),

    ...(layer.breakdown_by
      ? {
          breakdownByAccessor: getAccessorName('breakdown'),
        }
      : {}),

    ...(layer.primary_value.background_chart?.type === 'trend'
      ? {
          trendlineLayerId: `${DEFAULT_LAYER_ID}_trendline`,
          trendlineLayerType: 'metricTrendline',
          trendlineMetricAccessor: `${ACCESSOR}_trendline`,
          trendlineTimeAccessor: HISTOGRAM_COLUMN_NAME,
          ...(layer.secondary_value
            ? {
                trendlineSecondaryMetricAccessor: `${ACCESSOR}_secondary_trendline`,
              }
            : {}),

          ...(layer.breakdown_by
            ? {
                trendlineBreakdownByAccessor: `${ACCESSOR}_breakdown_trendline`,
              }
            : {}),
        }
      : {}),
  };
}

function buildFormulaLayer(
  layer: MetricState,
  i: number,
  dataView: DataView,
  formulaAPI?: FormulaPublicApi
): FormBasedPersistedState['layers'] {
  const baseLayer: PersistedIndexPatternLayer = {
    columnOrder: [ACCESSOR, HISTOGRAM_COLUMN_NAME],
    columns: {
      [HISTOGRAM_COLUMN_NAME]: getHistogramColumn({
        options: {
          sourceField: dataView.timeFieldName,
          params: {
            interval: 'auto',
            includeEmptyRows: true,
          },
        },
      }),
    },
    sampling: 1,
  };

  const layers: {
    layer_0: PersistedIndexPatternLayer;
    layer_0_trendline?: PersistedIndexPatternLayer;
  } = {
    [DEFAULT_LAYER_ID]: {
      ...getFormulaColumn(ACCESSOR, mapToFormula(layer.primary_value), dataView, formulaAPI),
    },
    ...(layer.primary_value?.background_chart?.type === 'trend' && formulaAPI
      ? {
          [TRENDLINE_LAYER_ID]: {
            linkToLayers: [DEFAULT_LAYER_ID],
            ...getFormulaColumn(
              `${ACCESSOR}_trendline`,
              mapToFormula(layer.primary_value),
              dataView,
              formulaAPI,
              baseLayer
            ),
          },
        }
      : {}),
  };

  const defaultLayer = layers[DEFAULT_LAYER_ID];
  const trendLineLayer = layers[TRENDLINE_LAYER_ID];

  if (layer.breakdown_by) {
    const columnName = getAccessorName('breakdown');
    const breakdownColumn = getBreakdownColumn({
      options: layer.breakdown_by,
      dataView,
    });
    addLayerColumn(defaultLayer, columnName, breakdownColumn, true);

    if (trendLineLayer) {
      addLayerColumn(trendLineLayer, `${columnName}_trendline`, breakdownColumn, true);
    }
  }

  if (layer.secondary_value) {
    const columnName = getAccessorName('secondary');
    const formulaColumn = getFormulaColumn(
      columnName,
      { formula: layer.secondary_value.formula },
      dataView,
      formulaAPI
    );

    addLayerFormulaColumns(defaultLayer, formulaColumn);
    if (trendLineLayer) {
      addLayerFormulaColumns(trendLineLayer, formulaColumn, 'X0');
    }
  }

  if (layer.primary_value?.background_chart?.type === 'bar') {
    const columnName = getAccessorName('max');
    const formulaColumn = getFormulaColumn(
      columnName,
      { formula: layer.primary_value?.background_chart?.goal_value.formula },
      dataView,
      formulaAPI
    );

    addLayerFormulaColumns(defaultLayer, formulaColumn);
    if (trendLineLayer) {
      addLayerFormulaColumns(trendLineLayer, formulaColumn, 'X0');
    }
  }

  return layers;
}

function getValueColumns(layer: MetricState) {

  return [
    ...(layer.breakdown_by
      ? [getValueColumn(getAccessorName('breakdown'), layer.breakdown_by.operation)]
      : []),
    getValueColumn(ACCESSOR, layer.primary_value.operation, 'number'),
    ...(layer.primary_value?.background_chart?.type === 'bar'
      ? [getValueColumn(getAccessorName('max'), layer.primary_value.background_chart.goal_value.operation, 'number')]
      : []),
    ...(layer.secondary_value
      ? [getValueColumn(getAccessorName('secondary'), layer.secondary_value.operation)]
      : []),
  ];
}

export async function buildMetric(
  config: MetricState,
  { dataViewsAPI, formulaAPI }: BuildDependencies
): Promise<LensAttributes> {
  const dataviews: Record<string, DataView> = {};
  const _buildFormulaLayer = (cfg: unknown, i: number, dataView: DataView) =>
    buildFormulaLayer(cfg as MetricState, i, dataView, formulaAPI);
  const datasourceStates = await buildDatasourceStates(
    config,
    dataviews,
    _buildFormulaLayer,
    getValueColumns,
    dataViewsAPI
  );
  return {
    title: config.title ?? '',
    description: config.description ?? '',
    visualizationType: 'lnsMetric',
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
