/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ColumnState } from '@kbn/lens-common';
import type { DatatableState } from '../../../../schema';
import { fromColorMappingAPIToLensState, fromColorByValueAPIToLensState } from '../../../coloring';
import { getAccessorName, isColorByValueColor, isColorMappingColor } from '../helpers';
import {
  METRIC_ACCESSOR_PREFIX,
  ROW_ACCESSOR_PREFIX,
  SPLIT_METRIC_BY_ACCESSOR_PREFIX,
} from '../constants';

function buildColorProps(
  config: DatatableState['metrics'][number] | NonNullable<DatatableState['rows']>[number]
): Partial<Pick<ColumnState, 'palette' | 'colorMapping' | 'colorMode'>> {
  if (!config.apply_color_to) return {};
  const colorMode = config.apply_color_to === 'value' ? 'text' : 'cell';

  if (isColorMappingColor(config.color)) {
    return { colorMode, colorMapping: fromColorMappingAPIToLensState(config.color) };
  }

  if (isColorByValueColor(config.color)) {
    return { colorMode, palette: fromColorByValueAPIToLensState(config.color) };
  }

  return { colorMode };
}

function buildCommonMetricRowState(
  config: DatatableState['metrics'][number] | NonNullable<DatatableState['rows']>[number]
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

export function buildMetricsState(metrics: DatatableState['metrics']): ColumnState[] {
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

export function buildRowsState(rows: DatatableState['rows']): ColumnState[] {
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
  splitMetrics: DatatableState['split_metrics_by']
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
