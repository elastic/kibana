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
import type {
  XYConfig,
  XYLegendOutsideHorizontal,
  XYLegendOutsideVertical,
  XYLegendInside,
  XYLegendStatistic,
  XYLegendSize,
} from '../../../schema';
import { legendSizeCompat } from '../legend_sizes';
import { getReversibleMappings, stripUndefined } from '../utils';

const legendStatisticCompat = getReversibleMappings<XYLegendStatistic, XYLegendValue>([
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

function extractAlignment(legend: XYConfig['legend']):
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

function isOutsideListLegendLayout(legend: XYConfig['legend']) {
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

function getLegendTruncation(legend: XYConfig['legend']):
  | {
      max_lines?: number;
      enabled?: boolean;
    }
  | undefined {
  return legend && 'layout' in legend && legend.layout?.type === 'grid'
    ? legend.layout.truncate
    : undefined;
}

function getOutsideLegendSize(legend: XYConfig['legend']): XYLegendSize | undefined {
  return legend && 'size' in legend ? legend.size : undefined;
}

function convertSeriesHeaderFromAPI(
  legend?: XYConfig['legend']
): Partial<Pick<XYVisualizationState['legend'], 'title' | 'isTitleVisible'>> {
  const seriesHeader = legend && 'series_header' in legend ? legend.series_header : undefined;
  if (!seriesHeader) return {};

  const { text, visible } = seriesHeader;
  if (visible === false) {
    return { isTitleVisible: false, title: undefined };
  }
  if (text != null && text !== '') {
    return { isTitleVisible: true, title: text };
  }
  return { isTitleVisible: true, title: undefined };
}

export function convertLegendToStateFormat(legend: XYConfig['legend']): {
  legend: XYVisualizationState['legend'];
} {
  const isListLegendLayout = isOutsideListLegendLayout(legend);
  const legendTruncation = getLegendTruncation(legend);
  const truncateMaxLines = legendTruncation?.max_lines;
  const truncateEnabled = legendTruncation?.enabled;
  const outsideLegendSize = getOutsideLegendSize(legend);

  const newStateLegend: XYVisualizationState['legend'] = {
    ...convertSeriesHeaderFromAPI(legend),
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

function getLegendAlignment(
  legend: XYVisualizationState['legend']
): Pick<XYLegendInside, 'position'> {
  if (!legend.verticalAlignment && !legend.horizontalAlignment) {
    return {};
  }
  const position: XYLegendInside['position'] = `${legend.verticalAlignment ?? 'top'}_${
    legend.horizontalAlignment ?? 'right'
  }`;
  return {
    position,
  };
}

function getLegendLayout(
  legend: XYVisualizationState['legend']
): XYLegendInside | XYLegendOutsideHorizontal | XYLegendOutsideVertical {
  const { max_lines, enabled } = getApiLegendTruncate(legend);

  if (isLegendInside(legend)) {
    return {
      placement: 'inside',
      layout: {
        type: 'grid',
        truncate: stripUndefined({
          enabled,
          max_lines,
        }),
      },
      ...(legend.floatingColumns ? { columns: legend.floatingColumns } : {}),
      ...getLegendAlignment(legend),
    } satisfies XYLegendInside;
  }

  const isListLayout = isOutsideListLegendLayoutState(legend);

  const position = legend.position ?? DEFAULT_LEGEND_POSITON;
  const isVerticalPosition = ['left', 'right'].includes(position);

  return stripUndefined({
    placement: 'outside',
    position,
    size: isVerticalPosition ? legendSizeCompat.toAPI(legend.legendSize) : undefined,
    layout: isListLayout
      ? {
          type: 'list',
        }
      : {
          type: 'grid',
          truncate: stripUndefined({
            enabled,
            max_lines,
          }),
        },
  }) satisfies XYLegendOutsideHorizontal | XYLegendOutsideVertical;
}

function getApiLegendTruncate(
  legend: Pick<XYVisualizationState['legend'], 'shouldTruncate' | 'maxLines'>
): {
  max_lines?: number;
  enabled?: boolean;
} {
  if (!legend) return {};

  const { shouldTruncate, maxLines } = legend;

  return {
    max_lines: maxLines ?? 1,
    ...(shouldTruncate !== undefined ? { enabled: shouldTruncate } : {}),
  };
}

function convertSeriesHeaderToAPIFormat(
  legend: XYVisualizationState['legend']
): Pick<XYLegendInside, 'series_header'> {
  const { title, isTitleVisible } = legend;
  if (isTitleVisible === false) {
    return { series_header: stripUndefined({ visible: false, text: undefined }) };
  }
  if (title != null && title !== '') {
    return { series_header: stripUndefined({ visible: true, text: title }) };
  }
  if (isTitleVisible === true) {
    return { series_header: stripUndefined({ visible: true, text: undefined }) };
  }
  return {};
}

export function convertLegendToAPIFormat(
  legend: XYVisualizationState['legend']
): Pick<XYConfig, 'legend'> {
  const visibility = !legend.isVisible ? 'hidden' : legend.showSingleSeries ? 'auto' : 'visible';
  const statistics = legend.legendStats?.length
    ? legend.legendStats.map((stat) => legendStatisticCompat.toAPI(stat))
    : undefined;

  return {
    legend: stripUndefined({
      ...convertSeriesHeaderToAPIFormat(legend),
      ...getLegendAlignment(legend),
      ...getLegendLayout(legend),
      visibility,
      statistics,
    }),
  } satisfies Pick<XYConfig, 'legend'>;
}
