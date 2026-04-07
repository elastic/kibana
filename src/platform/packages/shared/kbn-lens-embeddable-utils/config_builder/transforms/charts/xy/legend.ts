/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LegendLayout, type XYLegendValue } from '@kbn/chart-expressions-common';
import type { XYVisualizationState } from '@kbn/lens-common';
import type { XYState } from '../../../schema';
import { legendSizeCompat } from '../legend_sizes';
import { getReversibleMappings, stripUndefined } from '../utils';
import type {
  HorizontalOutsideLayoutLegend,
  LegendStatistic,
  VerticalOutsideLayoutLegend,
  LegendSize as LegendSizeType,
  InsidePosition,
  InsideLayoutLegend,
} from './types';

const legendStatisticCompat = getReversibleMappings<LegendStatistic, XYLegendValue>([
  // Unchanged
  ['total', 'total'],
  ['count', 'count'],
  ['min', 'min'],
  ['max', 'max'],
  ['median', 'median'],
  ['range', 'range'],
  ['variance', 'variance'],
  ['difference', 'difference'],
  // Changed
  ['avg', 'average'],
  ['last_value', 'lastValue'],
  ['first_value', 'firstValue'],
  ['last_non_null_value', 'lastNonNullValue'],
  ['first_non_null_value', 'firstNonNullValue'],
  ['current_and_last_value', 'currentAndLastValue'],
  ['difference_percentage', 'differencePercent'],
  ['standard_deviation', 'stdDeviation'],
  ['distinct_count', 'distinctCount'],
]);

const DEFAULT_LEGEND_POSITON = 'right';

function extractAlignment(legend: XYState['legend']):
  | {
      verticalAlignment: 'top' | 'bottom' | undefined;
      horizontalAlignment: 'left' | 'right' | undefined;
    }
  | {} {
  if (legend?.placement === 'inside') {
    const [verticalAlignment, horizontalAlignment] = (legend.position?.split('_') ?? [
      'top',
      'right',
    ]) as ['top' | 'bottom' | undefined, 'left' | 'right' | undefined];
    return { verticalAlignment, horizontalAlignment };
  }
  return {};
}

function isOutsideListLegendLayout(legend: XYState['legend']) {
  return Boolean(
    legend &&
      legend.placement !== 'inside' &&
      'layout' in legend &&
      legend.layout?.type === 'list' &&
      'position' in legend &&
      (legend.position === 'top' || legend.position === 'bottom')
  );
}
function isOutsideListLegendLayoutState(legend: XYVisualizationState['legend']) {
  return Boolean(
    !isLegendInside(legend) &&
      legend.layout === LegendLayout.List &&
      (legend.position === 'top' || legend.position === 'bottom')
  );
}

function getLegendTruncation(legend: XYState['legend']): {
  max_lines?: number;
  max_pixels?: number;
  enabled?: boolean;
} | null {
  return legend && 'layout' in legend && legend.layout?.truncate ? legend.layout.truncate : null;
}

function getOutsideLegendSize(legend: XYState['legend']): LegendSizeType | undefined {
  return legend && 'size' in legend ? legend.size : undefined;
}

