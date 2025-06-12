/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  FieldBasedIndexPatternColumn,
  FormBasedLayer,
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
  buildQuery,
  buildReferences,
  getAdhocDataviews,
  mapToFormula,
} from '../utils';
import {
  fromBreakdownColumn,
  getBreakdownColumn,
  getFormulaColumn,
  getHistogramColumn,
  getValueColumn,
} from '../columns';
import { DataViewsCommon } from '../config_builder';

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
    color: typeof(layer.seriesColor) === 'string' ? layer.seriesColor : layer.seriesColor?.color,
    subtitle: layer.subtitle,
    showBar: typeof(layer.trendLine) === 'object' && layer.trendLine?.type === 'bar',
    icon: layer.icon,
    maxCols: typeof(layer.trendLine) === 'object' ? layer.trendLine.maxCols : undefined,
    progressDirection: typeof(layer.trendLine) === 'object' ? layer.trendLine.progressDirection : undefined,

    secondaryPrefix: layer.secondaryMetricPrefix,
    secondaryTrend: layer.secondaryMetricColor
      ? {
          type: 'static',
          color: typeof(layer.secondaryMetricColor) === 'string' ? layer.secondaryMetricColor : layer.secondaryMetricColor.color!,
        }
      : undefined,

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
  visualization: MetricVisualizationState, layer: FormBasedLayer, dataViews: DataViewsCommon, formulaAPI?: FormulaPublicApi
): LensMetricConfig {

  if (visualization.metricAccessor === undefined) {
    throw new Error('Metric accessor is missing in the visualization state');
  }

  // parse all accessors into apropriate configs (dataset + query)
  
  const dataset = {
    index: layer.indexPatternId || '',
  } as LensMetricConfig['dataset'];

  const query = buildQuery(visualization.metricAccessor, layer, dataViews, formulaAPI);
  const breakdown = visualization.breakdownByAccessor ? fromBreakdownColumn(layer.columns[visualization.breakdownByAccessor] as FieldBasedIndexPatternColumn) : undefined ;
  const querySecondaryMetric = buildQuery(visualization.secondaryMetricAccessor, layer, dataViews, formulaAPI);
  const queryMaxValue = buildQuery(visualization.maxAccessor, layer, dataViews, formulaAPI);
  
  const props: Partial<LensMetricConfig> = {};

  

  if (visualization.color) {
    props.seriesColor = visualization.color;
  }

  if (visualization.secondaryTrend) {
    // just static color is supported for now
    // visualization.secondaryTrend.type
    if (visualization.secondaryTrend.type === 'static' && visualization.secondaryTrend.color) {
      props.secondaryMetricColor = visualization.secondaryTrend.color;
    }
  }

  if (visualization.secondaryPrefix) {
    props.secondaryMetricPrefix = visualization.secondaryPrefix;
  }

  if (visualization.icon) {
    props.icon = visualization.icon;
  }

  if (visualization.trendlineMetricAccessor) {
    if (visualization.showBar) {
      props.trendLine = { type: 'bar' };
    } else {
      props.trendLine = { type: 'line' };
    }

    if (visualization.maxCols) {
      props.trendLine.maxCols = visualization.maxCols;
    }

    if (visualization.progressDirection) {
      props.trendLine.progressDirection = visualization.progressDirection;
    }
  }

  return {
    chartType: 'metric',    
    title: '',
    dataset,
    value: query!,
    seriesColor: visualization.color,
    subtitle: visualization.subtitle,
    breakdown,
    querySecondaryMetric,
    queryMaxValue,
    ...props,
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
    sampling: layer.randomSampling || 1,
    ignoreGlobalFilters: layer.useGlobalFilter === false,
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
      { formula: typeof(layer.querySecondaryMetric) === 'string' ? layer.querySecondaryMetric : layer.querySecondaryMetric.query },
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
      { formula: typeof(layer.queryMaxValue) === 'string' ? layer.queryMaxValue : layer.queryMaxValue.query },
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

function getValueColumns(layer: LensMetricConfig) {
  if (layer.breakdown && typeof layer.breakdown !== 'string') {
    throw new Error('breakdown must be a field name when not using index source');
  }
  return [
    ...(layer.breakdown
      ? [getValueColumn(getAccessorName('breakdown'), layer.breakdown as string)]
      : []),
    getValueColumn(ACCESSOR, typeof(layer.value) === 'string' ? layer.value : layer.value.query, 'number'),
    ...(layer.queryMaxValue
      ? [getValueColumn(getAccessorName('max'), typeof(layer.queryMaxValue) === 'string' ? layer.queryMaxValue : layer.queryMaxValue.query, 'number')]
      : []),
    ...(layer.querySecondaryMetric
      ? [getValueColumn(getAccessorName('secondary'), typeof(layer.querySecondaryMetric) === 'string' ? layer.querySecondaryMetric : layer.querySecondaryMetric.query)]
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

// gets full lens attributes in and builds LensMetricConfig out of it
export async function reverseBuildMetric(
  attributes: LensAttributes,
  dataView: DataViewsCommon,
  formulaAPI?: FormulaPublicApi
): Promise<LensMetricConfig> {
  const { state } = attributes;
  const visualization = state.visualization as MetricVisualizationState;
  const layers = state.datasourceStates.formBased!.layers;

  const layer = Object.values(layers)[0] as FormBasedLayer;
  
  const visualizationState = reverseBuildVisualizationState(visualization, layer, dataView, formulaAPI);

  return visualizationState;
}
