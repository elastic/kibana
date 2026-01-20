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
  GaugeVisualizationState,
  PersistedIndexPatternLayer,
  TextBasedLayer,
  TypedLensSerializedState,
} from '@kbn/lens-common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { SavedObjectReference } from '@kbn/core/types';
import type { GaugeState, LensApiState } from '../../schema';
import { fromColorByValueAPIToLensState, fromColorByValueLensStateToAPI } from '../coloring';
import type { LensAttributes } from '../../types';
import { DEFAULT_LAYER_ID } from '../../constants';
import type { DeepMutable, DeepPartial } from '../utils';
import {
  addLayerColumn,
  buildDatasetState,
  buildDatasourceStates,
  buildReferences,
  generateApiLayer,
  generateLayer,
  getAdhocDataviews,
  operationFromColumn,
} from '../utils';
import {
  getDatasourceLayers,
  getLensStateLayer,
  getMetricAccessor,
  getSharedChartAPIToLensState,
  getSharedChartLensStateToAPI,
} from './utils';
import type { GaugeStateESQL, GaugeStateNoESQL } from '../../schema/charts/gauge';
import { fromMetricAPItoLensState } from '../columns/metric';
import type { LensApiAllMetricOperations } from '../../schema/metric_ops';
import { getValueApiColumn, getValueColumn } from '../columns/esql_column';
import { isEsqlTableTypeDataset } from '../../utils';

const ACCESSOR = 'gauge_accessor';

function getAccessorName(type: 'metric' | 'max' | 'min' | 'goal') {
  return `${ACCESSOR}_${type}`;
}

function buildVisualizationState(config: GaugeState): GaugeVisualizationState {
  const layer = config;

  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: 'data',
    metricAccessor: getAccessorName('metric'),
    minAccessor: layer.metric.min ? getAccessorName('min') : undefined,
    maxAccessor: layer.metric.max ? getAccessorName('max') : undefined,
    goalAccessor: layer.metric.goal ? getAccessorName('goal') : undefined,
    shape: layer.shape
      ? layer.shape.type === 'bullet'
        ? layer.shape.direction === 'horizontal'
          ? 'horizontalBullet'
          : 'verticalBullet'
        : layer.shape.type
      : 'horizontalBullet',
    ...(layer.metric.color
      ? { colorMode: 'palette', palette: fromColorByValueAPIToLensState(layer.metric.color) }
      : {}),
    ticksPosition: layer.metric.ticks ?? 'auto',
    ...(layer.metric.hide_title
      ? { labelMajorMode: 'none' }
      : layer.metric.title
      ? { labelMajorMode: 'custom', labelMajor: layer.metric.title }
      : { labelMajorMode: 'auto' }),
    labelMinor: layer.metric.sub_title,
  };
}

