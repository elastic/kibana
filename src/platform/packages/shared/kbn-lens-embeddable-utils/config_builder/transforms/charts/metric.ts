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
} from '@kbn/lens-plugin/public';
import type { TextBasedLayer } from '@kbn/lens-plugin/public/datasources/form_based/esql_layer/types';
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
import type { LensApiState, MetricState } from '../../schema';
import { fromMetricAPItoLensState } from '../columns/metric';
import type { LensApiAllMetricOperations } from '../../schema/metric_ops';
import type { LensApiBucketOperations } from '../../schema/bucket_ops';
import type { DeepMutable, DeepPartial } from '../utils';
import { generateLayer } from '../utils';
import type { MetricStateESQL, MetricStateNoESQL } from '../../schema/charts/metric';

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
    // todo: handle all color configs
    ...(layer.metric.color?.type === 'static' ? { color: layer.metric.color.color } : {}),
    ...(layer.metric.color?.type === 'gradient'
      ? { palette: { type: 'palette', name: layer.metric.color.palette! } }
      : {}),
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
          secondaryAlign: layer.metric.alignments.value,
          // secondaryLabelPosition: layer.metric.alignments.labels,
          // secondaryLabel: '',
        }
      : {}),

    ...(layer.breakdown_by
      ? {
          breakdownByAccessor: getAccessorName('breakdown'),
          maxCols: layer.breakdown_by.columns,
        }
      : {}),

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

function reverseBuildVisualizationState(
  visualization: MetricVisualizationState,
  layer: FormBasedLayer | TextBasedLayer,
  adHocDataViews: Record<string, DataViewSpec>,
  references: SavedObjectReference[]
): MetricState {
  if (visualization.metricAccessor === undefined) {
    throw new Error('Metric accessor is missing in the visualization state');
  }

  const dataset = buildDatasetState(layer, adHocDataViews, references, 'layer_0');

  let props: DeepPartial<DeepMutable<MetricState>> = generateApiLayer(layer);

  if (dataset.type === 'esql' || dataset.type === 'table') {
    const esqlLayer = layer as TextBasedLayer;
    props = {
      ...props,
      metric: getValueApiColumn(visualization.metricAccessor, esqlLayer),
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
    const metric = operationFromColumn(
      visualization.metricAccessor,
      formLayer
    ) as LensApiAllMetricOperations;
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
      ? (operationFromColumn(
          visualization.breakdownByAccessor,
          formLayer
        ) as LensApiBucketOperations)
      : undefined;

    props = {
      ...props,
      metric: {
        ...metric,
        background_chart: {
          ...(max_value
            ? { type: 'bar', goal_value: max_value, direction: visualization.progressDirection }
            : {}),
        },
      },
      ...(secondary_metric ? { secondary_metric: { ...secondary_metric } } : {}),
      ...(breakdown_by ? { breakdown_by } : {}),
    } as MetricState;
  } else {
    throw new Error('Unsupported dataset type');
  }

  if (visualization.subtitle) {
    props.metric!.sub_label = visualization.subtitle;
  }

  if (visualization.secondaryTrend) {
    props.metric!.background_chart!.type = 'trend';
  }

  if (props.secondary_metric) {
    // props.secondary_metric.compare_to

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

  if (visualization.color) {
    props.metric!.color = {
      type: 'static',
      color: visualization.color,
    };
  }

  if (visualization.palette) {
    props.metric!.color = {
      type: 'gradient',
      palette: visualization.palette.name,
    };
  }

  // todo: what to do with this ?
  // if (visualization.applyColorTo) {}

  if (visualization.icon) {
    props.metric!.icon = {
      name: visualization.icon,
      align: visualization.iconAlign,
    };
  }

  if (visualization.valuesTextAlign || visualization.titlesTextAlign) {
    props.metric!.alignments = {
      ...(visualization.valuesTextAlign ? { value: visualization.valuesTextAlign } : {}),
      ...(visualization.titlesTextAlign ? { labels: visualization.titlesTextAlign } : {}),
    };
  }

  if (visualization.valueFontMode === 'fit') {
    props.metric!.fit = true;
  }

  return {
    type: 'metric',
    dataset,
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

  addLayerColumn(defaultLayer, ACCESSOR, columns);
  if (trendLineLayer) {
    addLayerColumn(trendLineLayer, `${ACCESSOR}_trendline`, columns);
  }

  if (layer.breakdown_by) {
    const columnName = getAccessorName('breakdown');
    const breakdownColumn = fromBucketLensApiToLensState(
      layer.breakdown_by as LensApiBucketOperations,
      []
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
    const newColumn = fromMetricAPItoLensState({ operation: 'max', field: 'max' });

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
    getValueColumn(ACCESSOR, layer.metric.column, 'number'),
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

export function fromAPItoLensState(config: MetricState): LensAttributes {
  const dataviews: Record<string, { id: string; index: string; timeFieldName: string }> = {};

  const _buildDataLayer = (cfg: unknown, i: number) =>
    buildFormBasedLayer(cfg as MetricStateNoESQL);

  const datasourceStates = buildDatasourceStates(
    config,
    dataviews,
    _buildDataLayer,
    getValueColumns
  );

  const visualization = buildVisualizationState(config);

  const adHocDataViews = getAdhocDataviews(dataviews);
  const references = buildReferences(
    Object.fromEntries(Object.entries(adHocDataViews).map(([key, value]) => ['layer_0', value.id]))
  );

  return {
    title: config.title ?? '',
    description: config.description ?? '',
    visualizationType: 'lnsMetric',
    references,
    state: {
      datasourceStates,
      internalReferences: [],
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization,
      adHocDataViews: config.dataset.type === 'index' ? adHocDataViews : {},
    },
  };
}

export function fromLensStateToAPI(
  config: LensAttributes
): Extract<LensApiState, { type: 'metric' }> {
  const { state } = config;
  const visualization = state.visualization as MetricVisualizationState;
  const layers =
    state.datasourceStates.formBased?.layers ?? state.datasourceStates.textBased?.layers ?? [];

  const layer = Object.values(layers)[0];

  const visualizationState = {
    title: config.title,
    description: config.description ?? '',
    ...reverseBuildVisualizationState(
      visualization,
      layer,
      config.state.adHocDataViews ?? {},
      config.references
    ),
  };

  return visualizationState;
}
