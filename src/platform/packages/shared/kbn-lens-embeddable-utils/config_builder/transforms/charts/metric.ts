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
  MetricVisualizationState,
  PersistedIndexPatternLayer,
  TextBasedLayer,
  TypedLensSerializedState,
} from '@kbn/lens-common';
import type { SavedObjectReference } from '@kbn/core/types';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { LensAttributes } from '../../types';
import { DEFAULT_LAYER_ID } from '../../types';
import {
  addLayerColumn,
  buildDatasetState,
  buildDatasourceStates,
  buildReferences,
  generateApiLayer,
  getAdhocDataviews,
  operationFromColumn,
} from '../utils';
import { fromBucketLensApiToLensState } from '../columns/buckets';
import { getValueApiColumn, getValueColumn } from '../columns/esql_column';
import type { MetricState } from '../../schema';
import { fromMetricAPItoLensState } from '../columns/metric';
import type { LensApiAllMetricOperations } from '../../schema/metric_ops';
import type { LensApiBucketOperations } from '../../schema/bucket_ops';
import type { DeepMutable, DeepPartial } from '../utils';
import { generateLayer } from '../utils';
import type { MetricStateESQL, MetricStateNoESQL } from '../../schema/charts/metric';
import {
  getSharedChartLensStateToAPI,
  getSharedChartAPIToLensState,
  getMetricAccessor,
  getDatasourceLayers,
  getLensStateLayer,
} from './utils';
import {
  fromColorByValueAPIToLensState,
  fromColorByValueLensStateToAPI,
  fromStaticColorAPIToLensState,
  fromStaticColorLensStateToAPI,
} from '../coloring';

type MetricApiCompareType = Extract<
  Required<MetricState['secondary_metric']>,
  { compare: any }
>['compare'];

const ACCESSOR = 'metric_accessor';
const HISTOGRAM_COLUMN_NAME = 'x_date_histogram';
const TRENDLINE_LAYER_ID = 'layer_0_trendline';
export const LENS_METRIC_COMPARE_TO_PALETTE_DEFAULT = 'compare_to';
const LENS_METRIC_COMPARE_TO_REVERSED = false;

function getAccessorName(type: 'metric' | 'max' | 'breakdown' | 'secondary') {
  return `${ACCESSOR}_${type}`;
}

function fromCompareAPIToLensState(compareToConfig: MetricApiCompareType): {
  secondaryTrend: Extract<MetricVisualizationState['secondaryTrend'], { type: 'dynamic' }>;
} {
  return {
    secondaryTrend: {
      type: 'dynamic',
      baselineValue:
        compareToConfig.to === 'primary' ? compareToConfig.to : compareToConfig.baseline,
      visuals:
        compareToConfig.icon && compareToConfig.value
          ? 'both'
          : compareToConfig.icon
          ? 'icon'
          : 'value',
      reversed: compareToConfig.palette?.includes('reversed') ?? LENS_METRIC_COMPARE_TO_REVERSED,
      paletteId: compareToConfig.palette ?? LENS_METRIC_COMPARE_TO_PALETTE_DEFAULT,
    },
  };
}

