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
  HeatmapPalette,
  HeatmapVisualizationState,
  PersistedIndexPatternLayer,
  TextBasedLayer,
} from '@kbn/lens-common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { LegendSize } from '@kbn/chart-expressions-common';
import type { Reference } from '@kbn/content-management-utils';
import { getSharedChartAPIToLensState, getSharedChartLensStateToAPI } from './utils';
import type { HeatmapState } from '../../schema';
import { fromColorByValueAPIToLensState, fromColorByValueLensStateToAPI } from '../coloring';
import type { LensAttributes } from '../../types';
import { DEFAULT_LAYER_ID } from '../../types';
import {
  addLayerColumn,
  buildDatasetStateESQL,
  buildDatasetStateNoESQL,
  buildDatasourceStates,
  buildReferences,
  generateApiLayer,
  generateLayer,
  getAdhocDataviews,
  getDataSourceLayer,
  isTextBasedLayer,
  operationFromColumn,
} from '../utils';
import type { HeatmapStateESQL, HeatmapStateNoESQL } from '../../schema/charts/heatmap';
import { fromMetricAPItoLensState } from '../columns/metric';
import { fromBucketLensApiToLensState } from '../columns/buckets';
import type { LensApiBucketOperations } from '../../schema/bucket_ops';
import { getValueApiColumn, getValueColumn } from '../columns/esql_column';
import type { LensApiAllMetricOperations } from '../../schema/metric_ops';

const VISUALIZATION_TYPE = 'lnsHeatmap';
const API_VISUALIZATION_TYPE = 'heatmap';
const ACCESSOR = 'heatmap_value_accessor';
const LENS_DEFAULT_LAYER_ID = 'layer_0';

function getAccessorName(type: 'x' | 'y' | 'value') {
  return `${ACCESSOR}_${type}`;
}

function buildVisualizationState(config: HeatmapState): HeatmapVisualizationState {
  const layer = config;
  const valueAccessor = getAccessorName('value');
  const basePalette = layer.metric.color && fromColorByValueAPIToLensState(layer.metric.color);

  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: 'data',
    shape: 'heatmap',
    valueAccessor,
    xAccessor: getAccessorName('x'),
    ...(layer.yAxis ? { yAccessor: getAccessorName('y') } : {}),
    gridConfig: {
      type: 'heatmap_grid',
      isCellLabelVisible: false,
      isXAxisLabelVisible: layer.axes?.x?.labels?.visible ?? true,
      isXAxisTitleVisible: layer.axes?.x?.title?.visible ?? false,
      isYAxisLabelVisible: layer.axes?.y?.labels?.visible ?? true,
      isYAxisTitleVisible: layer.axes?.y?.title?.visible ?? false,
    },
    legend: {
      isVisible: layer.legend?.visible ?? true,
      position: layer.legend?.position ?? 'left',
      type: 'heatmap_legend',
      ...(layer.legend?.truncate_after_lines
        ? { maxLines: layer.legend?.truncate_after_lines }
        : {}),
      ...(layer.legend?.size ? { legendSize: layer.legend?.size as LegendSize } : {}),
    },
    ...(basePalette && {
      palette: {
        ...basePalette,
        accessor: valueAccessor,
      } satisfies HeatmapPalette,
    }),
  };
}

function getLegendProps(legend: HeatmapVisualizationState['legend']): HeatmapState['legend'] {
  return {
    visible: legend.isVisible,
    position: legend.position,
    ...(legend.maxLines !== undefined && { truncate_after_lines: legend.maxLines }),
    ...(legend.legendSize !== undefined && { size: legend.legendSize }),
  };
}

