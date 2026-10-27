/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { CellDecorationValueRange, ColumnState } from '@kbn/lens-common';
import { LENS_DATATABLE_DEFAULT_COLOR_STEPS } from '@kbn/lens-common';
import type { DatatableConfig } from '../../../../schema';
import {
  fromColorMappingAPIToLensState,
  fromColorByValueAPIToLensState,
  isAutoColor,
  isColorMappingColor,
  isColorByValueColor,
  isLegacyColorPalette,
} from '../../../coloring';
import { getAccessorName, applyColorToToColorMode } from '../helpers';
import {
  METRIC_ACCESSOR_PREFIX,
  ROW_ACCESSOR_PREFIX,
  SPLIT_METRIC_BY_ACCESSOR_PREFIX,
} from '../constants';

type APIColumnConfig =
  | NonNullable<DatatableConfig['metrics']>[number]
  | NonNullable<DatatableConfig['rows']>[number];

type ProgressBarConfig = Extract<APIColumnConfig, { apply_color_to: 'progress_bar' }>;

type PaletteFillColor = Extract<ProgressBarConfig, { fill_mode: 'solid' | 'gradient' }>['color'];

function buildValueRangeState(
  valueRange: ProgressBarConfig['value_range']
): CellDecorationValueRange {
  return valueRange.type === 'custom'
    ? { mode: 'custom', min: valueRange.min, max: valueRange.max }
    : { mode: 'auto' };
}

function buildPaletteFillState(color: PaletteFillColor): Pick<ColumnState, 'palette'> {
  // `auto` defers the palette to the editor and renderer defaults
  if (isAutoColor(color)) {
    return {};
  }
  return {
    palette: fromColorByValueAPIToLensState(color, LENS_DATATABLE_DEFAULT_COLOR_STEPS),
  };
}

/**
 * `color` writes either `fillStyle.color` (single fill) or `palette` (solid and gradient fills),
 * so no value from another fill mode is stored.
 */
function buildProgressBarState(
  config: ProgressBarConfig
): Pick<ColumnState, 'colorMode' | 'fillStyle' | 'palette'> {
  const colorMode = applyColorToToColorMode(config.apply_color_to);
  const valueRange = buildValueRangeState(config.value_range);

  if (config.fill_mode === 'single') {
    const { fill_mode: fillMode, color } = config;
    // `auto` defers the color to the editor and renderer defaults
    return {
      colorMode,
      fillStyle: isAutoColor(color)
        ? { fillMode, valueRange }
        : { fillMode, color: color.color, valueRange },
    };
  }

  return {
    colorMode,
    fillStyle: { fillMode: config.fill_mode, valueRange },
    ...buildPaletteFillState(config.color),
  };
}

function buildColorProps(
  config: APIColumnConfig
): Partial<Pick<ColumnState, 'palette' | 'colorMapping' | 'colorMode' | 'fillStyle'>> {
  if (!config.apply_color_to) return {};
  // Before the generic color branches, which would store a palette without `fillStyle`
  if (config.apply_color_to === 'progress_bar') {
    return buildProgressBarState(config);
  }
  const colorMode = applyColorToToColorMode(config.apply_color_to);

  if (isColorMappingColor(config.color)) {
    const color = fromColorMappingAPIToLensState(config.color);
    if (isLegacyColorPalette(color)) {
      return { colorMode, palette: color.palette };
    }
    return { colorMode, colorMapping: color?.colorMapping };
  }

  if (isColorByValueColor(config.color)) {
    return {
      colorMode,
      palette: fromColorByValueAPIToLensState(config.color, LENS_DATATABLE_DEFAULT_COLOR_STEPS),
    };
  }

  // defer resolution of default color configuration (mapping/palette) to runtime
  return { colorMode };
}

function buildCommonMetricRowState(
  config:
    | NonNullable<DatatableConfig['metrics']>[number]
    | NonNullable<DatatableConfig['rows']>[number]
): Pick<
  ColumnState,
  'hidden' | 'alignment' | 'colorMode' | 'isTransposed' | 'palette' | 'colorMapping' | 'width'
> {
  return {
    ...(config.visible != null ? { hidden: !config.visible } : {}),
    ...(config.alignment ? { alignment: config.alignment } : {}),
    ...(config.width != null ? { width: config.width } : {}),
    ...buildColorProps(config),
    isTransposed: false,
  };
}

export function buildMetricsState(metrics: DatatableConfig['metrics']): ColumnState[] {
  if (!metrics) return [];

  return metrics.map((metric, index) => {
    const columnId = getAccessorName(METRIC_ACCESSOR_PREFIX, index);

    return {
      columnId,
      ...buildCommonMetricRowState(metric),
      ...(metric.summary
        ? {
            summaryRow: metric.summary.type,
            ...(metric.summary.label != null ? { summaryLabel: metric.summary.label } : {}),
          }
        : {}),
      isMetric: true,
    };
  });
}

export function buildRowsState(rows: DatatableConfig['rows']): ColumnState[] {
  if (!rows) return [];

  return rows.map((row, index) => {
    const columnId = getAccessorName(ROW_ACCESSOR_PREFIX, index);
    return {
      columnId,
      ...buildCommonMetricRowState(row),
      ...(row.click_filter != null ? { oneClickFilter: row.click_filter } : {}),
      ...(row.collapse_by ? { collapseFn: row.collapse_by } : {}),
      isMetric: false,
    };
  });
}

export function buildSplitMetricsByState(
  splitMetrics: DatatableConfig['split_metrics_by']
): ColumnState[] {
  if (!splitMetrics) return [];

  return splitMetrics.map((_splitMetricBy, index) => {
    const columnId = getAccessorName(SPLIT_METRIC_BY_ACCESSOR_PREFIX, index);
    return {
      columnId,
      isMetric: false,
      isTransposed: true,
    };
  });
}
