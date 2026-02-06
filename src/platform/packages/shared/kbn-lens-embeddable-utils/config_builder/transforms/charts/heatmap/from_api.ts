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
  HeatmapPalette,
  HeatmapVisualizationState,
  PersistedIndexPatternLayer,
  TypedLensSerializedState,
} from '@kbn/lens-common';
import { HEATMAP_GRID_NAME, LENS_HEATMAP_ID } from '@kbn/lens-common';
import type { LegendSize } from '@kbn/chart-expressions-common';
import type {
  HeatmapGridConfigResult,
  HeatmapLegendConfigResult,
} from '@kbn/lens-common/visualizations/heatmap/types';

import { DEFAULT_LAYER_ID } from '../../../constants';
import { getSharedChartAPIToLensState, stripUndefined } from '../utils';
import type { HeatmapState } from '../../../schema';
import { fromColorByValueAPIToLensState } from '../../coloring';
import {
  addLayerColumn,
  buildDatasourceStates,
  buildReferences,
  generateLayer,
  getAdhocDataviews,
} from '../../utils';
import type { HeatmapStateESQL, HeatmapStateNoESQL } from '../../../schema/charts/heatmap';
import { fromMetricAPItoLensState } from '../../columns/metric';
import { fromBucketLensApiToLensState } from '../../columns/buckets';
import type { LensApiBucketOperations } from '../../../schema/bucket_ops';
import { getValueColumn } from '../../columns/esql_column';

const ACCESSOR = 'heatmap_value_accessor';

function getAccessorName(type: 'x' | 'y' | 'value') {
  return `${ACCESSOR}_${type}`;
}

function getRotationFromOrientation(orientation?: 'angled' | 'vertical' | 'horizontal') {
  if (!orientation) return;
  return orientation === 'angled' ? -45 : orientation === 'vertical' ? -90 : 0;
}

function buildVisualizationState(config: HeatmapState): HeatmapVisualizationState {
  const layer = config;
  const valueAccessor = getAccessorName('value');
  const basePalette = layer.metric.color && fromColorByValueAPIToLensState(layer.metric.color);
  const xAxisLabelRotation = getRotationFromOrientation(layer.axes?.x?.labels?.orientation);

  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: 'data',
    shape: 'heatmap',
    valueAccessor,
    xAccessor: getAccessorName('x'),
    ...(layer.yAxis ? { yAccessor: getAccessorName('y') } : {}),
    gridConfig: {
      type: HEATMAP_GRID_NAME,
      isCellLabelVisible: layer.cells?.labels?.visible ?? false,
      isXAxisLabelVisible: layer.axes?.x?.labels?.visible ?? true,
      isXAxisTitleVisible: layer.axes?.x?.title?.visible ?? false,
      isYAxisLabelVisible: layer.axes?.y?.labels?.visible ?? true,
      isYAxisTitleVisible: layer.axes?.y?.title?.visible ?? false,
      ...stripUndefined<HeatmapGridConfigResult>({
        xTitle: layer.axes?.x?.title?.value,
        yTitle: layer.axes?.y?.title?.value,
        xAxisLabelRotation,
      }),
    },
    legend: {
      isVisible: layer.legend?.visible ?? true,
      position: layer.legend?.position ?? 'right',
      type: 'heatmap_legend',
      ...stripUndefined<HeatmapLegendConfigResult>({
        maxLines: layer.legend?.truncate_after_lines,
        legendSize: layer.legend?.size as LegendSize,
      }),
    },
    ...(basePalette && {
      palette: {
        ...basePalette,
        accessor: valueAccessor,
      } satisfies HeatmapPalette,
    }),
  };
}

function buildFormBasedLayer(layer: HeatmapStateNoESQL): FormBasedPersistedState['layers'] {
  const metricColumns = fromMetricAPItoLensState(layer.metric);

  const layers: Record<string, PersistedIndexPatternLayer> = generateLayer(DEFAULT_LAYER_ID, layer);

  const defaultLayer = layers[DEFAULT_LAYER_ID];

  addLayerColumn(defaultLayer, getAccessorName('value'), metricColumns);

  if (layer.xAxis) {
    const columnName = getAccessorName('x');
    const xAxisColumn = fromBucketLensApiToLensState(
      layer.xAxis as LensApiBucketOperations,
      metricColumns.map((col) => ({ column: col, id: getAccessorName('value') }))
    );
    addLayerColumn(defaultLayer, columnName, xAxisColumn, true);
  }

  if (layer.yAxis) {
    const columnName = getAccessorName('y');
    const yAxisColumn = fromBucketLensApiToLensState(
      layer.yAxis as LensApiBucketOperations,
      metricColumns.map((col) => ({ column: col, id: getAccessorName('value') }))
    );
    addLayerColumn(defaultLayer, columnName, yAxisColumn, true);
  }

  return layers;
}

function getValueColumns(layer: HeatmapStateESQL) {
  return [
    getValueColumn(getAccessorName('value'), layer.metric.column, 'number'),
    ...(layer.xAxis ? [getValueColumn(getAccessorName('x'), layer.xAxis.column)] : []),
    ...(layer.yAxis ? [getValueColumn(getAccessorName('y'), layer.yAxis.column)] : []),
  ];
}

type HeatmapAttributes = Extract<
  TypedLensSerializedState['attributes'],
  { visualizationType: 'lnsHeatmap' }
>;

type HeatmapAttributesWithoutFiltersAndQuery = Omit<HeatmapAttributes, 'state'> & {
  state: Omit<HeatmapAttributes['state'], 'filters' | 'query'>;
};

export function fromAPItoLensState(config: HeatmapState): HeatmapAttributesWithoutFiltersAndQuery {
  const _buildDataLayer = (cfg: unknown, i: number) =>
    buildFormBasedLayer(cfg as HeatmapStateNoESQL);

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
    visualizationType: LENS_HEATMAP_ID,
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
