/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { XYLegendValue } from '@kbn/chart-expressions-common';
import { LegendSize, LegendLayout } from '@kbn/chart-expressions-common';
import type { XYState as XYLensState } from '@kbn/lens-common';
import type { XYState } from '../../../schema';
import { stripUndefined } from '../utils';

type OutsideLegendType = Extract<Required<XYState['legend']>, { inside: false }>;

type StatisticsType = OutsideLegendType['statistics'][number];

const StatsAPIToOldState = {
  avg: 'average',
  last_value: 'lastValue',
  first_value: 'firstValue',
  last_non_null_value: 'lastNonNullValue',
  first_non_null_value: 'firstNonNullValue',
  current_and_last_value: 'currentAndLastValue',
  difference_percentage: 'differencePercent',
  standard_deviation: 'stdDeviation',
  distinct_count: 'distinctCount',
} as const;

function isAPIMappedStatistic(stat: StatisticsType): stat is keyof typeof StatsAPIToOldState {
  return stat in StatsAPIToOldState;
}

function mapStatToCamelCase(stat: StatisticsType): XYLegendValue {
  if (isAPIMappedStatistic(stat)) {
    return StatsAPIToOldState[stat];
  }
  return stat;
}

const StatsStateToAPI = {
  average: 'avg',
  lastValue: 'last_value',
  firstValue: 'first_value',
  lastNonNullValue: 'last_non_null_value',
  firstNonNullValue: 'first_non_null_value',
  currentAndLastValue: 'current_and_last_value',
  differencePercent: 'difference_percentage',
  stdDeviation: 'standard_deviation',
  distinctCount: 'distinct_count',
} as const;

function isStateMappedStatistic(stat: XYLegendValue): stat is keyof typeof StatsStateToAPI {
  return stat in StatsStateToAPI;
}

function mapStatToSnakeCase(stat: XYLegendValue): StatisticsType {
  if (isStateMappedStatistic(stat)) {
    return StatsStateToAPI[stat];
  }
  return stat;
}

const DEFAULT_LEGEND_POSITON = 'right';

function extractAlignment(legend: XYState['legend']):
  | {
      verticalAlignment: 'top' | 'bottom' | undefined;
      horizontalAlignment: 'left' | 'right' | undefined;
    }
  | {} {
  if (legend?.inside) {
    const [verticalAlignment, horizontalAlignment] = (legend.alignment?.split('_') ?? [
      'top',
      'right',
    ]) as ['top' | 'bottom' | undefined, 'left' | 'right' | undefined];
    return { verticalAlignment, horizontalAlignment };
  }
  return {};
}

function getLegendSize(
  size: OutsideLegendType['size'] | undefined
): XYLensState['legend']['legendSize'] {
  switch (size) {
    case 'small':
      return LegendSize.SMALL;
    case 'medium':
      return LegendSize.MEDIUM;
    case 'large':
      return LegendSize.LARGE;
    case 'xlarge':
      return LegendSize.EXTRA_LARGE;
    default:
      return LegendSize.AUTO;
  }
}

export function convertLegendToStateFormat(legend: XYState['legend']): {
  legend: XYLensState['legend'];
} {
  const newStateLegend: XYLensState['legend'] = {
    isVisible: legend?.visibility === 'auto' || legend?.visibility === 'visible',
    shouldTruncate: Boolean(legend?.truncate_after_lines), // 0 will be interpreted as false
    ...(legend?.truncate_after_lines ? { maxLines: legend?.truncate_after_lines } : {}),
    ...(legend?.statistics
      ? { legendStats: (legend?.statistics ?? []).map(mapStatToCamelCase) }
      : {}),
    ...(legend?.statistics
      ? { layout: legend?.statistics?.length ? LegendLayout.Table : LegendLayout.List }
      : {}),
    ...extractAlignment(legend),
    ...(legend?.visibility === 'auto' ? { showSingleSeries: true } : {}),
    ...(legend?.inside
      ? {
          isInside: true,
          position: DEFAULT_LEGEND_POSITON,
          ...(legend?.columns ? { floatingColumns: legend?.columns } : {}),
        }
      : {
          position: legend?.position ?? DEFAULT_LEGEND_POSITON,
          legendSize: legend?.size ? getLegendSize(legend.size) : LegendSize.AUTO,
        }),
  };

  return { legend: newStateLegend };
}

function getLegendSizeAPI(
  size: XYLensState['legend']['legendSize'] | undefined
): Pick<OutsideLegendType, 'size'> | {} {
  switch (size) {
    case LegendSize.SMALL:
      return { size: 'small' };
    case LegendSize.MEDIUM:
      return { size: 'medium' };
    case LegendSize.LARGE:
      return { size: 'large' };
    case LegendSize.EXTRA_LARGE:
      return { size: 'xlarge' };
    default:
      return {};
  }
}

// @TODO improve this check
function isLegendInside(legend: XYLensState['legend']): boolean {
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

function getLegendAlignment(legend: XYLensState['legend']) {
  if (!legend.verticalAlignment && !legend.horizontalAlignment) {
    return {};
  }
  return {
    alignment: `${legend.verticalAlignment ?? 'top'}_${legend.horizontalAlignment ?? 'right'}`,
  };
}

function getLegendLayout(legend: XYLensState['legend']) {
  if (isLegendInside(legend)) {
    return {
      inside: true,
      ...(legend.floatingColumns ? { columns: legend.floatingColumns } : {}),
      ...getLegendAlignment(legend),
    };
  }
  return {
    inside: false,
    ...getLegendSizeAPI(legend.legendSize),
    ...(legend.position ? { position: legend.position } : {}),
  };
}

export function convertLegendToAPIFormat(
  legend: XYLensState['legend']
): Pick<XYState, 'legend'> | {} {
  const legendOptions = stripUndefined({
    visibility: !legend.isVisible ? 'hidden' : legend.showSingleSeries ? 'auto' : 'visible',
    truncate_after_lines: legend?.maxLines == null ? undefined : legend.maxLines,
    statistics: legend?.legendStats?.length
      ? legend.legendStats.map(mapStatToSnakeCase)
      : undefined,
    ...getLegendLayout(legend),
  });

  return { legend: legendOptions };
}
