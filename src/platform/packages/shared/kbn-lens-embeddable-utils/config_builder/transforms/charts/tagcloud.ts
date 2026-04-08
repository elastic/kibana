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
  LensTagCloudState,
  PersistedIndexPatternLayer,
  TextBasedLayer,
  TypedLensSerializedState,
} from '@kbn/lens-common';
import { LENS_TAGCLOUD_DEFAULT_STATE, TAGCLOUD_ORIENTATION } from '@kbn/lens-common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { SavedObjectReference } from '@kbn/core/types';
import type {
  LensApiState,
  TagcloudState,
  LensApiAllMetricOrFormulaOperations,
  LensApiBucketOperations,
  TagcloudStateESQL,
  TagcloudStateNoESQL,
} from '../../schema';
import type { LensAttributes } from '../../types';
import { DEFAULT_LAYER_ID } from '../../constants';
import {
  addLayerColumn,
  buildDataSourceState,
  buildDatasourceStates,
  buildReferences,
  generateApiLayer,
  generateLayer,
  getAdhocDataviews,
  isTextBasedLayer,
  operationFromColumn,
} from '../utils';
import { getValueApiColumn, getValueColumn } from '../columns/esql_column';
import { fromColorMappingAPIToLensState, fromColorMappingLensStateToAPI } from '../coloring';
import { fromMetricAPItoLensState } from '../columns/metric';
import { fromBucketLensApiToLensState } from '../columns/buckets';
import {
  getDatasourceLayers,
  getLensStateLayer,
  getSharedChartAPIToLensState,
  getSharedChartLensStateToAPI,
} from './utils';

const ACCESSOR = 'tagcloud_accessor';
function getAccessorName(type: 'metric' | 'tag') {
  return `${ACCESSOR}_${type}`;
}

function buildVisualizationState(config: TagcloudState): LensTagCloudState {
  const layer = config;

  return {
    layerId: DEFAULT_LAYER_ID,
    valueAccessor: getAccessorName('metric'),
    orientation: layer.orientation
      ? layer.orientation === 'horizontal'
        ? TAGCLOUD_ORIENTATION.SINGLE
        : layer.orientation === 'vertical'
        ? TAGCLOUD_ORIENTATION.RIGHT_ANGLED
        : TAGCLOUD_ORIENTATION.MULTIPLE
      : LENS_TAGCLOUD_DEFAULT_STATE.orientation,
    maxFontSize: layer.font_size?.max ?? LENS_TAGCLOUD_DEFAULT_STATE.maxFontSize,
    minFontSize: layer.font_size?.min ?? LENS_TAGCLOUD_DEFAULT_STATE.minFontSize,
    showLabel: layer.caption?.visible ?? LENS_TAGCLOUD_DEFAULT_STATE.showCaption,
    tagAccessor: getAccessorName('tag'),
    ...(layer.tag_by.color ? { ...fromColorMappingAPIToLensState(layer.tag_by.color) } : {}),
  };
}

function getTagcloudDataset(
  layer: Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer,
  adHocDataViews: Record<string, DataViewSpec>,
  references: SavedObjectReference[],
  adhocReferences: SavedObjectReference[] = [],
  layerId: string
): TagcloudState['data_source'] {
  const dataSource = buildDataSourceState(
    layer,
    layerId,
    adHocDataViews,
    references,
    adhocReferences
  );

  if (!dataSource || dataSource.type == null) {
    throw new Error('Unsupported DataSource type');
  }

  return dataSource;
}

function getTagcloudMetric(
  layer: Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer,
  visualization: LensTagCloudState
): TagcloudState['metric'] {
  if (visualization.valueAccessor == null) {
    throw new Error('Metric accessor is missing in the visualization state');
  }

  return {
    ...(isTextBasedLayer(layer)
      ? getValueApiColumn(visualization.valueAccessor, layer)
      : (operationFromColumn(
          visualization.valueAccessor,
          layer
        ) as LensApiAllMetricOrFormulaOperations)),
  };
}

