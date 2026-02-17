/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  LENS_METRIC_BREAKDOWN_DEFAULT_MAX_COLUMNS,
  LENS_METRIC_STATE_DEFAULTS,
  type FormBasedPersistedState,
  type MetricVisualizationState,
  type PersistedIndexPatternLayer,
  type TextBasedLayer,
  type TypedLensSerializedState,
} from '@kbn/lens-common';
import type { SavedObjectReference } from '@kbn/core/types';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { DeepWriteable, LensAttributes } from '../../types';
import { DEFAULT_LAYER_ID } from '../../constants';
import {
  addLayerColumn,
  buildDatasetState,
  buildDatasourceStates,
  buildReferences,
  generateApiLayer,
  getAdhocDataviews,
  isTextBasedLayer,
  nonNullable,
  operationFromColumn,
} from '../utils';
import { fromBucketLensApiToLensState } from '../columns/buckets';
import { getValueApiColumn, getValueColumn } from '../columns/esql_column';
import type { MetricState } from '../../schema';
import { fromMetricAPItoLensState } from '../columns/metric';
import type { LensApiBucketOperations } from '../../schema/bucket_ops';
import { generateLayer } from '../utils';
import type {
  MetricStateESQL,
  MetricStateNoESQL,
  PrimaryMetricType,
  SecondaryMetricType,
} from '../../schema/charts/metric';
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
import { isAPIColumnOfBucketType, isAPIColumnOfMetricType } from '../columns/utils';

type MetricApiCompareType = Extract<Required<SecondaryMetricType>, { compare: any }>['compare'];

type WritableMetricStateWithoutDataset = DeepWriteable<Omit<MetricState, 'dataset'>>;

const ACCESSOR = 'metric_accessor';
const HISTOGRAM_COLUMN_NAME = 'x_date_histogram';
const TRENDLINE_LAYER_ID = 'layer_0_trendline';
export const LENS_METRIC_COMPARE_TO_PALETTE_DEFAULT = 'compare_to';
const LENS_METRIC_COMPARE_TO_REVERSED = false;

function getAccessorName(type: 'metric' | 'max' | 'breakdown' | 'secondary') {
  return `${ACCESSOR}_${type}`;
}

function getCompareVisualsState(compare: MetricApiCompareType) {
  if (compare.icon && compare.value) {
    return 'both';
  }
  if (compare.icon === true || (compare.icon == null && compare.value === false)) {
    return 'icon';
  }
  if (compare.value === true || (compare.value == null && compare.icon === false)) {
    return 'value';
  }
  return 'both';
}

function fromCompareAPIToLensState(compareToConfig: MetricApiCompareType): {
  secondaryTrend: Extract<MetricVisualizationState['secondaryTrend'], { type: 'dynamic' }>;
} {
  return {
    secondaryTrend: {
      type: 'dynamic',
      baselineValue:
        compareToConfig.to === 'primary' ? compareToConfig.to : compareToConfig.baseline,
      visuals: getCompareVisualsState(compareToConfig),
      reversed: compareToConfig.palette?.includes('reversed') ?? LENS_METRIC_COMPARE_TO_REVERSED,
      paletteId: compareToConfig.palette ?? LENS_METRIC_COMPARE_TO_PALETTE_DEFAULT,
    },
  };
}

function isSecondaryMetric(metric: MetricState['metrics'][number]): metric is SecondaryMetricType {
  return metric.type === 'secondary';
}

function isPrimaryMetric(metric: MetricState['metrics'][number]): metric is PrimaryMetricType {
  return metric.type === 'primary';
}

