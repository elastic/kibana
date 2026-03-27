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
import { getLegendTruncateAfterLines, getReversibleMappings, stripUndefined } from '../utils';

type OutsideLegendType = Extract<Required<XYState['legend']>, { placement: 'outside' }>;

type StatisticsType = OutsideLegendType['statistics'][number];

const legendStatisticCompat = getReversibleMappings<StatisticsType, XYLegendValue>([
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

export function convertLegendToStateFormat(legend: XYState['legend']): {
  legend: XYVisualizationState['legend'];
} {
  const newStateLegend: XYVisualizationState['legend'] = {
    isVisible: legend?.visibility === 'auto' || legend?.visibility === 'visible',
    shouldTruncate: Boolean(legend?.truncate_after_lines), // 0 will be interpreted as false
    ...(legend?.truncate_after_lines ? { maxLines: legend?.truncate_after_lines } : {}),
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
        }
      : {
          position: legend?.position ?? DEFAULT_LEGEND_POSITON,
          legendSize: legendSizeCompat.toState(legend?.size),
          ...(legend?.layout === 'list' ? { layout: LegendLayout.List } : {}),
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
  return {
    position: `${legend.verticalAlignment ?? 'top'}_${legend.horizontalAlignment ?? 'right'}`,
  };
}

function getLegendLayout(legend: XYVisualizationState['legend']) {
  if (isLegendInside(legend)) {
    return {
      placement: 'inside' as const,
      ...(legend.floatingColumns ? { columns: legend.floatingColumns } : {}),
      ...getLegendAlignment(legend),
    };
  }
  return {
    placement: 'outside' as const,
    size: legendSizeCompat.toAPI(legend.legendSize),
    position: legend.position,
  };
}

export function convertLegendToAPIFormat(
  legend: XYVisualizationState['legend']
): Pick<XYState, 'legend'> | {} {
  const legendOptions = stripUndefined({
    visibility: !legend.isVisible ? 'hidden' : legend.showSingleSeries ? 'auto' : 'visible',
    truncate_after_lines: getLegendTruncateAfterLines(legend),
    statistics: legend?.legendStats?.length
      ? legend.legendStats.map((stat) => legendStatisticCompat.toAPI(stat))
      : undefined,
    ...getLegendLayout(legend),
  });

  return { legend: legendOptions };
}
