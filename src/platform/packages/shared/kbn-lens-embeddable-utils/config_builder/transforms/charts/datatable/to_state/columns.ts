/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ColumnState } from '@kbn/lens-common';
import type { DatatableConfig } from '../../../../schema';
import {
  fromColorMappingAPIToLensState,
  fromColorByValueAPIToLensState,
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

function buildColorProps(
  config:
    | NonNullable<DatatableConfig['metrics']>[number]
    | NonNullable<DatatableConfig['rows']>[number]
): Partial<Pick<ColumnState, 'palette' | 'colorMapping' | 'colorMode'>> {
  if (!config.apply_color_to) return {};
  const colorMode = applyColorToToColorMode(config.apply_color_to);

  if (isColorMappingColor(config.color)) {
    const color = fromColorMappingAPIToLensState(config.color);
    if (isLegacyColorPalette(color)) {
      return { colorMode, palette: color.palette };
    }
    return { colorMode, colorMapping: color?.colorMapping };
  }

  if (isColorByValueColor(config.color)) {
    return { colorMode, palette: fromColorByValueAPIToLensState(config.color) };
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
