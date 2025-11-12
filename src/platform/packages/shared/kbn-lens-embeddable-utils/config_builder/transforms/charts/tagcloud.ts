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
} from '@kbn/lens-common';
import { LENS_TAGCLOUD_DEFAULT_STATE, TAGCLOUD_ORIENTATION } from '@kbn/lens-common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { SavedObjectReference } from '@kbn/core/types';
import type { LensApiState, TagcloudState } from '../../schema';
import type { LensAttributes } from '../../types';
import { DEFAULT_LAYER_ID } from '../../types';
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
import { isEsqlTableTypeDataset } from '../../utils';
import { getValueApiColumn, getValueColumn } from '../columns/esql_column';
import type { LensApiFieldOrFormulaMetricOperation } from '../../schema/metric_ops';
import type { LensApiBucketOperations } from '../../schema/bucket_ops';
import { fromColorMappingAPIToLensState, fromColorMappingLensStateToAPI } from '../coloring';
import type { TagcloudStateESQL, TagcloudStateNoESQL } from '../../schema/charts/tagcloud';
import { fromMetricAPItoLensState } from '../columns/metric';
import { fromBucketLensApiToLensState } from '../columns/buckets';
import { getSharedChartAPIToLensState, getSharedChartLensStateToAPI } from './utils';

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
    showLabel: layer.metric?.show_metric_label ?? LENS_TAGCLOUD_DEFAULT_STATE.showLabel,
    tagAccessor: getAccessorName('tag'),
    colorMapping: fromColorMappingAPIToLensState(layer.tag_by.color),
  };
}

function reverseBuildVisualizationState(
  visualization: LensTagCloudState,
  layer: FormBasedLayer | TextBasedLayer,
  layerId: string,
  adHocDataViews: Record<string, DataViewSpec>,
  references: SavedObjectReference[],
  adhocReferences?: SavedObjectReference[]
): TagcloudState {
  if (visualization.valueAccessor == null) {
    throw new Error('Metric accessor is missing in the visualization state');
  }

  if (visualization.tagAccessor == null || visualization.colorMapping == null) {
    throw new Error('Tag accessor or color mapping is missing in the visualization state');
  }

  const dataset = buildDatasetState(layer, adHocDataViews, references, adhocReferences, layerId);

  if (!dataset || dataset.type == null) {
    throw new Error('Unsupported dataset type');
  }

  const props: DeepPartial<DeepMutable<TagcloudState>> = {
    ...generateApiLayer(layer),
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
    metric: isEsqlTableTypeDataset(dataset)
      ? getValueApiColumn(visualization.valueAccessor, layer as TextBasedLayer)
      : (operationFromColumn(
          visualization.valueAccessor,
          layer as FormBasedLayer
        ) as LensApiFieldOrFormulaMetricOperation),
    tag_by: isEsqlTableTypeDataset(dataset)
      ? getValueApiColumn(visualization.tagAccessor, layer as TextBasedLayer)
      : (operationFromColumn(
          visualization.tagAccessor,
          layer as FormBasedLayer
        ) as LensApiBucketOperations),
  } as TagcloudState;

  if (props.metric) {
    props.metric.show_metric_label = visualization.showLabel;
  }

  if (props.tag_by) {
    const colorMapping = fromColorMappingLensStateToAPI(visualization.colorMapping);
    if (colorMapping) {
      props.tag_by.color = colorMapping;
    }
  }

  return {
    type: 'tagcloud',
    dataset: dataset satisfies TagcloudState['dataset'],
    ...props,
  } as TagcloudState;
}

function buildFormBasedLayer(layer: TagcloudStateNoESQL): FormBasedPersistedState['layers'] {
  const columns = fromMetricAPItoLensState(layer.metric as LensApiFieldOrFormulaMetricOperation);

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
    getValueColumn(getAccessorName('metric'), layer.metric.column, 'number'),
    getValueColumn(getAccessorName('tag'), layer.tag_by.column),
  ];
}

export function fromAPItoLensState(config: TagcloudState): LensAttributes {
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
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization,
      adHocDataViews: config.dataset.type === 'index' ? adHocDataViews : {},
    },
  };
}

export function fromLensStateToAPI(
  config: LensAttributes
): Extract<LensApiState, { type: 'tagcloud' }> {
  const { state } = config;
  const visualization = state.visualization as LensTagCloudState;
  const layers =
    state.datasourceStates.formBased?.layers ??
    state.datasourceStates.textBased?.layers ??
    // @ts-expect-error unfortunately due to a migration bug, some existing SO might still have the old indexpattern DS state
    (state.datasourceStates.indexpattern?.layers as PersistedIndexPatternLayer[]) ??
    [];

  // Layers can be in any order, so make sure to get the main one
  const [layerId, layer] = Object.entries(layers).find(
    ([, l]) => !('linkToLayers' in l) || l.linkToLayers == null
  )!;

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
