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

  // if dataset type === esql:
  //   operation is just the column name, check lkensattributes
  // if dataset type === table:
  //   same as esql, check whats on lens attributes ?
  // if dataset type === adhoc:
  //   create adhoc index pattern ? or we dont need it here ?
  // if dataset type === index:
  //   load index, get timefield ? or we dont need it here ?


  // in case of index or adhoc, we need to build operations from columns
  // metric operation can also be formula !!

  const metric = operationFromColumn(visualization.metricAccessor, layer, dataViews, formulaAPI) as LensApiMetricOperations;
  const secondary_metric = visualization.secondaryMetricAccessor ? operationFromColumn(visualization.secondaryMetricAccessor, layer, dataViews, formulaAPI) as LensApiMetricOperations : undefined;
  const max_value = visualization.maxAccessor ? operationFromColumn(visualization.maxAccessor, layer, dataViews, formulaAPI) as LensApiMetricOperations : undefined;
  const breakdown_by = visualization.breakdownByAccessor ? operationFromColumn(visualization.breakdownByAccessor, layer, dataViews, formulaAPI) as LensApiBucketOperations : undefined;

  type DeepMutable<T> = {
    -readonly [P in keyof T]: T[P] extends object
      ? T[P] extends (...args: any[]) => any
        ? T[P] // don't mutate functions
        : DeepMutable<T[P]>
      : T[P];
  };

  const props: Partial<DeepMutable<MetricState>> = {
    metric,
    ...(secondary_metric ? { secondary_metric } : {}),
    ...(max_value ? { max_value } : {}),
    ...(breakdown_by ? { breakdown_by } : {}),
  };

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
      columnOrder: [ACCESSOR],
      columns: {
        [ACCESSOR]: getMetricColumn(layer.metric as LensApiMetricOperations),
      },
      sampling: layer.samplings,
      ignoreGlobalFilters: layer.ignore_global_filters,
    },
    ...(layer.metric?.background_chart?.type === 'trend'
      ? {
          [TRENDLINE_LAYER_ID]: {
            linkToLayers: [DEFAULT_LAYER_ID],
            columnOrder: [`${ACCESSOR}_trendline`],
            columns: {
              [`${ACCESSOR}_trendline`]: getMetricColumn(layer.metric as LensApiMetricOperations),
            },
            sampling: layer.samplings,
            ignoreGlobalFilters: layer.ignore_global_filters,
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

  if (layer.secondary_metric) {
    const columnName = getAccessorName('secondary');
    const column = getMetricColumn(
      layer.secondary_metric as LensApiMetricOperations
    );

    addLayerColumn(defaultLayer, columnName, column);
    if (trendLineLayer) {
      addLayerColumn(trendLineLayer, `${columnName}_trendline`, column, false, 'X0');
    }
  }

  if (layer.metric?.background_chart?.type === 'bar') {
    const columnName = getAccessorName('max');
    const column = getMetricColumn(
      { operation: 'max', field: 'max' },
    );

    addLayerColumn(defaultLayer, columnName, column);
    if (trendLineLayer) {
      addLayerColumn(trendLineLayer, `${columnName}_trendline`, column , false, 'X0');
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