function getGridConfigProps(
  gridConfig: HeatmapVisualizationState['gridConfig']
): HeatmapState['axes'] {
  const hasXAxis =
    gridConfig.isXAxisLabelVisible !== undefined || gridConfig.isXAxisTitleVisible !== undefined;
  const hasYAxis =
    gridConfig.isYAxisLabelVisible !== undefined || gridConfig.isYAxisTitleVisible !== undefined;

  return {
    ...(hasXAxis
      ? {
          x: {
            ...(gridConfig.isXAxisLabelVisible !== undefined
              ? { labels: { visible: gridConfig.isXAxisLabelVisible } }
              : {}),
            ...(gridConfig.isXAxisTitleVisible !== undefined
              ? { title: { visible: gridConfig.isXAxisTitleVisible } }
              : {}),
          },
        }
      : {}),
    ...(hasYAxis
      ? {
          y: {
            ...(gridConfig.isYAxisLabelVisible !== undefined
              ? { labels: { visible: gridConfig.isYAxisLabelVisible } }
              : {}),
            ...(gridConfig.isYAxisTitleVisible !== undefined
              ? { title: { visible: gridConfig.isYAxisTitleVisible } }
              : {}),
          },
        }
      : {}),
  };
}

function reverseBuildVisualizationState(
  visualization: HeatmapVisualizationState,
  layer: FormBasedLayer | TextBasedLayer,
  layerId: string,
  adHocDataViews: Record<string, DataViewSpec>,
  references: Reference[],
  adhocReferences?: Reference[]
): HeatmapState {
  const valueAccessor = visualization.valueAccessor;
  if (valueAccessor == null) {
    throw new Error('Value accessor is missing in the visualization state');
  }

  const sharedProps = {
    ...generateApiLayer(layer),
    type: API_VISUALIZATION_TYPE,
    legend: getLegendProps(visualization.legend),
    axes: getGridConfigProps(visualization.gridConfig),
  } satisfies Partial<HeatmapState>;

  const paletteProps = {
    ...(visualization.palette && {
      color: fromColorByValueLensStateToAPI(visualization.palette),
    }),
  } satisfies Partial<HeatmapState['metric']>;

  if (isTextBasedLayer(layer)) {
    if (!visualization.xAccessor) {
      throw new Error('xAccessor is missing in the visualization state');
    }

    const dataset = buildDatasetStateESQL(layer);

    return {
      ...sharedProps,
      dataset,
      metric: {
        ...getValueApiColumn(valueAccessor, layer),
        ...paletteProps,
      },
      xAxis: getValueApiColumn(visualization.xAccessor, layer),
      ...(visualization.yAccessor && { yAxis: getValueApiColumn(visualization.yAccessor, layer) }),
    } satisfies HeatmapStateESQL;
  }

  const dataset = buildDatasetStateNoESQL(
    layer,
    layerId,
    adHocDataViews,
    references,
    adhocReferences
  );

  return {
    ...sharedProps,
    dataset,
    metric: {
      ...operationFromColumn(valueAccessor, layer),
      ...paletteProps,
    } as LensApiAllMetricOperations,
    xAxis: operationFromColumn(visualization.xAccessor!, layer),
    yAxis: visualization.yAccessor && operationFromColumn(visualization.yAccessor, layer),
  } as HeatmapStateNoESQL;
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

export function fromAPItoLensState(config: HeatmapState): LensAttributes {
  const _buildDataLayer = (cfg: unknown, i: number) =>
    buildFormBasedLayer(cfg as HeatmapStateNoESQL);

  const { layers, usedDataviews } = buildDatasourceStates(config, _buildDataLayer, getValueColumns);

  const visualization = buildVisualizationState(config);

  const { adHocDataViews, internalReferences } = getAdhocDataviews(usedDataviews);
  const regularDataViews = Object.values(usedDataviews).filter(
    (v): v is { id: string; type: 'dataView' } => v.type === 'dataView'
  );
  const references = regularDataViews.length
    ? buildReferences({ [LENS_DEFAULT_LAYER_ID]: regularDataViews[0]?.id })
    : [];

  return {
    visualizationType: VISUALIZATION_TYPE,
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

export function fromLensStateToAPI(config: LensAttributes): HeatmapState {
  const { state } = config;
  const visualization = state.visualization as HeatmapVisualizationState;
  const [layerId, layer] = getDataSourceLayer(state);

  return {
    ...getSharedChartLensStateToAPI(config),
    ...reverseBuildVisualizationState(
      visualization,
      layer,
      layerId ?? LENS_DEFAULT_LAYER_ID,
      config.state.adHocDataViews ?? {},
      config.references,
      config.state.internalReferences
    ),
  } satisfies HeatmapState;
}
