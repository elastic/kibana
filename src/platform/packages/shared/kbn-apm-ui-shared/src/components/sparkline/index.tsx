/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  AreaSeries,
  BarSeries,
  Chart,
  CurveType,
  LineSeries,
  ScaleType,
  Settings,
  Tooltip,
} from '@elastic/charts';
import { EuiIcon, EuiLoadingChart, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useChartThemes } from '../../hooks/use_chart_theme';
import { COMPARISON_CHART_THEME, DOTTED_LINE_STYLE, splitSeriesAtNullGaps } from './utils';
import type { SparklinePoint } from './utils';

const CHART_HEIGHT = 24;
const COMPACT_WIDTH = 64;
const DEFAULT_WIDTH = 80;

export interface SparklineProps {
  color: string;
  series?: SparklinePoint[] | null;
  comparisonSeries?: SparklinePoint[];
  comparisonSeriesColor?: string;
  type?: 'line' | 'bar';
  compact?: boolean;
  isLoading?: boolean;
}

function hasValidTimeseries(series?: SparklinePoint[] | null): series is SparklinePoint[] {
  return !!series?.some((point) => point.y !== null);
}

export function Sparkline({
  color,
  series,
  comparisonSeries = [],
  comparisonSeriesColor,
  type = 'line',
  compact = false,
  isLoading = false,
}: SparklineProps) {
  const { euiTheme } = useEuiTheme();
  const { theme: defaultTheme, baseTheme } = useChartThemes();
  const hasComparisonSeries = !!comparisonSeries?.length;

  const sparklineTheme = {
    chartMargins: { left: 0, right: 0, top: 0, bottom: 0 },
    lineSeriesStyle: { point: { opacity: 0 } },
    areaSeriesStyle: { point: { opacity: 0 } },
    ...(hasComparisonSeries ? COMPARISON_CHART_THEME : {}),
  };

  const chartSize = {
    height: CHART_HEIGHT,
    width: compact ? COMPACT_WIDTH : DEFAULT_WIDTH,
  };

  if (isLoading) {
    return (
      <div
        style={{ ...chartSize, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <EuiLoadingChart />
      </div>
    );
  }

  if (hasValidTimeseries(series)) {
    const { mainSegments, leadingEdge, trailingEdge, interiorEdges } =
      splitSeriesAtNullGaps(series);
    const comparisonSplit = hasComparisonSeries ? splitSeriesAtNullGaps(comparisonSeries) : null;

    return (
      <Chart size={chartSize}>
        <Settings
          theme={[sparklineTheme, ...defaultTheme]}
          baseTheme={baseTheme}
          showLegend={false}
          locale={i18n.getLocale()}
        />
        <Tooltip type="none" />

        {type === 'bar' ? (
          <>
            <BarSeries
              id="barSeries"
              xScaleType={ScaleType.Linear}
              yScaleType={ScaleType.Linear}
              xAccessor="x"
              yAccessors={['y']}
              data={series}
              color={color}
            />
            {hasComparisonSeries && (
              <BarSeries
                id="comparisonBarSeries"
                xScaleType={ScaleType.Linear}
                yScaleType={ScaleType.Linear}
                xAccessor="x"
                yAccessors={['y']}
                data={comparisonSeries}
                color={comparisonSeriesColor}
              />
            )}
          </>
        ) : (
          <>
            {leadingEdge && (
              <LineSeries
                id="edge_leading"
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor="x"
                yAccessors={['y']}
                data={leadingEdge}
                color={color}
                curve={CurveType.CURVE_MONOTONE_X}
                lineSeriesStyle={DOTTED_LINE_STYLE}
              />
            )}
            {trailingEdge && (
              <LineSeries
                id="edge_trailing"
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor="x"
                yAccessors={['y']}
                data={trailingEdge}
                color={color}
                curve={CurveType.CURVE_MONOTONE_X}
                lineSeriesStyle={DOTTED_LINE_STYLE}
              />
            )}
            {interiorEdges.map((edge, i) => (
              <LineSeries
                key={`edge_gap_${i}`}
                id={`edge_gap_${i}`}
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor="x"
                yAccessors={['y']}
                data={edge}
                color={color}
                curve={CurveType.CURVE_MONOTONE_X}
                lineSeriesStyle={DOTTED_LINE_STYLE}
              />
            ))}
            {mainSegments.map((segment, i) => (
              <LineSeries
                key={`seg_${i}`}
                id={`seg_${i}`}
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor="x"
                yAccessors={['y']}
                data={segment}
                color={color}
                curve={CurveType.CURVE_MONOTONE_X}
              />
            ))}
            {comparisonSplit && (
              <>
                {comparisonSplit.leadingEdge && (
                  <LineSeries
                    id="comparison_edge_leading"
                    xScaleType={ScaleType.Time}
                    yScaleType={ScaleType.Linear}
                    xAccessor="x"
                    yAccessors={['y']}
                    data={comparisonSplit.leadingEdge}
                    color={comparisonSeriesColor}
                    curve={CurveType.CURVE_MONOTONE_X}
                    lineSeriesStyle={DOTTED_LINE_STYLE}
                  />
                )}
                {comparisonSplit.trailingEdge && (
                  <LineSeries
                    id="comparison_edge_trailing"
                    xScaleType={ScaleType.Time}
                    yScaleType={ScaleType.Linear}
                    xAccessor="x"
                    yAccessors={['y']}
                    data={comparisonSplit.trailingEdge}
                    color={comparisonSeriesColor}
                    curve={CurveType.CURVE_MONOTONE_X}
                    lineSeriesStyle={DOTTED_LINE_STYLE}
                  />
                )}
                {comparisonSplit.interiorEdges.map((edge, i) => (
                  <LineSeries
                    key={`comparison_edge_gap_${i}`}
                    id={`comparison_edge_gap_${i}`}
                    xScaleType={ScaleType.Time}
                    yScaleType={ScaleType.Linear}
                    xAccessor="x"
                    yAccessors={['y']}
                    data={edge}
                    color={comparisonSeriesColor}
                    curve={CurveType.CURVE_MONOTONE_X}
                    lineSeriesStyle={DOTTED_LINE_STYLE}
                  />
                ))}
                {comparisonSplit.mainSegments.map((segment, i) => (
                  <AreaSeries
                    key={`comparison_seg_${i}`}
                    id={`comparison_seg_${i}`}
                    xScaleType={ScaleType.Time}
                    yScaleType={ScaleType.Linear}
                    xAccessor="x"
                    yAccessors={['y']}
                    data={segment}
                    color={comparisonSeriesColor}
                    curve={CurveType.CURVE_MONOTONE_X}
                  />
                ))}
              </>
            )}
          </>
        )}
      </Chart>
    );
  }

  return (
    <div style={{ ...chartSize, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <EuiIcon type="chartLine" color={euiTheme.colors.mediumShade} aria-hidden />
    </div>
  );
}