function getTagcloudTagBy(
  layer: Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer,
  visualization: LensTagCloudState
): TagcloudState['tag_by'] {
  if (visualization.tagAccessor == null) {
    throw new Error('Tag accessor is missing in the visualization state');
  }

  const color = fromColorMappingLensStateToAPI(visualization.colorMapping, visualization.palette);

  return {
    ...(isTextBasedLayer(layer)
      ? getValueApiColumn(visualization.tagAccessor, layer)
      : (operationFromColumn(visualization.tagAccessor, layer) as LensApiBucketOperations)),
    ...(color && { color }),
  };
}

function reverseBuildVisualizationState(
  visualization: LensTagCloudState,
  layer: Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer,
  layerId: string,
  adHocDataViews: Record<string, DataViewSpec>,
  references: SavedObjectReference[],
  adhocReferences?: SavedObjectReference[]
): TagcloudState {
  const dataSource = getTagcloudDataset(
    layer,
    adHocDataViews,
    references,
    adhocReferences,
    layerId
  );
  const metric = getTagcloudMetric(layer, visualization);
  const tagBy = getTagcloudTagBy(layer, visualization);

  return {
    type: 'tag_cloud',
    data_source: dataSource,
    ...generateApiLayer(layer),
    metric,
    tag_by: tagBy,
    orientation:
      visualization.orientation === TAGCLOUD_ORIENTATION.SINGLE
        ? 'horizontal'
        : visualization.orientation === TAGCLOUD_ORIENTATION.MULTIPLE
        ? 'angled'
        : 'vertical',
    font_size: {
      min: visualization.minFontSize,
      max: visualization.maxFontSize,
    },
    caption: { visible: visualization.showLabel },
  } as TagcloudState;
}

function buildFormBasedLayer(layer: TagcloudStateNoESQL): FormBasedPersistedState['layers'] {
  const columns = fromMetricAPItoLensState(layer.metric);

  const layers: Record<string, PersistedIndexPatternLayer> = generateLayer(DEFAULT_LAYER_ID, layer);
  const defaultLayer = layers[DEFAULT_LAYER_ID];

  addLayerColumn(defaultLayer, getAccessorName('metric'), columns);
  const breakdownColumn = fromBucketLensApiToLensState(
    layer.tag_by as LensApiBucketOperations,
    columns.map((col) => ({ column: col, id: getAccessorName('metric') }))
  );
  addLayerColumn(defaultLayer, getAccessorName('tag'), breakdownColumn, true);

  return layers;
}

function getValueColumns(layer: TagcloudStateESQL) {
  return [
    getValueColumn(getAccessorName('metric'), layer.metric, 'number'),
    getValueColumn(getAccessorName('tag'), layer.tag_by),
  ];
}

type TagcloudAttributes = Extract<
  TypedLensSerializedState['attributes'],
  { visualizationType: 'lnsTagcloud' }
>;

type TagcloudAttributesWithoutFiltersAndQuery = Omit<TagcloudAttributes, 'state'> & {
  state: Omit<TagcloudAttributes['state'], 'filters' | 'query'>;
};

export function fromAPItoLensState(
  config: TagcloudState
): TagcloudAttributesWithoutFiltersAndQuery {
  const _buildDataLayer = (cfg: unknown, i: number) =>
    buildFormBasedLayer(cfg as TagcloudStateNoESQL);

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
    visualizationType: 'lnsTagcloud',
    ...getSharedChartAPIToLensState(config),
    references,
    state: {
      datasourceStates: layers,
      internalReferences,
      visualization,
      adHocDataViews,
    },
  };
}

export function fromLensStateToAPI(
  config: LensAttributes
): Extract<LensApiState, { type: 'tag_cloud' }> {
  const { state } = config;
  const visualization = state.visualization as LensTagCloudState;
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
