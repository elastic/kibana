/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  FormBasedLayer,
  FormBasedPersistedState,
  FormulaPublicApi,
  GenericIndexPatternColumn,
  MetricVisualizationState,
  PersistedIndexPatternLayer,
} from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { BuildDependencies, DEFAULT_LAYER_ID, LensAttributes } from '../types';
import {
  addLayerColumn,
  buildDatasetState,
  buildDatasourceStates,
  buildReferences,
  getAdhocDataviews,
  operationFromColumn,
} from '../utils';
import {
  getBreakdownColumn,
  getHistogramColumn,
  getValueColumn,
} from '../columns';

import { MetricState } from '../schema';
import { DataViewsCommon } from '../config_builder';
import { getMetricColumn } from '../columns/metric';
import { LensApiMetricOperations } from '../schema/metric_ops';
import { LensApiBucketOperations } from '../schema/bucket_ops';
import { generateLayer, DeepMutable } from '../utils';
import { TextBasedLayer } from '@kbn/lens-plugin/public/datasources/form_based/esql_layer/types';

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
    color: layer.metric?.color?.type === 'static' ? layer.metric.color.color : undefined,
    subtitle: layer.metric?.sub_label,
    showBar: false,

    ...(layer.secondary_metric
      ? {
          secondaryMetricAccessor: getAccessorName('secondary'),
        }
      : {}),

    ...(layer.metric?.background_chart?.type === 'bar'
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

    ...(layer.metric.background_chart?.type === 'trend'
      ? {
          trendlineLayerId: `${DEFAULT_LAYER_ID}_trendline`,
          trendlineLayerType: 'metricTrendline',
          trendlineMetricAccessor: `${ACCESSOR}_trendline`,
          trendlineTimeAccessor: HISTOGRAM_COLUMN_NAME,
          ...(layer.secondary_metric
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

function reverseBuildVisualizationState(
  visualization: MetricVisualizationState, layer: FormBasedLayer, dataViews: DataViewsCommon, formulaAPI?: FormulaPublicApi
): MetricState {

  if (visualization.metricAccessor === undefined) {
    throw new Error('Metric accessor is missing in the visualization state');
  }

  const dataset = buildDatasetState(layer, dataViews);

  let props: Partial<DeepMutable<MetricState>>;

  if (dataset.type === 'esql' || dataset.type === 'table') {
    const esqlLayer = layer as unknown as TextBasedLayer;
    // handle for esql case (just column name)
    props = {
      metric: {
        operation: 'value',
        column: esqlLayer.columns.find(c => c.columnId == visualization.metricAccessor)!.fieldName,
      },
      ...(visualization.secondaryMetricAccessor ? {
        secondary_metric: {
          operation: 'value',
          column: esqlLayer.columns.find(c => c.columnId == visualization.secondaryMetricAccessor)!.fieldName,
        },
      } : {}),
      ...(visualization.maxAccessor ? {
        max_value: {
          operation: 'value',
          column: esqlLayer.columns.find(c => c.columnId == visualization.maxAccessor)!.fieldName,
        },
      } : {}),
      ...(visualization.breakdownByAccessor ? {
        breakdown_by: {
          operation: 'value',
          column: esqlLayer.columns.find(c => c.columnId == visualization.breakdownByAccessor)!.fieldName,
        },
      } : {}),
    };
  } else if (dataset.type === 'adhoc' || dataset.type === 'index') {
    const metric = operationFromColumn(visualization.metricAccessor, layer, dataViews, formulaAPI) as LensApiMetricOperations;
    const secondary_metric = visualization.secondaryMetricAccessor ? operationFromColumn(visualization.secondaryMetricAccessor, layer, dataViews, formulaAPI) as LensApiMetricOperations : undefined;
    const max_value = visualization.maxAccessor ? operationFromColumn(visualization.maxAccessor, layer, dataViews, formulaAPI) as LensApiMetricOperations : undefined;
    const breakdown_by = visualization.breakdownByAccessor ? operationFromColumn(visualization.breakdownByAccessor, layer, dataViews, formulaAPI) as LensApiBucketOperations : undefined;

    props = {
      metric,
      ...(secondary_metric ? { secondary_metric } : {}),
      ...(max_value ? { max_value } : {}),
      ...(breakdown_by ? { breakdown_by } : {}),
    };
  } else {
    throw new Error('Unsupported dataset type');
  }

  if (visualization.subtitle) {
    props.metric!.sub_label = visualization.subtitle;
  }

  if (props.secondary_metric) {
    // just static color is supported for now
    // visualization.secondaryTrend.type
    if (visualization.secondaryTrend?.type === 'static' && visualization.secondaryTrend?.color) {
      props.secondary_metric!.color = {
        type: 'static',
        color: visualization.secondaryTrend.color,
      }
    }

    if (visualization.secondaryPrefix) {
      props.secondary_metric!.prefix = visualization.secondaryPrefix;
    }
  }

  

  if (visualization.icon) {
    props.metric!.icon = {
      name: visualization.icon,
    }
  }

  return {
    type: 'metric',    
    title: '',
    dataset,
    ...props,
  } as MetricState;
}

function buildFormBasedLayer(
  layer: MetricState,
  i: number,
  dataView: DataView,
  formulaAPI?: FormulaPublicApi
): FormBasedPersistedState['layers'] {

  const columns = getMetricColumn(layer.metric as LensApiMetricOperations);
  
  const layers: Record<string, PersistedIndexPatternLayer> = {
    ...generateLayer(DEFAULT_LAYER_ID, layer),
    ...(layer.metric?.background_chart?.type === 'trend'
      ? generateLayer(TRENDLINE_LAYER_ID, layer)
      : {}),
  };

  const defaultLayer = layers[DEFAULT_LAYER_ID];
  const trendLineLayer = layers[TRENDLINE_LAYER_ID];

  addLayerColumn(defaultLayer, ACCESSOR, columns);
  if (trendLineLayer) {
    addLayerColumn(trendLineLayer, `${ACCESSOR}_trendline`, columns);
  }

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

  if (layer.secondary_metric) {
    const columnName = getAccessorName('secondary');
    const columns = getMetricColumn(
      layer.secondary_metric as LensApiMetricOperations
    );

    addLayerColumn(defaultLayer, columnName, columns);
    if (trendLineLayer) {
      addLayerColumn(trendLineLayer, `${columnName}_trendline`, columns, false, 'X0');
    }
  }

  if (layer.metric?.background_chart?.type === 'bar') {
    const columnName = getAccessorName('max');
    const columns = getMetricColumn(
      { operation: 'max', field: 'max' },
    );

    addLayerColumn(defaultLayer, columnName, columns);
    if (trendLineLayer) {
      addLayerColumn(trendLineLayer, `${columnName}_trendline`, columns, false, 'X0');
    }
  }

  return layers;
}

function getValueColumns(layer: MetricState) {

  return [
    ...(layer.breakdown_by
      ? [getValueColumn(getAccessorName('breakdown'), layer.breakdown_by.operation)]
      : []),
    getValueColumn(ACCESSOR, layer.metric.operation, 'number'),
    ...(layer.metric?.background_chart?.type === 'bar'
      ? [getValueColumn(getAccessorName('max'), layer.metric.background_chart.goal_value.operation, 'number')]
      : []),
    ...(layer.secondary_metric
      ? [getValueColumn(getAccessorName('secondary'), layer.secondary_metric.operation)]
      : []),
  ];
}

export async function buildMetric(
  config: MetricState,
  { dataViewsAPI, formulaAPI }: BuildDependencies
): Promise<LensAttributes> {
  const dataviews: Record<string, DataView> = {};
  
  const _buildDataLayer = (cfg: unknown, i: number, dataView: DataView) =>
    buildFormBasedLayer(cfg as MetricState, i, dataView, formulaAPI);

  const datasourceStates = await buildDatasourceStates(
    config,
    dataviews,
    _buildDataLayer,
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

export async function reverseBuildMetric(
  attributes: LensAttributes,
  dataView: DataViewsCommon,
  formulaAPI?: FormulaPublicApi
): Promise<MetricState> {
  const { state } = attributes;
  const visualization = state.visualization as MetricVisualizationState;
  const layers = state.datasourceStates.formBased!.layers;

  const layer = Object.values(layers)[0] as FormBasedLayer;

  const visualizationState = reverseBuildVisualizationState(visualization, layer, dataView, formulaAPI);

  return visualizationState;
}