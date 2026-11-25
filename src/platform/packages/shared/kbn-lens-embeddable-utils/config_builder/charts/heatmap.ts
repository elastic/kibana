/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  LENS_HEATMAP_DEFAULT_COLOR_STEPS,
  LENS_RANGE_MODES,
  isColumnOfType,
  type FormBasedPersistedState,
  type GenericIndexPatternColumn,
  type HeatmapPalette,
  type HeatmapVisualizationState,
  type RangeIndexPatternColumn,
  type TermsIndexPatternColumn,
  type ValueFormatConfig,
} from '@kbn/lens-common';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { BuildDependencies, LensAttributes, LensHeatmapConfig } from '../types';
import { DEFAULT_LAYER_ID } from '../constants';
import { addLayerColumn, buildDatasourceStates, extractReferences, mapToFormula } from '../utils';
import { getBreakdownColumn, getFormulaColumn, getValueColumn } from '../columns';
import { fromColorByValueAPIToLensState, isAutoColor } from '../transforms/coloring';

const ACCESSOR = 'metric_formula_accessor';

function getAccessorName(type: 'x' | 'y') {
  return `${type}_${ACCESSOR}`;
}

function buildVisualizationState(config: LensHeatmapConfig): HeatmapVisualizationState {
  const layer = config;
  const basePalette =
    layer.color && !isAutoColor(layer.color)
      ? fromColorByValueAPIToLensState(layer.color, LENS_HEATMAP_DEFAULT_COLOR_STEPS)
      : undefined;

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
      isXAxisLabelVisible: config.axisLabel?.xAxis ?? false,
      isXAxisTitleVisible: false,
      isYAxisLabelVisible: config.axisLabel?.yAxis ?? false,
      isYAxisTitleVisible: false,
      ...(config.ySort ? { ySortPredicate: config.ySort } : {}),
    },
    legend: {
      isVisible: config.legend?.show ?? true,
      position: config.legend?.position || 'left',
      type: 'heatmap_legend',
    },
    ...(basePalette && {
      palette: {
        ...basePalette,
        accessor: ACCESSOR,
      } satisfies HeatmapPalette,
    }),
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
    const breakdownColumn = withBreakdownFormat(
      getBreakdownColumn({
        options: layer.breakdown,
        dataView,
      }),
      toBreakdownFormat(layer.breakdownFormat)
    );
    addLayerColumn(defaultLayer, columnName, breakdownColumn, true);
  }

  return defaultLayer;
}

function toBreakdownFormat(
  columnFormat: LensHeatmapConfig['breakdownFormat']
): ValueFormatConfig | undefined {
  if (!columnFormat?.format) {
    return;
  }

  const { decimals, compactValues, suffix, fromUnit, toUnit } = columnFormat;
  const hasDecimals = typeof decimals === 'number';
  const hasCompact = typeof compactValues === 'boolean';
  const params = {
    ...(hasDecimals ? { decimals } : {}),
    ...(hasCompact ? { compact: compactValues } : {}),
    ...(suffix ? { suffix } : {}),
    ...(fromUnit ? { fromUnit } : {}),
    ...(toUnit ? { toUnit } : {}),
  };

  if (Object.keys(params).length === 0) {
    return { id: columnFormat.format };
  }

  // ValueFormatConfig requires decimals whenever params are present.
  return {
    id: columnFormat.format,
    params: {
      decimals: hasDecimals ? decimals : 0,
      ...params,
    },
  };
}

function withBreakdownFormat(
  column: GenericIndexPatternColumn,
  format: ValueFormatConfig | undefined
): GenericIndexPatternColumn {
  if (!format) {
    return column;
  }
  if (isColumnOfType<RangeIndexPatternColumn>('range', column)) {
    // Histogram keys are numbers, so they keep a scalar format. Explicit ranges are
    // RangeKey objects and need the range wrapper or lens_format_column drops the bounds.
    const parentFormat =
      column.params.type === LENS_RANGE_MODES.Range
        ? column.params.parentFormat ?? {
            id: 'range',
            params: { template: 'arrow_right', replaceInfinity: true },
          }
        : undefined;
    return {
      ...column,
      params: {
        ...column.params,
        format,
        ...(parentFormat ? { parentFormat } : {}),
      },
    };
  }
  if (isColumnOfType<TermsIndexPatternColumn>('terms', column)) {
    return {
      ...column,
      params: {
        ...column.params,
        format,
      },
    };
  }
  return column;
}

function getValueColumns(layer: LensHeatmapConfig) {
  if (layer.breakdown && typeof layer.breakdown !== 'string') {
    throw new Error('breakdown must be a field name when not using index source');
  }
  if (typeof layer.xAxis !== 'string') {
    throw new Error('xAxis must be a field name when not using index source');
  }
  const format = toBreakdownFormat(layer.breakdownFormat);
  return [
    ...(layer.breakdown
      ? [getValueColumn(getAccessorName('y'), layer.breakdown, undefined, format)]
      : []),
    getValueColumn(getAccessorName('x'), layer.xAxis as string),
    getValueColumn(ACCESSOR, layer.value),
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
