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
import type {
  HeatmapGridConfigResult,
  HeatmapLegendConfigResult,
} from '@kbn/lens-common/visualizations/heatmap/types';

import { DEFAULT_LAYER_ID } from '../../../constants';
import { legendSizeCompat } from '../legend_sizes';
import { getSharedChartAPIToLensState, stripUndefined } from '../utils';
import type { HeatmapConfig } from '../../../schema';
import { fromColorByValueAPIToLensState, isAutoColor } from '../../coloring';
import {
  addLayerColumn,
  buildDatasourceStates,
  buildReferences,
  generateLayer,
  getAdhocDataviews,
} from '../../utils';
import type { HeatmapConfigESQL, HeatmapConfigNoESQL } from '../../../schema/charts/heatmap';
import { fromMetricAPItoLensState } from '../../columns/metric';
import { fromBucketLensApiToLensState } from '../../columns/buckets';
import type { LensApiBucketOperations } from '../../../schema/bucket_ops';
import { getValueColumn } from '../../columns/esql_column';
import { axisLabelOrientationCompat } from '../common';
import { getColumnTypeFromScaleType } from '../utils';

const ACCESSOR = 'heatmap_value_accessor';

function getAccessorName(type: 'x' | 'y' | 'value') {
  return `${ACCESSOR}_${type}`;
}

function buildVisualizationState(config: HeatmapConfig): HeatmapVisualizationState {
  const layer = config;
  const valueAccessor = getAccessorName('value');
  const basePalette =
    layer.metric.color && !isAutoColor(layer.metric.color)
      ? fromColorByValueAPIToLensState(layer.metric.color)
      : undefined;
  const xAxisLabelRotation = axisLabelOrientationCompat.toState(layer.axis?.x?.labels?.orientation);

  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: 'data',
    shape: 'heatmap',
    valueAccessor,
    xAccessor: getAccessorName('x'),
    ...(layer.y ? { yAccessor: getAccessorName('y') } : {}),
    gridConfig: {
      type: HEATMAP_GRID_NAME,
      isCellLabelVisible: layer.styling?.cells?.labels?.visible ?? false,
      isXAxisLabelVisible: layer.axis?.x?.labels?.visible ?? true,
      isXAxisTitleVisible: layer.axis?.x?.title?.visible ?? false,
      isYAxisLabelVisible: layer.axis?.y?.labels?.visible ?? true,
      isYAxisTitleVisible: layer.axis?.y?.title?.visible ?? false,
      ...stripUndefined<HeatmapGridConfigResult>({
        xTitle: layer.axis?.x?.title?.text,
        yTitle: layer.axis?.y?.title?.text,
        xAxisLabelRotation,
        xSortPredicate: layer.axis?.x?.sort,
        ySortPredicate: layer.axis?.y?.sort,
      }),
    },
    legend: {
      isVisible: layer.legend?.visibility !== 'hidden',
      type: 'heatmap_legend',
      position: 'right',
      ...stripUndefined<HeatmapLegendConfigResult>({
        maxLines: layer.legend?.truncate_after_lines,
        legendSize: legendSizeCompat.toState(layer.legend?.size),
        shouldTruncate: Boolean(layer.legend?.truncate_after_lines),
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

function buildFormBasedLayer(layer: HeatmapConfigNoESQL): FormBasedPersistedState['layers'] {
  const metricColumns = fromMetricAPItoLensState(layer.metric);

  const layers: Record<string, PersistedIndexPatternLayer> = generateLayer(DEFAULT_LAYER_ID, layer);

  const defaultLayer = layers[DEFAULT_LAYER_ID];

  addLayerColumn(defaultLayer, getAccessorName('value'), metricColumns);

  if (layer.x) {
    const columnName = getAccessorName('x');
    const xColumn = fromBucketLensApiToLensState(
      layer.x as LensApiBucketOperations,
      metricColumns.map((col) => ({ column: col, id: getAccessorName('value') }))
    );
    addLayerColumn(defaultLayer, columnName, xColumn, true);
  }

  if (layer.y) {
    const columnName = getAccessorName('y');
    const yColumn = fromBucketLensApiToLensState(
      layer.y as LensApiBucketOperations,
      metricColumns.map((col) => ({ column: col, id: getAccessorName('value') }))
    );
    addLayerColumn(defaultLayer, columnName, yColumn, true);
  }

  return layers;
}

function getValueColumns(layer: HeatmapConfigESQL) {
  const xFieldType = layer.axis?.x?.scale
    ? getColumnTypeFromScaleType(layer.axis.x.scale)
    : undefined;
  return [
    getValueColumn(getAccessorName('value'), layer.metric, 'number'),
    ...(layer.x ? [getValueColumn(getAccessorName('x'), layer.x, xFieldType)] : []),
    ...(layer.y ? [getValueColumn(getAccessorName('y'), layer.y)] : []),
  ];
}

type HeatmapAttributes = Extract<
  TypedLensSerializedState['attributes'],
  { visualizationType: 'lnsHeatmap' }
>;

type HeatmapAttributesWithoutFiltersAndQuery = Omit<HeatmapAttributes, 'state'> & {
  state: Omit<HeatmapAttributes['state'], 'filters' | 'query'>;
};

export function fromAPItoLensState(config: HeatmapConfig): HeatmapAttributesWithoutFiltersAndQuery {
  const _buildDataLayer = (cfg: unknown) => buildFormBasedLayer(cfg as HeatmapConfigNoESQL);

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
      adHocDataViews,
    },
  };
}
