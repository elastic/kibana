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
  TextBasedLayerColumn,
  ValueFormatConfig,
} from '@kbn/lens-common';
import type { DataView } from '@kbn/data-views-plugin/public';
import type {
  BuildDependencies,
  LensAttributes,
  LensBaseLayer,
  LensHeatmapColorStep,
  LensHeatmapConfig,
} from '../types';
import { DEFAULT_LAYER_ID } from '../constants';
import { addLayerColumn, buildDatasourceStates, extractReferences, mapToFormula } from '../utils';
import { getBreakdownColumn, getFormulaColumn, getValueColumn } from '../columns';

const ACCESSOR = 'metric_formula_accessor';

function getAccessorName(type: 'x' | 'y') {
  return `${type}_${ACCESSOR}`;
}

function buildPalette(
  steps: readonly LensHeatmapColorStep[],
  accessor: string
): HeatmapPalette | undefined {
  if (steps.length === 0) {
    return undefined;
  }

  const rangeMin = steps[0].gte;
  const last = steps[steps.length - 1];
  const rangeMax = last.lt ?? last.lte ?? last.gte;

  return {
    type: 'palette',
    name: 'custom',
    accessor,
    params: {
      name: 'custom',
      reverse: false,
      rangeType: 'percent',
      rangeMin,
      rangeMax,
      steps: steps.length,
      continuity: 'none',
      colorStops: steps.map(({ color, gte }) => ({ color, stop: gte })),
      stops: steps.map(({ color, gte, lt, lte }) => ({
        color,
        stop: lt ?? lte ?? gte,
      })),
    },
  };
}

function buildVisualizationState(config: LensHeatmapConfig): HeatmapVisualizationState {
  const layer = config;
  const palette = layer.colorSteps ? buildPalette(layer.colorSteps, ACCESSOR) : undefined;

  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: 'data',
    shape: 'heatmap',
    valueAccessor: ACCESSOR,
    ...(layer.xAxis
      ? {
          xAccessor: getAccessorName('x'),
        }
      : {}),

    ...(layer.breakdown
      ? {
          yAccessor: getAccessorName('y'),
        }
      : {}),
    gridConfig: {
      type: 'heatmap_grid',
      isCellLabelVisible: false,
      isXAxisLabelVisible: layer.xAxisOptions?.showLabels ?? false,
      isXAxisTitleVisible: layer.xAxisOptions?.showTitle ?? false,
      isYAxisLabelVisible: layer.yAxisOptions?.showLabels ?? false,
      isYAxisTitleVisible: layer.yAxisOptions?.showTitle ?? false,
      ...(layer.xAxisOptions?.sort ? { xSortPredicate: layer.xAxisOptions.sort } : {}),
      ...(layer.yAxisOptions?.sort ? { ySortPredicate: layer.yAxisOptions.sort } : {}),
    },
    legend: {
      isVisible: config.legend?.show ?? true,
      position: config.legend?.position || 'left',
      type: 'heatmap_legend',
    },
    ...(palette ? { palette } : {}),
  };
}

function buildFormulaLayer(
  layer: LensHeatmapConfig,
  i: number,
  dataView: DataView
): FormBasedPersistedState['layers'][0] {
  const defaultLayer = {
    ...getFormulaColumn(ACCESSOR, mapToFormula(layer), dataView),
  };

  if (layer.xAxis) {
    const columnName = getAccessorName('x');
    const breakdownColumn = getBreakdownColumn({
      options: layer.xAxis,
      dataView,
    });
    addLayerColumn(defaultLayer, columnName, breakdownColumn, true);
  }

  if (layer.breakdown) {
    const columnName = getAccessorName('y');
    const breakdownColumn = getBreakdownColumn({
      options: layer.breakdown,
      dataView,
    });
    addLayerColumn(defaultLayer, columnName, breakdownColumn, true);
  }

  return defaultLayer;
}

function toColumnFormat(
  format: Pick<
    LensBaseLayer,
    'format' | 'decimals' | 'compactValues' | 'suffix' | 'fromUnit' | 'toUnit'
  >
): ValueFormatConfig | undefined {
  if (!format.format) {
    return undefined;
  }

  return {
    id: format.format,
    params: {
      decimals: format.decimals ?? 0,
      ...(format.compactValues != null ? { compact: format.compactValues } : {}),
      ...(format.suffix ? { suffix: format.suffix } : {}),
      ...(format.fromUnit ? { fromUnit: format.fromUnit } : {}),
      ...(format.toUnit ? { toUnit: format.toUnit } : {}),
    },
  };
}

function withLabel(column: TextBasedLayerColumn, label?: string): TextBasedLayerColumn {
  if (!label) {
    return column;
  }
  return { ...column, label, customLabel: true };
}

function getValueColumns(layer: LensHeatmapConfig) {
  if (layer.breakdown && typeof layer.breakdown !== 'string') {
    throw new Error('breakdown must be a field name when not using index source');
  }
  if (typeof layer.xAxis !== 'string' && layer.xAxis.type !== 'dateHistogram') {
    throw new Error('xAxis must be a field name when not using index source');
  }

  const yFormat = layer.breakdownFormat ? toColumnFormat(layer.breakdownFormat) : undefined;
  const valueFormat = toColumnFormat(layer);
  const xColumn =
    typeof layer.xAxis === 'string'
      ? getValueColumn(getAccessorName('x'), layer.xAxis)
      : getValueColumn(getAccessorName('x'), layer.xAxis.field, 'date');

  return [
    ...(typeof layer.breakdown === 'string'
      ? [
          withLabel(
            getValueColumn(
              getAccessorName('y'),
              layer.breakdown,
              yFormat ? 'number' : undefined,
              yFormat
            ),
            layer.yAxisOptions?.label
          ),
        ]
      : []),
    withLabel(xColumn, layer.xAxisOptions?.label),
    withLabel(
      getValueColumn(ACCESSOR, layer.value, valueFormat ? 'number' : undefined, valueFormat),
      layer.label
    ),
  ];
}

export async function buildHeatmap(
  config: LensHeatmapConfig,
  { dataViewsAPI }: BuildDependencies
): Promise<LensAttributes> {
  const dataviews: Record<string, DataView> = {};
  const _buildFormulaLayer = (cfg: unknown, i: number, dataView: DataView) =>
    buildFormulaLayer(cfg as LensHeatmapConfig, i, dataView);
  const datasourceStates = await buildDatasourceStates(
    config,
    dataviews,
    _buildFormulaLayer,
    getValueColumns,
    dataViewsAPI
  );
  const { references, internalReferences, adHocDataViews } = extractReferences(dataviews);

  return {
    title: config.title,
    ...(config.description != null ? { description: config.description } : {}),
    visualizationType: 'lnsHeatmap',
    references,
    state: {
      datasourceStates,
      internalReferences,
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: buildVisualizationState(config),
      adHocDataViews,
    },
  };
}