function buildVisualizationState(config: MetricState): MetricVisualizationState {
  const layer = config;

  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: 'data',
    metricAccessor: getAccessorName('metric'),
    ...(layer.metric.color?.type === 'static'
      ? fromStaticColorAPIToLensState(layer.metric.color)
      : {}),
    ...(layer.metric.color?.type === 'dynamic'
      ? { palette: fromColorByValueAPIToLensState(layer.metric.color) }
      : {}),
    ...(layer.metric.apply_color_to ? { applyColorTo: layer.metric.apply_color_to } : {}),
    subtitle: layer.metric.sub_label ?? '',
    showBar: false,
    valueFontMode: layer.metric.fit ? 'fit' : 'default',
    ...(layer.metric.alignments
      ? {
          valuesTextAlign: layer.metric.alignments.value,
          titlesTextAlign: layer.metric.alignments.labels,
        }
      : {}),
    ...(layer.metric.icon
      ? {
          icon: layer.metric.icon.name,
          iconAlign: layer.metric.icon.align,
        }
      : {}),
    ...(layer.secondary_metric
      ? {
          secondaryMetricAccessor: getAccessorName('secondary'),
          secondaryPrefix: layer.secondary_metric.prefix,
          secondaryAlign: layer.metric.alignments?.value,
          ...(layer.secondary_metric.compare
            ? fromCompareAPIToLensState(layer.secondary_metric.compare)
            : {}),
          ...(layer.secondary_metric.color?.type === 'static'
            ? { secondaryTrend: { type: 'static', color: layer.secondary_metric.color.color } }
            : {}),
        }
      : {}),
    ...(layer.breakdown_by
      ? {
          breakdownByAccessor: getAccessorName('breakdown'),
          maxCols: layer.breakdown_by.columns,
        }
      : {}),
    collapseFn: layer.breakdown_by?.collapse_by,
    ...(layer.metric?.background_chart?.type === 'bar'
      ? {
          maxAccessor: getAccessorName('max'),
          showBar: true,
          progressDirection: layer.metric.background_chart.direction,
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

function fromCompareLensStateToAPI(
  compare: Extract<MetricVisualizationState['secondaryTrend'], { type: 'dynamic' }>
): MetricApiCompareType {
  const sharedProps = {
    palette: `${compare.paletteId}${compare.reversed ? '_reversed' : ''}`,
    icon: compare.visuals === 'icon' || compare.visuals === 'both',
    value: compare.visuals === 'value' || compare.visuals === 'both',
  };
  if (compare.baselineValue === 'primary') {
    return {
      to: 'primary',
      ...sharedProps,
    };
  }
  return {
    to: 'baseline',
    baseline: compare.baselineValue,
    ...sharedProps,
  };
}

function reverseBuildVisualizationState(
  visualization: MetricVisualizationState,
  layer: Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer,
  layerId: string,
  adHocDataViews: Record<string, DataViewSpec>,
  references: SavedObjectReference[],
  adhocReferences?: SavedObjectReference[]
): MetricState {
  const metricAccessor = getMetricAccessor(visualization);
  if (metricAccessor == null) {
    throw new Error('Metric accessor is missing in the visualization state');
  }

  const dataset = buildDatasetState(layer, adHocDataViews, references, adhocReferences, layerId);

  if (!dataset || dataset.type == null) {
    throw new Error('Unsupported dataset type');
  }

  let props: DeepPartial<DeepMutable<MetricState>> = generateApiLayer(layer);

  if (dataset.type === 'esql' || dataset.type === 'table') {
    const esqlLayer = layer as TextBasedLayer;
    props = {
      ...props,
      metric: getValueApiColumn(metricAccessor, esqlLayer),
      ...(visualization.secondaryMetricAccessor
        ? {
            secondary_metric: {
              ...getValueApiColumn(visualization.secondaryMetricAccessor, esqlLayer),
              ...(visualization.maxAccessor
                ? {
                    background_chart: {
                      type: 'bar',
                      goal_value: getValueApiColumn(visualization.maxAccessor, esqlLayer),
                      direction: visualization.progressDirection,
                    },
                  }
                : {}),
            },
          }
        : {}),
      ...(visualization.breakdownByAccessor
        ? {
            breakdown_by: {
              ...getValueApiColumn(visualization.breakdownByAccessor, esqlLayer),
              columns: visualization.maxCols,
            },
          }
        : {}),
    } as MetricState;
  } else if (dataset.type === 'dataView' || dataset.type === 'index') {
    const formLayer = layer as FormBasedLayer;
    const metric = operationFromColumn(metricAccessor, formLayer) as LensApiAllMetricOperations;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const secondary_metric = visualization.secondaryMetricAccessor
      ? (operationFromColumn(
          visualization.secondaryMetricAccessor,
          formLayer
        ) as LensApiAllMetricOperations)
      : undefined;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const max_value = visualization.maxAccessor
      ? (operationFromColumn(visualization.maxAccessor, formLayer) as LensApiAllMetricOperations)
      : undefined;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const breakdown_by = visualization.breakdownByAccessor
      ? operationFromColumn(visualization.breakdownByAccessor, formLayer)
      : undefined;

    props = {
      ...props,
      metric: {
        ...metric,
        ...(max_value ?? props.metric?.background_chart
          ? {
              background_chart: {
                ...(max_value
                  ? {
                      type: 'bar',
                      goal_value: max_value,
                      direction: visualization.progressDirection,
                    }
                  : props.metric?.background_chart),
              },
            }
          : {}),
      },
      ...(secondary_metric ? { secondary_metric: { ...secondary_metric } } : {}),
      ...(breakdown_by ? { breakdown_by } : {}),
    } as MetricState;
  }

  if (props.metric) {
    if (visualization.subtitle) {
      props.metric.sub_label = visualization.subtitle;
    }

    if (visualization.trendlineLayerType) {
      props.metric.background_chart = { ...props.metric.background_chart, type: 'trend' };
    }

    if (visualization.color) {
      props.metric.color = fromStaticColorLensStateToAPI(visualization.color);
    }

    if (visualization.palette) {
      const colorByValue = fromColorByValueLensStateToAPI(visualization.palette);
      if (colorByValue?.range === 'absolute') {
        props.metric.color = colorByValue;
      }
    }

    if (visualization.applyColorTo) {
      props.metric.apply_color_to = visualization.applyColorTo;
    }

    if (visualization.icon) {
      props.metric.icon = {
        name: visualization.icon,
        align: visualization.iconAlign,
      };
    }

    if (visualization.valuesTextAlign || visualization.titlesTextAlign) {
      props.metric.alignments = {
        ...(visualization.valuesTextAlign ? { value: visualization.valuesTextAlign } : {}),
        ...(visualization.titlesTextAlign ? { labels: visualization.titlesTextAlign } : {}),
      };
    }

    props.metric.fit = visualization.valueFontMode === 'fit';
  }

  if (props.secondary_metric) {
    if (visualization.secondaryTrend?.type === 'dynamic') {
      props.secondary_metric.compare = fromCompareLensStateToAPI(visualization.secondaryTrend);
    }

    if (visualization.secondaryPrefix) {
      props.secondary_metric.prefix = visualization.secondaryPrefix;
    }

    if (visualization.secondaryTrend?.type === 'static' && visualization.secondaryTrend?.color) {
      props.secondary_metric.color = {
        type: 'static',
        color: visualization.secondaryTrend.color,
      };
    }
  }

  if (props.breakdown_by) {
    if (visualization.maxCols) {
      props.breakdown_by.columns = visualization.maxCols;
    }
    if (visualization.collapseFn) {
      props.breakdown_by.collapse_by = visualization.collapseFn;
    }
  }

  return {
    type: 'metric',
    dataset: dataset satisfies MetricState['dataset'],
    ...props,
  } as MetricState;
}

function buildFormBasedLayer(layer: MetricStateNoESQL): FormBasedPersistedState['layers'] {
  const columns = fromMetricAPItoLensState(layer.metric as LensApiAllMetricOperations);

  const layers: Record<string, PersistedIndexPatternLayer> = {
    ...generateLayer(DEFAULT_LAYER_ID, layer),
    ...(layer.metric?.background_chart?.type === 'trend'
      ? generateLayer(TRENDLINE_LAYER_ID, layer)
      : {}),
  };

  const defaultLayer = layers[DEFAULT_LAYER_ID];
  const trendLineLayer = layers[TRENDLINE_LAYER_ID];

  if (trendLineLayer) {
    trendLineLayer.linkToLayers = [DEFAULT_LAYER_ID];
  }

  addLayerColumn(defaultLayer, getAccessorName('metric'), columns);
  if (trendLineLayer) {
    addLayerColumn(trendLineLayer, `${ACCESSOR}_trendline`, columns);
    addLayerColumn(trendLineLayer, HISTOGRAM_COLUMN_NAME, columns);
  }

  if (layer.breakdown_by) {
    const columnName = getAccessorName('breakdown');
    const breakdownColumn = fromBucketLensApiToLensState(
      layer.breakdown_by as LensApiBucketOperations,
      columns.map((col) => ({ column: col, id: getAccessorName('metric') }))
    );
    addLayerColumn(defaultLayer, columnName, breakdownColumn, true);

    if (trendLineLayer) {
      addLayerColumn(trendLineLayer, `${columnName}_trendline`, breakdownColumn, true);
    }
  }

  if (layer.secondary_metric) {
    const columnName = getAccessorName('secondary');
    const newColumn = fromMetricAPItoLensState(
      layer.secondary_metric as LensApiAllMetricOperations
    );

    addLayerColumn(defaultLayer, columnName, newColumn);
    if (trendLineLayer) {
      addLayerColumn(trendLineLayer, `${columnName}_trendline`, newColumn, false, 'X0');
    }
  }

  if (layer.metric?.background_chart?.type === 'bar') {
    const columnName = getAccessorName('max');
    const newColumn = fromMetricAPItoLensState(layer.metric.background_chart.goal_value);

    addLayerColumn(defaultLayer, columnName, newColumn);
    if (trendLineLayer) {
      addLayerColumn(trendLineLayer, `${columnName}_trendline`, newColumn, false, 'X0');
    }
  }

  return layers;
}

function getValueColumns(layer: MetricStateESQL) {
  return [
    ...(layer.breakdown_by
      ? [getValueColumn(getAccessorName('breakdown'), layer.breakdown_by.column)]
      : []),
    getValueColumn(getAccessorName('metric'), layer.metric.column, 'number'),
    ...(layer.metric?.background_chart?.type === 'bar'
      ? [
          getValueColumn(
            getAccessorName('max'),
            layer.metric.background_chart.goal_value.operation,
            'number'
          ),
        ]
      : []),
    ...(layer.secondary_metric
      ? [getValueColumn(getAccessorName('secondary'), layer.secondary_metric.column)]
      : []),
  ];
}

type MetricAttributes = Extract<
  TypedLensSerializedState['attributes'],
  { visualizationType: 'lnsMetric' }
>;

export type MetricAttributesWithoutFiltersAndQuery = Omit<MetricAttributes, 'state'> & {
  state: Omit<MetricAttributes['state'], 'filters' | 'query'>;
};

export function fromAPItoLensState(config: MetricState): MetricAttributesWithoutFiltersAndQuery {
  const _buildDataLayer = (cfg: unknown, i: number) =>
    buildFormBasedLayer(cfg as MetricStateNoESQL);

  const { layers, usedDataviews } = buildDatasourceStates(config, _buildDataLayer, getValueColumns);

  const visualization = buildVisualizationState(config);

  const { adHocDataViews, internalReferences } = getAdhocDataviews(usedDataviews);
  const regularDataViews = Object.values(usedDataviews).filter(
    (v): v is { id: string; type: 'dataView' } => v.type === 'dataView'
  );
  const references = regularDataViews.length
    ? buildReferences({ [DEFAULT_LAYER_ID]: regularDataViews[0]?.id })
    : [];

  return {
    visualizationType: 'lnsMetric',
    ...getSharedChartAPIToLensState(config),
    references,
    state: {
      datasourceStates: layers,
      internalReferences,
      visualization,
      adHocDataViews: config.dataset.type === 'index' ? adHocDataViews : {},
    },
  };
}

export function fromLensStateToAPI(config: LensAttributes): MetricState {
  const { state } = config;
  const visualization = state.visualization as MetricVisualizationState;
  const layers = getDatasourceLayers(state);
  const [layerId, layer] = getLensStateLayer(layers, visualization.layerId);

  const visualizationState = {
    ...getSharedChartLensStateToAPI(config),
    ...reverseBuildVisualizationState(
      visualization,
      layer,
      layerId ?? DEFAULT_LAYER_ID,
      config.state.adHocDataViews ?? {},
      config.references,
      config.state.internalReferences
    ),
  };

  return visualizationState;
}