function buildVisualizationState(config: MetricState): MetricVisualizationState {
  const layer = config;

  const [primaryMetric, secondaryMetric] = layer.metrics;

  if (isSecondaryMetric(primaryMetric)) {
    throw new Error('The first metric must be the primary metric.');
  }

  if (secondaryMetric && isPrimaryMetric(secondaryMetric)) {
    throw new Error('The second metric must be the secondary metric.');
  }

  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: 'data',
    metricAccessor: getAccessorName('metric'),
    ...(primaryMetric.color?.type === 'static'
      ? fromStaticColorAPIToLensState(primaryMetric.color)
      : {}),
    ...(primaryMetric.color?.type === 'dynamic'
      ? { palette: fromColorByValueAPIToLensState(primaryMetric.color) }
      : {}),
    ...(primaryMetric.apply_color_to ? { applyColorTo: primaryMetric.apply_color_to } : {}),
    subtitle: primaryMetric.sub_label ?? '',
    showBar: false,
    valueFontMode: primaryMetric.fit ? 'fit' : 'default',
    ...(primaryMetric.alignments
      ? {
          primaryAlign: primaryMetric.alignments.value,
          titlesTextAlign: primaryMetric.alignments.labels,
        }
      : {}),
    ...(primaryMetric.icon
      ? {
          icon: primaryMetric.icon.name,
          iconAlign: primaryMetric.icon.align,
        }
      : {}),
    ...(secondaryMetric
      ? {
          secondaryMetricAccessor: getAccessorName('secondary'),
          ...('prefix' in secondaryMetric && secondaryMetric.prefix
            ? { secondaryLabel: secondaryMetric.prefix }
            : {}),
          ...('label_position' in secondaryMetric && secondaryMetric.label_position
            ? { secondaryLabelPosition: secondaryMetric.label_position }
            : {}),
          secondaryAlign:
            'alignments' in primaryMetric ? primaryMetric.alignments?.value : undefined,
          ...('compare' in secondaryMetric && secondaryMetric.compare
            ? fromCompareAPIToLensState(secondaryMetric.compare)
            : {}),
          ...(secondaryMetric.color?.type === 'static'
            ? { secondaryTrend: { type: 'static', color: secondaryMetric.color.color } }
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
    ...(primaryMetric?.background_chart?.type === 'bar'
      ? {
          maxAccessor: getAccessorName('max'),
          showBar: true,
          ...(primaryMetric.background_chart.direction != null
            ? { progressDirection: primaryMetric.background_chart.direction }
            : {}),
        }
      : {}),

    ...(primaryMetric.background_chart?.type === 'trend'
      ? {
          trendlineLayerId: `${DEFAULT_LAYER_ID}_trendline`,
          trendlineLayerType: 'metricTrendline',
          trendlineMetricAccessor: `${ACCESSOR}_trendline`,
          trendlineTimeAccessor: HISTOGRAM_COLUMN_NAME,
          ...(secondaryMetric
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

function buildFromTextBasedLayer(
  layer: TextBasedLayer,
  metricAccessor: string,
  visualization: MetricVisualizationState
): WritableMetricStateWithoutDataset {
  return enrichConfigurationWithVisualizationProperties(
    {
      type: 'metric',
      ...generateApiLayer(layer),
      metrics: [
        {
          type: 'primary',
          ...getValueApiColumn(metricAccessor, layer),
          ...(visualization.maxAccessor
            ? {
                background_chart: {
                  type: 'bar',
                  max_value: getValueApiColumn(visualization.maxAccessor, layer),
                  ...(visualization.progressDirection
                    ? { direction: visualization.progressDirection }
                    : {}),
                },
              }
            : {}),
        },
        visualization.secondaryMetricAccessor
          ? {
              type: 'secondary',
              ...getValueApiColumn(visualization.secondaryMetricAccessor, layer),
            }
          : undefined,
      ].filter(nonNullable) as MetricState['metrics'],
      ...(visualization.breakdownByAccessor
        ? {
            breakdown_by: {
              ...getValueApiColumn(visualization.breakdownByAccessor, layer),
              columns: visualization.maxCols ?? LENS_METRIC_BREAKDOWN_DEFAULT_MAX_COLUMNS,
            },
          }
        : {}),
    },
    visualization
  );
}

function buildFromFormBasedLayer(
  layer: PersistedIndexPatternLayer,
  metricAccessor: string,
  visualization: MetricVisualizationState
): WritableMetricStateWithoutDataset {
  const metric = operationFromColumn(metricAccessor, layer);
  if (!metric || !isAPIColumnOfMetricType(metric)) {
    throw Error('The primary metric must refer to a metric operation.');
  }

  const maxValue = visualization.maxAccessor
    ? operationFromColumn(visualization.maxAccessor, layer)
    : undefined;

  if (maxValue && isAPIColumnOfBucketType(maxValue)) {
    throw Error('The max value must refer to a metric operation.');
  }

  const primaryMetric = {
    type: 'primary',
    ...metric,
    ...(maxValue
      ? {
          background_chart: {
            type: 'bar',
            max_value: maxValue,
            ...(visualization.progressDirection
              ? { direction: visualization.progressDirection }
              : {}),
          },
        }
      : {}),
  } as PrimaryMetricType;

  const metrics = [primaryMetric] as [PrimaryMetricType, SecondaryMetricType?];

  const secondaryMetricOperation = visualization.secondaryMetricAccessor
    ? operationFromColumn(visualization.secondaryMetricAccessor, layer)
    : undefined;

  if (secondaryMetricOperation) {
    if (!isAPIColumnOfMetricType(secondaryMetricOperation)) {
      throw Error('The secondary metric must refer to a metric operation.');
    }
    const secondaryMetric = {
      type: 'secondary',
      ...secondaryMetricOperation,
    } as SecondaryMetricType;
    metrics.push(secondaryMetric);
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const breakdown_by = visualization.breakdownByAccessor
    ? operationFromColumn(visualization.breakdownByAccessor, layer)
    : undefined;
  if (breakdown_by && !isAPIColumnOfBucketType(breakdown_by)) {
    throw Error('The breakdown by must refer to a bucket operation.');
  }

  return enrichConfigurationWithVisualizationProperties(
    {
      type: 'metric',
      ...generateApiLayer(layer),
      metrics: metrics as MetricState['metrics'],
      ...(breakdown_by
        ? {
            breakdown_by: {
              ...breakdown_by,
              columns: visualization.maxCols ?? LENS_METRIC_BREAKDOWN_DEFAULT_MAX_COLUMNS,
            },
          }
        : {}),
    },
    visualization
  );
}

function enrichConfigurationWithVisualizationProperties(
  state: WritableMetricStateWithoutDataset,
  visualization: MetricVisualizationState
): WritableMetricStateWithoutDataset {
  const [primaryMetric, secondaryMetric] = state.metrics;

  if (isSecondaryMetric(primaryMetric)) {
    throw new Error('The first metric must be the primary metric.');
  }
  if (secondaryMetric != null && isPrimaryMetric(secondaryMetric)) {
    throw new Error('The second metric must be the secondary metric.');
  }
  if (primaryMetric) {
    if (visualization.subtitle) {
      primaryMetric.sub_label = visualization.subtitle;
    }

    if (visualization.trendlineLayerType) {
      primaryMetric.background_chart = { ...primaryMetric.background_chart, type: 'trend' };
    }

    if (visualization.color) {
      primaryMetric.color = fromStaticColorLensStateToAPI(visualization.color);
    }

    if (visualization.palette) {
      const colorByValue = fromColorByValueLensStateToAPI(visualization.palette);
      if (colorByValue?.range === 'absolute') {
        primaryMetric.color = colorByValue;
      }
    }

    if (visualization.applyColorTo) {
      primaryMetric.apply_color_to = visualization.applyColorTo;
    }

    if (visualization.icon) {
      primaryMetric.icon = {
        name: visualization.icon,
        align: visualization.iconAlign ?? LENS_METRIC_STATE_DEFAULTS.iconAlign,
      };
    }

    if (
      visualization.primaryAlign ||
      visualization.valuesTextAlign ||
      visualization.titlesTextAlign
    ) {
      primaryMetric.alignments = {
        value:
          visualization.primaryAlign ??
          visualization.valuesTextAlign ??
          LENS_METRIC_STATE_DEFAULTS.primaryAlign,
        labels: visualization.titlesTextAlign ?? LENS_METRIC_STATE_DEFAULTS.titlesTextAlign,
      };
    }

    primaryMetric.fit = visualization.valueFontMode === 'fit';
  }

  if (secondaryMetric) {
    if (visualization.secondaryTrend?.type === 'dynamic') {
      secondaryMetric.compare = fromCompareLensStateToAPI(visualization.secondaryTrend);
    }

    if (visualization.secondaryLabel || visualization.secondaryPrefix) {
      secondaryMetric.prefix = visualization.secondaryLabel ?? visualization.secondaryPrefix;
    }

    if (visualization.secondaryLabelPosition) {
      secondaryMetric.label_position = visualization.secondaryLabelPosition;
    }

    if (visualization.secondaryTrend?.type === 'static' && visualization.secondaryTrend?.color) {
      secondaryMetric.color = {
        type: 'static',
        color: visualization.secondaryTrend.color,
      };
    }
  }

  if (state.breakdown_by) {
    if (visualization.maxCols) {
      state.breakdown_by.columns = visualization.maxCols;
    }
    if (visualization.collapseFn) {
      state.breakdown_by.collapse_by = visualization.collapseFn;
    }
  }
  return state;
}

function reverseBuildVisualizationState(
  visualization: MetricVisualizationState,
  layer: PersistedIndexPatternLayer | TextBasedLayer,
  layerId: string,
  adHocDataViews: Record<string, DataViewSpec>,
  references: SavedObjectReference[],
  adhocReferences?: SavedObjectReference[]
): MetricState {
  const metricAccessor = getMetricAccessor(visualization);
  if (metricAccessor == null) {
    throw new Error('Metric accessor is missing in the visualization state');
  }

  const dataset = buildDatasetState(layer, layerId, adHocDataViews, references, adhocReferences);

  if (!dataset || dataset.type == null) {
    throw new Error('Unsupported dataset type');
  }

  return {
    dataset: dataset satisfies MetricState['dataset'],
    ...(isTextBasedLayer(layer)
      ? buildFromTextBasedLayer(layer, metricAccessor, visualization)
      : buildFromFormBasedLayer(layer, metricAccessor, visualization)),
  } as MetricState;
}

function buildFormBasedLayer(layer: MetricStateNoESQL): FormBasedPersistedState['layers'] {
  const [primaryMetric, secondaryMetric] = layer.metrics ?? [];
  if (!isAPIColumnOfMetricType(primaryMetric) || isSecondaryMetric(primaryMetric)) {
    throw Error('The primary metric must refer to a metric operation.');
  }
  const newPrimaryColumns = fromMetricAPItoLensState(primaryMetric);
  const newSecondaryColumns = secondaryMetric
    ? fromMetricAPItoLensState(secondaryMetric)
    : undefined;

  const layers: Record<string, PersistedIndexPatternLayer> = {
    ...generateLayer(DEFAULT_LAYER_ID, layer),
    ...(primaryMetric.background_chart?.type === 'trend'
      ? generateLayer(TRENDLINE_LAYER_ID, layer)
      : {}),
  };

  const defaultLayer = layers[DEFAULT_LAYER_ID];
  const trendLineLayer = layers[TRENDLINE_LAYER_ID];

  if (trendLineLayer) {
    trendLineLayer.linkToLayers = [DEFAULT_LAYER_ID];
  }

  addLayerColumn(defaultLayer, getAccessorName('metric'), newPrimaryColumns);
  if (trendLineLayer) {
    addLayerColumn(trendLineLayer, `${ACCESSOR}_trendline`, newPrimaryColumns);
    addLayerColumn(trendLineLayer, HISTOGRAM_COLUMN_NAME, newPrimaryColumns);
  }

  if (layer.breakdown_by) {
    const columnName = getAccessorName('breakdown');
    const breakdownColumn = fromBucketLensApiToLensState(
      layer.breakdown_by as LensApiBucketOperations,
      [
        ...newPrimaryColumns.map((col) => ({ column: col, id: getAccessorName('metric') })),
        ...(newSecondaryColumns ?? []).map((col) => ({
          column: col,
          id: getAccessorName('secondary'),
        })),
      ]
    );
    addLayerColumn(defaultLayer, columnName, breakdownColumn, true);

    if (trendLineLayer) {
      addLayerColumn(trendLineLayer, `${columnName}_trendline`, breakdownColumn, true);
    }
  }

  if (newSecondaryColumns?.length) {
    const columnName = getAccessorName('secondary');
    addLayerColumn(defaultLayer, columnName, newSecondaryColumns);
    if (trendLineLayer) {
      addLayerColumn(trendLineLayer, `${columnName}_trendline`, newSecondaryColumns, false, 'X0');
    }
  }

  if (primaryMetric.background_chart?.type === 'bar') {
    const columnName = getAccessorName('max');
    const newColumn = fromMetricAPItoLensState(primaryMetric.background_chart.max_value);

    addLayerColumn(defaultLayer, columnName, newColumn);
    if (trendLineLayer) {
      addLayerColumn(trendLineLayer, `${columnName}_trendline`, newColumn, false, 'X0');
    }
  }

  return layers;
}

function getValueColumns(layer: MetricStateESQL) {
  const [primaryMetric, secondaryMetric] = layer.metrics ?? [];
  if (isSecondaryMetric(primaryMetric)) {
    throw Error('The primary metric must refer to a metric operation.');
  }
  if (secondaryMetric && isPrimaryMetric(secondaryMetric)) {
    throw Error('The secondary metric must refer to a metric operation.');
  }
  return [
    ...(layer.breakdown_by
      ? [getValueColumn(getAccessorName('breakdown'), layer.breakdown_by.column)]
      : []),
    getValueColumn(getAccessorName('metric'), primaryMetric.column, 'number'),
    ...(primaryMetric.background_chart?.type === 'bar'
      ? [
          getValueColumn(
            getAccessorName('max'),
            primaryMetric.background_chart.max_value.column,
            'number'
          ),
        ]
      : []),
    ...(secondaryMetric
      ? [getValueColumn(getAccessorName('secondary'), secondaryMetric.column)]
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
