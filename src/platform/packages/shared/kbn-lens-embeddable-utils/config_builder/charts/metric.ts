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
  fromDatasourceStates,
  getAdhocDataviews,
  mapToFormula,
} from '../utils';
import {
  getBreakdownColumn,
  getFormulaColumn,
  getHistogramColumn,
  getValueColumn,
} from '../columns';

const ACCESSOR = 'metric_formula_accessor';
const HISTOGRAM_COLUMN_NAME = 'x_date_histogram';
const TRENDLINE_LAYER_ID = 'layer_0_trendline';

function getAccessorName(type: 'max' | 'breakdown' | 'secondary') {
  return `${ACCESSOR}_${type}`;
}
function buildVisualizationState(config: LensMetricConfig): MetricVisualizationState {
  const layer = config;

  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: 'data',
    metricAccessor: ACCESSOR,
    color: layer.seriesColor,
    subtitle: layer.subtitle,
    showBar: false,

    ...(layer.querySecondaryMetric
      ? {
          secondaryMetricAccessor: getAccessorName('secondary'),
        }
      : {}),

    ...(layer.queryMaxValue
      ? {
          maxAccessor: getAccessorName('max'),
          showBar: true,
        }
      : {}),

    ...(layer.breakdown
      ? {
          breakdownByAccessor: getAccessorName('breakdown'),
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

function reverseBuildVisualizationState(
  visualization: MetricVisualizationState
): LensMetricConfig {

  if (visualization.metricAccessor === undefined) {
    throw new Error('Metric accessor is missing in the visualization state');
  }

  // parse all accessors into apropriate configs (dataset + query)
  const accessorName = visualization.metricAccessor;
  const breakdownAccessor = visualization.breakdownByAccessor;
  const secondaryAccessor = visualization.secondaryMetricAccessor;
  const maxAccessor = visualization.maxAccessor;

  const dataset = {
    index: visualization.layerId,
    timeFieldName: visualization.trendlineTimeAccessor,
  } as LensMetricConfig['dataset'];

  const breakdown = buildBreakdownConfig();
  const querySecondaryMetric = buildQuery();
  const queryMaxValue = buildQuery();
  const query = buildQuery();

  return {
    chartType: 'metric',    
    title: '',
    label: '',
    value: '',
    dataset,
    seriesColor: visualization.color,
    subtitle: visualization.subtitle,
    breakdown,
    querySecondaryMetric,
    queryMaxValue,
    compactValues: true,
    decimals: 2,
    normalizeByUnit: 's',
    randomSampling: 1,
    useGlobalFilter: true,
    format: 'number',
    filter: '',
    trendLine: Boolean(visualization.trendlineLayerId),

  };
}

function buildFormulaLayer(
  layer: LensMetricConfig,
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
      ...getFormulaColumn(ACCESSOR, mapToFormula(layer), dataView, formulaAPI),
    },
    ...(layer.trendLine
      ? {
          [TRENDLINE_LAYER_ID]: {
            linkToLayers: [DEFAULT_LAYER_ID],
            ...getFormulaColumn(
              `${ACCESSOR}_trendline`,
              mapToFormula(layer),
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
    const columnName = getAccessorName('breakdown');
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
    const columnName = getAccessorName('secondary');
    const formulaColumn = getFormulaColumn(
      columnName,
      { formula: layer.querySecondaryMetric },
      dataView,
      formulaAPI
    );

    addLayerFormulaColumns(defaultLayer, formulaColumn);
    if (trendLineLayer) {
      addLayerFormulaColumns(trendLineLayer, formulaColumn, 'X0');
    }
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
    if (trendLineLayer) {
      addLayerFormulaColumns(trendLineLayer, formulaColumn, 'X0');
    }
  }

  return layers;
}

function reverseBuildFormulaLayer(
  layer: FormBasedPersistedState['layers'][typeof DEFAULT_LAYER_ID],
  dataView: DataView
): LensMetricConfig {
  const formulaColumn = layer.columns[ACCESSOR];
  if (!formulaColumn || formulaColumn.operationType !== 'formula') {
    throw new Error('Metric formula column is missing or invalid');
  }
  const visualization = reverseBuildVisualizationState(
    layer.visualization as MetricVisualizationState
  );
  const breakdownColumn = layer.columns[visualization.breakdownByAccessor!];
  const secondaryColumn = layer.columns[visualization.secondaryMetricAccessor!];
  const maxColumn = layer.columns[visualization.maxAccessor!];  
  return {
    chartType: 'metric',
    title: layer.title || '',
    value: formulaColumn.params.formula,
    seriesColor: visualization.color,
    subtitle: visualization.subtitle,
    breakdown:
      breakdownColumn && typeof breakdownColumn.sourceField === 'string'
        ? breakdownColumn.sourceField
        : undefined,
    querySecondaryMetric:
      secondaryColumn && typeof secondaryColumn.formula === 'string'
        ? secondaryColumn.formula
        : undefined,
    queryMaxValue:
      maxColumn && typeof maxColumn.formula === 'string' ? maxColumn.formula : undefined,
    trendLine: Boolean(layer.linkToLayers?.includes(TRENDLINE_LAYER_ID)),
  };
}


function getValueColumns(layer: LensMetricConfig) {
  if (layer.breakdown && typeof layer.breakdown !== 'string') {
    throw new Error('breakdown must be a field name when not using index source');
  }
  return [
    ...(layer.breakdown
      ? [getValueColumn(getAccessorName('breakdown'), layer.breakdown as string)]
      : []),
    getValueColumn(ACCESSOR, layer.value, 'number'),
    ...(layer.queryMaxValue
      ? [getValueColumn(getAccessorName('max'), layer.queryMaxValue, 'number')]
      : []),
    ...(layer.querySecondaryMetric
      ? [getValueColumn(getAccessorName('secondary'), layer.querySecondaryMetric)]
      : []),
  ];
}

export async function buildMetric(
  config: LensMetricConfig,
  { dataViewsAPI, formulaAPI }: BuildDependencies
): Promise<LensAttributes> {
  const dataviews: Record<string, DataView> = {};
  const _buildFormulaLayer = (cfg: unknown, i: number, dataView: DataView) =>
    buildFormulaLayer(cfg as LensMetricConfig, i, dataView, formulaAPI);
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

export async function reverseBuildMetric(
  attributes: LensAttributes
): Promise<LensMetricConfig> {
  const { state } = attributes;
  const visualization = state.visualization as MetricVisualizationState;
  const layers = Object.values(datasourceStates)[0].layers;

  const layer = layers[DEFAULT_LAYER_ID] as FormBasedPersistedState['layers'][typeof DEFAULT_LAYER_ID];
  const formulaColumn = layer.columns[ACCESSOR];

  if (!formulaColumn) {
    throw new Error('Metric formula column is missing');
  }

  
  const visualizationState = reverseBuildVisualizationState(visualization);
  const dataViews = parseReferences(attributes.references, state.adHocDataViews);
  const datasourceStates = fromDatasourceStates(state.datasourceStates);

  return {
    ...visualizationState,
    ...datasourceStates,
  }
}