function reverseBuildVisualizationState(
  visualization: GaugeVisualizationState,
  layer: Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer,
  layerId: string,
  adHocDataViews: Record<string, DataViewSpec>,
  references: SavedObjectReference[],
  adhocReferences?: SavedObjectReference[]
): GaugeState {
  const metricAccessor = getMetricAccessor(visualization);
  if (metricAccessor == null) {
    throw new Error('Metric accessor is missing in the visualization state');
  }

  const dataset = buildDatasetState(layer, layerId, adHocDataViews, references, adhocReferences);

  if (!dataset || dataset.type == null) {
    throw new Error('Unsupported dataset type');
  }

  const props: DeepPartial<DeepMutable<GaugeState>> = {
    ...generateApiLayer(layer),
    shape:
      visualization.shape === 'horizontalBullet'
        ? { type: 'bullet', direction: 'horizontal' }
        : visualization.shape === 'verticalBullet'
        ? { type: 'bullet', direction: 'vertical' }
        : { type: visualization.shape },
    metric: isEsqlTableTypeDataset(dataset)
      ? {
          ...getValueApiColumn(metricAccessor, layer as TextBasedLayer),
          ...(visualization.minAccessor
            ? { min: getValueApiColumn(visualization.minAccessor, layer as TextBasedLayer) }
            : {}),
          ...(visualization.maxAccessor
            ? { max: getValueApiColumn(visualization.maxAccessor, layer as TextBasedLayer) }
            : {}),
          ...(visualization.goalAccessor
            ? { goal: getValueApiColumn(visualization.goalAccessor, layer as TextBasedLayer) }
            : {}),
        }
      : {
          ...operationFromColumn(metricAccessor, layer as FormBasedLayer),
          ...(visualization.minAccessor
            ? {
                min: operationFromColumn(
                  visualization.minAccessor,
                  layer as FormBasedLayer
                ) as LensApiAllMetricOperations,
              }
            : {}),
          ...(visualization.maxAccessor
            ? {
                max: operationFromColumn(
                  visualization.maxAccessor,
                  layer as FormBasedLayer
                ) as LensApiAllMetricOperations,
              }
            : {}),
          ...(visualization.goalAccessor
            ? {
                goal: operationFromColumn(
                  visualization.goalAccessor,
                  layer as FormBasedLayer
                ) as LensApiAllMetricOperations,
              }
            : {}),
        },
  } as GaugeState;

  if (props.metric) {
    props.metric.hide_title = visualization.labelMajorMode === 'none';

    if (visualization.labelMajor) {
      props.metric.title = visualization.labelMajor;
    }

    if (visualization.labelMinor) {
      props.metric.sub_title = visualization.labelMinor;
    }

    if (visualization.ticksPosition) {
      props.metric.ticks = visualization.ticksPosition;
    }

    if (visualization.colorMode === 'palette' && visualization.palette) {
      props.metric.color = fromColorByValueLensStateToAPI(visualization.palette);
    }
  }

  return {
    type: 'gauge',
    dataset: dataset satisfies GaugeState['dataset'],
    ...props,
  } as GaugeState;
}

function buildFormBasedLayer(layer: GaugeStateNoESQL): FormBasedPersistedState['layers'] {
  const columns = fromMetricAPItoLensState(layer.metric);

  const layers: Record<string, PersistedIndexPatternLayer> = generateLayer(DEFAULT_LAYER_ID, layer);

  const defaultLayer = layers[DEFAULT_LAYER_ID];

  addLayerColumn(defaultLayer, getAccessorName('metric'), columns);

  if (layer.metric.min) {
    const columnName = getAccessorName('min');
    const newColumn = fromMetricAPItoLensState(layer.metric.min as LensApiAllMetricOperations);

    addLayerColumn(defaultLayer, columnName, newColumn);
  }

  if (layer.metric.max) {
    const columnName = getAccessorName('max');
    const newColumn = fromMetricAPItoLensState(layer.metric.max as LensApiAllMetricOperations);

    addLayerColumn(defaultLayer, columnName, newColumn);
  }

  if (layer.metric.goal) {
    const columnName = getAccessorName('goal');
    const newColumn = fromMetricAPItoLensState(layer.metric.goal as LensApiAllMetricOperations);

    addLayerColumn(defaultLayer, columnName, newColumn);
  }

  return layers;
}

function getValueColumns(layer: GaugeStateESQL) {
  return [
    getValueColumn(getAccessorName('metric'), layer.metric.column, 'number'),
    ...(layer.metric.max ? [getValueColumn(getAccessorName('max'), layer.metric.max.column)] : []),
    ...(layer.metric.min ? [getValueColumn(getAccessorName('min'), layer.metric.min.column)] : []),
    ...(layer.metric.goal
      ? [getValueColumn(getAccessorName('goal'), layer.metric.goal.column)]
      : []),
  ];
}

type GaugeAttributes = Extract<
  TypedLensSerializedState['attributes'],
  { visualizationType: 'lnsGauge' }
>;

type GaugeAttributesWithoutFiltersAndQuery = Omit<GaugeAttributes, 'state'> & {
  state: Omit<GaugeAttributes['state'], 'filters' | 'query'>;
};

export function fromAPItoLensState(config: GaugeState): GaugeAttributesWithoutFiltersAndQuery {
  const _buildDataLayer = (cfg: unknown, i: number) => buildFormBasedLayer(cfg as GaugeStateNoESQL);

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
    visualizationType: 'lnsGauge',
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

export function fromLensStateToAPI(
  config: LensAttributes
): Extract<LensApiState, { type: 'gauge' }> {
  const { state } = config;
  const visualization = state.visualization as GaugeVisualizationState;
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