export function convertLegendToStateFormat(legend: XYState['legend']): {
  legend: XYVisualizationState['legend'];
} {
  const isListLegendLayout = isOutsideListLegendLayout(legend);
  const legendTruncation = getLegendTruncation(legend);
  const truncateMaxLines = legendTruncation?.max_lines;
  const truncateMaxPixels = legendTruncation?.max_pixels;
  const truncateEnabled = legendTruncation?.enabled;
  const outsideLegendSize = getOutsideLegendSize(legend);

  const newStateLegend: XYVisualizationState['legend'] = {
    isVisible: legend?.visibility === 'auto' || legend?.visibility === 'visible',
    shouldTruncate: truncateEnabled,
    ...(legend?.statistics
      ? {
          legendStats: (legend?.statistics ?? []).map((stat) =>
            legendStatisticCompat.toState(stat)
          ),
        }
      : {}),
    ...extractAlignment(legend),
    ...(legend?.visibility === 'auto' ? { showSingleSeries: true } : {}),
    ...(legend?.placement === 'inside'
      ? {
          isInside: true,
          position: DEFAULT_LEGEND_POSITON,
          ...(legend?.columns ? { floatingColumns: legend?.columns } : {}),
          ...(truncateMaxLines ? { maxLines: truncateMaxLines } : {}),
        }
      : {
          position: legend?.position ?? DEFAULT_LEGEND_POSITON,
          legendSize: legendSizeCompat.toState(outsideLegendSize),
          ...(isListLegendLayout
            ? {
                layout: LegendLayout.List,
                ...(truncateMaxPixels != null ? { maxPixels: truncateMaxPixels } : {}),
              }
            : {
                ...(truncateMaxLines ? { maxLines: truncateMaxLines } : {}),
              }),
        }),
  };

  return { legend: newStateLegend };
}

// @TODO improve this check
function isLegendInside(legend: XYVisualizationState['legend']): boolean {
  if (legend.isInside != null) {
    return legend.isInside;
  }
  return (
    legend.legendSize == null &&
    (legend.floatingColumns != null ||
      legend.verticalAlignment != null ||
      legend.horizontalAlignment != null)
  );
}

function getLegendAlignment(legend: XYVisualizationState['legend']) {
  if (!legend.verticalAlignment && !legend.horizontalAlignment) {
    return {};
  }
  const position: InsidePosition = `${legend.verticalAlignment ?? 'top'}_${
    legend.horizontalAlignment ?? 'right'
  }`;
  return {
    position,
  };
}

function getLegendLayout(legend: XYVisualizationState['legend']) {
  const { max_pixels, max_lines, enabled } = getApiLegendTruncate(legend);

  if (isLegendInside(legend)) {
    return {
      placement: 'inside',
      layout: {
        type: 'grid',
        truncate: {
          max_lines,
          enabled,
        },
      },
      ...(legend.floatingColumns ? { columns: legend.floatingColumns } : {}),
      ...getLegendAlignment(legend),
    } satisfies InsideLayoutLegend;
  }

  const isListLayout = isOutsideListLegendLayoutState(legend);

  const baseOutside = stripUndefined({
    placement: 'outside' as const,
    size: legendSizeCompat.toAPI(legend.legendSize),
    position: legend.position ?? DEFAULT_LEGEND_POSITON,
  });

  return {
    ...baseOutside,
    layout: isListLayout
      ? {
          type: 'list',
          truncate: {
            max_pixels,
            enabled,
          },
        }
      : {
          type: 'grid',
          truncate: {
            max_lines,
            enabled,
          },
        },
  } satisfies HorizontalOutsideLayoutLegend | VerticalOutsideLayoutLegend;
}

function getApiLegendTruncate(
  legend: Pick<XYVisualizationState['legend'], 'shouldTruncate' | 'maxLines' | 'maxPixels'>
): {
  max_lines?: number;
  max_pixels?: number;
  enabled?: boolean;
} {
  if (!legend) return {};

  const { shouldTruncate, maxLines, maxPixels } = legend;

  return {
    max_lines: maxLines ?? 1,
    max_pixels: maxPixels ?? 250,
    enabled: shouldTruncate,
  };
}

export function convertLegendToAPIFormat(
  legend: XYVisualizationState['legend']
): Pick<XYState, 'legend'> | {} {
  const visibility = !legend.isVisible ? 'hidden' : legend.showSingleSeries ? 'auto' : 'visible';
  const statistics = legend.legendStats?.length
    ? legend.legendStats.map((stat) => legendStatisticCompat.toAPI(stat))
    : undefined;

  return {
    legend: stripUndefined({
      visibility,
      statistics,
      ...getLegendAlignment(legend),
      ...getLegendLayout(legend),
    }),
  };
}
