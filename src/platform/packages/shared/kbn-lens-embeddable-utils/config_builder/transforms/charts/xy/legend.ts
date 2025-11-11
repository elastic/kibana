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

function isMappedStatistic(stat: StatisticsType): stat is keyof typeof StatsAPIToOldState {
  return stat in StatsAPIToOldState;
}

function mapStatToCamelCase(stat: StatisticsType): XYLegendValue {
  if (isMappedStatistic(stat)) {
    return StatsAPIToOldState[stat];
  }
  return stat;
}

const DEFAULT_LEGEND_POSITON = 'right';

function extractAlignment(legend: XYState['legend']): {
  verticalAlignment: 'top' | 'bottom' | undefined;
  horizontalAlignment: 'left' | 'right' | undefined;
} {
  if (legend?.inside) {
    const [verticalAlignment, horizontalAlignment] = (legend.alignment?.split('_') ?? [
      'top',
      'right',
    ]) as ['top' | 'bottom' | undefined, 'left' | 'right' | undefined];
    return { verticalAlignment, horizontalAlignment };
  }
  return { verticalAlignment: undefined, horizontalAlignment: undefined };
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
      return;
  }
}

export function convertLegendToStateFormat(legend: XYState['legend']): {
  legend: XYLensState['legend'];
} {
  const newStateLegend: XYLensState['legend'] = {
    isVisible: Boolean(legend?.visible),
    shouldTruncate: Boolean(legend?.truncate_after_lines), // 0 will be interpreted as false
    maxLines: legend?.truncate_after_lines,
    legendStats: (legend?.statistics ?? []).map(mapStatToCamelCase),
    layout: legend?.statistics?.length ? LegendLayout.Table : LegendLayout.List,
    ...extractAlignment(legend),
    ...(legend?.inside
      ? {
          position: DEFAULT_LEGEND_POSITON,
          legendSize: undefined,
          floatingColumns: legend?.columns,
        }
      : {
          position: legend?.position ?? DEFAULT_LEGEND_POSITON,
          legendSize: getLegendSize(legend?.size),
          floatingColumns: undefined,
        }),
  };

  return { legend: newStateLegend };
}
