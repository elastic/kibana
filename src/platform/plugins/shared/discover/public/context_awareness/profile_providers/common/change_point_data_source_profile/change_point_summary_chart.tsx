/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import type { PartialTheme } from '@elastic/charts';
import {
  AnnotationDomainType,
  Chart,
  LineAnnotation,
  LineSeries,
  ScaleType,
  Settings,
  Tooltip,
  TooltipType,
} from '@elastic/charts';
import { useEuiTheme, EuiScreenReaderOnly } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { ChangePointSeriesPoint } from './change_point_summary_series_helpers';

const miniChartTheme: PartialTheme = {
  chartMargins: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  chartPaddings: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  background: {
    color: 'transparent',
  },
};

/**
 * Widen the x-axis so a change-point marker at the start/end is not clipped
 * (these sparklines use zero chart margins).
 */
export const getSparklineXDomain = (
  points: Array<{ x: number }>,
  annotationTime?: number
): { min: number; max: number } | undefined => {
  if (points.length === 0) return undefined;

  let min = points[0].x;
  let max = points[0].x;
  for (let i = 1; i < points.length; i++) {
    const x = points[i].x;
    if (x < min) min = x;
    if (x > max) max = x;
  }

  if (annotationTime !== undefined) {
    if (annotationTime < min) min = annotationTime;
    if (annotationTime > max) max = annotationTime;
  }

  const pad = Math.max((max - min) * 0.02, 1);
  return { min: min - pad, max: max + pad };
};

export interface ChangePointSummaryChartProps {
  charts: ChartsPluginStart;
  points: ChangePointSeriesPoint[];
  /** Epoch ms for this row's change point, when known. */
  annotationTime?: number;
}

/** Tiny display-only sparkline: series + optional change-point marker. */
const ChangePointSummaryChartComponent: FC<ChangePointSummaryChartProps> = ({
  charts,
  points,
  annotationTime,
}) => {
  const chartBaseTheme = charts.theme.useChartsBaseTheme();
  const sparklineOverrides = charts.theme.useSparklineOverrides();
  const { euiTheme } = useEuiTheme();

  const annotationData = useMemo(
    () => (annotationTime !== undefined ? [{ dataValue: annotationTime }] : []),
    [annotationTime]
  );

  const xDomain = useMemo(
    () => getSparklineXDomain(points, annotationTime),
    [points, annotationTime]
  );

  if (points.length === 0) {
    return null;
  }

  const screenReaderSummary =
    annotationTime !== undefined
      ? i18n.translate(
          'discover.contextAwareness.changePointSummaryChart.screenReaderSummaryWithMarker',
          {
            defaultMessage:
              'Change point sparkline with {pointCount} {pointCount, plural, one {point} other {points}} and a change point marker.',
            values: { pointCount: points.length },
          }
        )
      : i18n.translate('discover.contextAwareness.changePointSummaryChart.screenReaderSummary', {
          defaultMessage:
            'Change point sparkline with {pointCount} {pointCount, plural, one {point} other {points}}.',
          values: { pointCount: points.length },
        });

  return (
    <div css={{ pointerEvents: 'none', width: '100%', height: '100%', minWidth: 0, minHeight: 0 }}>
      <Chart>
        <Tooltip type={TooltipType.None} />
        <Settings
          theme={[miniChartTheme, sparklineOverrides]}
          baseTheme={chartBaseTheme}
          showLegend={false}
          locale={i18n.getLocale()}
          xDomain={xDomain}
        />
        <LineSeries
          id="changePointSummarySeries"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={points}
          // Match Lens XY default series color in the main change-point view.
          color={chartBaseTheme.colors.defaultVizColor}
        />
        {annotationData.length > 0 ? (
          <LineAnnotation
            id="changePointSummaryAnnotation"
            hideTooltips
            domainType={AnnotationDomainType.XDomain}
            dataValues={annotationData}
            style={{
              line: {
                strokeWidth: 1,
                stroke: euiTheme.colors.danger,
                opacity: 1,
              },
            }}
          />
        ) : null}
      </Chart>
      <EuiScreenReaderOnly>
        <span>{screenReaderSummary}</span>
      </EuiScreenReaderOnly>
    </div>
  );
};

export const ChangePointSummaryChart = memo(ChangePointSummaryChartComponent);
