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
  MetricVisualizationState,
  PersistedIndexPatternLayer,
} from '@kbn/lens-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { BuildDependencies, DEFAULT_LAYER_ID, LensAttributes, LensMetricConfig } from '../types';
import {
  addLayerColumn,
  addLayerFormulaColumns,
  buildDatasourceStates,
  buildReferences,
  getAdhocDataviews,
} from '../utils';
import {
  getBreakdownColumn,
  getFormulaColumn,
  getHistogramColumn,
  getValueColumn,
} from '../columns';

const ACCESSOR = 'metric_formula_accessor';
const HISTOGRAM_COLUMN_NAME = 'x_date_histogram';
const TRENDLINE_LAYER_ID = `layer_trendline`;

function buildVisualizationState(config: LensMetricConfig): MetricVisualizationState {
  if (config.layers.length !== 1) {
    throw new Error('metric must define a single layer');
  }

  const layer = config.layers[0];

  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: 'data',
    metricAccessor: ACCESSOR,
    color: layer.seriesColor,
    // subtitle: layer.subtitle,
    showBar: false,

    ...(layer.querySecondaryMetric
      ? {
          secondaryMetricAccessor: `${ACCESSOR}_secondary`,
        }
      : {}),

    ...(layer.queryMaxValue
      ? {
          maxAccessor: `${ACCESSOR}_max`,
          showBar: true,
        }
      : {}),

    ...(layer.breakdown
      ? {
          breakdownByAccessor: `${ACCESSOR}_breakdown`,
        }
      : {}),

    ...(layer.trendLine
      ? {
          trendlineLayerId: `${DEFAULT_LAYER_ID}_trendline`,
          trendlineLayerType: 'metricTrendline',
          trendlineMetricAccessor: `${ACCESSOR}_trendline`,
          trendlineTimeAccessor: HISTOGRAM_COLUMN_NAME,
          ...(layer.querySecondaryMetric
            ? {
                trendlineSecondaryMetricAccessor: `${ACCESSOR}_secondary_trendline`,
              }
            : {}),

          ...(layer.queryMaxValue
            ? {
                trendlineMaxAccessor: `${ACCESSOR}_max_trendline`,
              }
            : {}),

          ...(layer.breakdown
            ? {
                trendlineBreakdownByAccessor: `${ACCESSOR}_breakdown_trendline`,
              }
            : {}),
        }
      : {}),
  };
}

function buildFormulaLayer(
  layer: LensMetricConfig['layers'][0],
  i: number,
  dataView: DataView,
  formulaAPI: FormulaPublicApi
): FormBasedPersistedState['layers'][0] {
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
    layer_trendline?: PersistedIndexPatternLayer;
  } = {
    [DEFAULT_LAYER_ID]: {
      ...getFormulaColumn(
        ACCESSOR,
        {
          value: layer.value,
        },
        dataView,
        formulaAPI
      ),
    },
    ...(layer.trendLine
      ? {
          [TRENDLINE_LAYER_ID]: {
            linkToLayers: [DEFAULT_LAYER_ID],
            ...getFormulaColumn(
              `${ACCESSOR}_trendline`,
              { value: layer.value },
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

  if (layer.breakdown) {
    const columnName = `${ACCESSOR}_breakdown`;
    const breakdownColumn = getBreakdownColumn({
      options: layer.breakdown,
      dataView,
    });
    addLayerColumn(defaultLayer, columnName, breakdownColumn, true);

    if (trendLineLayer) {
      addLayerColumn(trendLineLayer, `${columnName}_trendline`, breakdownColumn, true);
    }
  }

  if (layer.querySecondaryMetric) {
    const columnName = `${ACCESSOR}_secondary`;
    const formulaColumn = getFormulaColumn(
      columnName,
      {
        value: layer.querySecondaryMetric,
      },
      dataView,
      formulaAPI
    );

    addLayerFormulaColumns(defaultLayer, formulaColumn);
    if (trendLineLayer) {
      addLayerFormulaColumns(trendLineLayer, formulaColumn, 'X0');
    }
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
    if (trendLineLayer) {
      addLayerFormulaColumns(trendLineLayer, formulaColumn, 'X0');
    }
  }

  return layers[DEFAULT_LAYER_ID];
}

function getValueColumns(layer: LensMetricConfig['layers'][0]) {
  if (layer.breakdown && typeof layer.breakdown !== 'string') {
    throw new Error('breakdown must be a field name when not using index source');
  }
  return [
    ...(layer.breakdown
      ? [getValueColumn(`${ACCESSOR}_breakdown`, layer.breakdown as string)]
      : []),
    getValueColumn(ACCESSOR, layer.value),
    ...(layer.queryMaxValue ? [getValueColumn(`${ACCESSOR}_max`, layer.queryMaxValue)] : []),
    ...(layer.querySecondaryMetric
      ? [getValueColumn(`${ACCESSOR}_secondary`, layer.querySecondaryMetric)]
      : []),
  ];
}

export async function buildMetric(
  config: LensMetricConfig,
  { dataViewsAPI, formulaAPI }: BuildDependencies
): Promise<LensAttributes> {
  const dataviews: Record<string, DataView> = {};
  const _buildFormulaLayer = (cfg: unknown, i: number, dataView: DataView) =>
    buildFormulaLayer(cfg as LensMetricConfig['layers'][0], i, dataView, formulaAPI);
  const datasourceStates = await buildDatasourceStates(
    config,
    dataviews,
    _buildFormulaLayer,
    getValueColumns,
    dataViewsAPI
  );
  return {
    title: config.title,
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
