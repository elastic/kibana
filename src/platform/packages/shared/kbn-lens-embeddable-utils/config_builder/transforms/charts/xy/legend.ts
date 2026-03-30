/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LegendLayout, LegendSize, type XYLegendValue } from '@kbn/chart-expressions-common';
import type { XYVisualizationState } from '@kbn/lens-common';
import type { XYState } from '../../../schema';
import { stripUndefined } from '../utils';

type OutsideLegendType = Extract<
  Required<XYState['legend']>,
  { placement: 'outside'; layout: { type: 'grid' } }
>;

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
  if (legend?.placement === 'inside') {
    const [verticalAlignment, horizontalAlignment] = (legend.position?.split('_') ?? [
      'top',
      'right',
    ]) as ['top' | 'bottom' | undefined, 'left' | 'right' | undefined];
    return { verticalAlignment, horizontalAlignment };
  }
  return {};
}

function getLegendSize(
  size: OutsideLegendType['size'] | undefined
): XYVisualizationState['legend']['legendSize'] {
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
} | null {
  return legend && 'layout' in legend && legend.layout?.truncate ? legend.layout.truncate : null;
}

function getOutsideLegendSize(
  legend: XYState['legend']
): 'small' | 'medium' | 'large' | 'xlarge' | undefined {
  return legend && 'size' in legend ? legend.size : undefined;
}

export function convertLegendToStateFormat(legend: XYState['legend']): {
  legend: XYVisualizationState['legend'];
} {
  const isListLegendLayout = isOutsideListLegendLayout(legend);
  const legendTruncation = getLegendTruncation(legend);
  const truncateMaxLines = legendTruncation?.max_lines;
  const truncateMaxPixels = legendTruncation?.max_pixels;
  const outsideLegendSize = getOutsideLegendSize(legend);

  const newStateLegend: XYVisualizationState['legend'] = {
    isVisible: legend?.visibility === 'auto' || legend?.visibility === 'visible',
    shouldTruncate: Boolean(truncateMaxLines || truncateMaxPixels), // 0 will be interpreted as false
    ...(legend?.statistics
      ? { legendStats: (legend?.statistics ?? []).map(mapStatToCamelCase) }
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
          legendSize: outsideLegendSize ? getLegendSize(outsideLegendSize) : undefined,
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

function getLegendSizeAPI(
  size: XYVisualizationState['legend']['legendSize'] | undefined
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
  const position: Extract<NonNullable<XYState['legend']>, { placement: 'inside' }>['position'] = `${
    legend.verticalAlignment ?? 'top'
  }_${legend.horizontalAlignment ?? 'right'}`;
  return {
    position,
  };
}

function getLegendLayout(legend: XYVisualizationState['legend']) {
  const { max_pixels, max_lines } = getApiLegendTruncate(legend);

  if (isLegendInside(legend)) {
    return {
      placement: 'inside' as const,
      layout: {
        type: 'grid' as const,
        ...(max_lines != null ? { truncate: { max_lines } } : {}),
      },
      ...(legend.floatingColumns ? { columns: legend.floatingColumns } : {}),
      ...getLegendAlignment(legend),
    } satisfies Omit<
      Extract<NonNullable<XYState['legend']>, { placement: 'inside' }>,
      'visibility' | 'statistics'
    >;
  }

  const position = legend.position ?? DEFAULT_LEGEND_POSITON;
  const isListLayout = isOutsideListLegendLayoutState(legend);

  if (position === 'top' || position === 'bottom') {
    return {
      placement: 'outside' as const,
      position,
      layout: isListLayout
        ? {
            type: 'list' as const,
            ...(max_pixels != null ? { truncate: { max_pixels } } : {}),
          }
        : {
            type: 'grid' as const,
            ...(max_lines != null ? { truncate: { max_lines } } : {}),
          },
    } satisfies Omit<
      Extract<
        NonNullable<XYState['legend']>,
        { placement?: 'outside'; position?: 'top' | 'bottom' }
      >,
      'visibility' | 'statistics'
    >;
  }

  // left/right (vertical) outside legend
  return {
    placement: 'outside' as const,
    position,
    ...getLegendSizeAPI(legend.legendSize),
    layout: {
      type: 'grid' as const,
      ...(max_lines != null ? { truncate: { max_lines } } : {}),
    },
  } satisfies Omit<
    Extract<NonNullable<XYState['legend']>, { placement?: 'outside'; position?: 'left' | 'right' }>,
    'visibility' | 'statistics'
  >;
}

function getApiLegendTruncate(
  legend: Pick<XYVisualizationState['legend'], 'shouldTruncate' | 'maxLines' | 'maxPixels'>
): {
  max_lines?: number;
  max_pixels?: number;
} {
  if (!legend) return {};

  const { shouldTruncate: stateShouldTruncate, maxLines, maxPixels } = legend;
  // if shouldTruncate is not explicitly set, infer it from maxLines and maxPixels
  const shouldTruncate =
    stateShouldTruncate != null ? stateShouldTruncate : Boolean(maxLines || maxPixels);

  if (!shouldTruncate) return {};

  return {
    max_lines: maxLines ?? 1,
    max_pixels: maxPixels ?? 250,
  };
}

export function convertLegendToAPIFormat(
  legend: XYVisualizationState['legend']
): Pick<XYState, 'legend'> | {} {
  const visibility = !legend.isVisible ? 'hidden' : legend.showSingleSeries ? 'auto' : 'visible';
  const statistics = legend.legendStats?.length
    ? legend.legendStats.map(mapStatToSnakeCase)
    : undefined;

  return {
    legend: stripUndefined({
      visibility,
      statistics,
      ...(legend.floatingColumns ? { columns: legend.floatingColumns } : {}),
      ...getLegendAlignment(legend),
      ...getLegendLayout(legend),
    }),
  };
}
