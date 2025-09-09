/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  Chart,
  Settings,
  AreaSeries,
  LineSeries,
  BarSeries,
  Axis,
  ScaleType,
  LIGHT_THEME,
  DARK_THEME,
  niceTimeFormatter,
} from '@elastic/charts';
import dateMath from '@elastic/datemath';
import { EuiFlexItem, EuiText, EuiLoadingChart, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { getValueFormatter } from '../../utils';

interface ChartData {
  x: number;
  y: number;
}

interface SeriesData {
  key: string | Record<string, string>;
  data: ChartData[];
}

interface TimeSeriesChartProps {
  data: ChartData[] | SeriesData[];
  timeRange: { from?: string; to?: string };
  colorMode: 'light' | 'dark';
  height?: number;
  width?: string;
  isLoading?: boolean;
  error?: string | null;
  chartType?: 'area' | 'line' | 'bar';
  metricName?: string;
  unit?: string;
  showLegend?: boolean;
  colorIndex?: number;
}

export const TimeSeriesChart = ({
  data,
  timeRange,
  colorMode,
  height = 150,
  width = '100%',
  isLoading = false,
  error = null,
  chartType = 'area',
  metricName = 'metric',
  unit,
  showLegend = false,
  colorIndex,
}: TimeSeriesChartProps) => {
  const { euiTheme } = useEuiTheme();

  // Create array of EUI vis colors for cycling
  const visColors = [
    euiTheme.colors.vis.euiColorVis0,
    euiTheme.colors.vis.euiColorVis1,
    euiTheme.colors.vis.euiColorVis2,
    euiTheme.colors.vis.euiColorVis3,
    euiTheme.colors.vis.euiColorVis4,
    euiTheme.colors.vis.euiColorVis5,
    euiTheme.colors.vis.euiColorVis6,
    euiTheme.colors.vis.euiColorVis7,
    euiTheme.colors.vis.euiColorVis8,
    euiTheme.colors.vis.euiColorVis9,
  ];

  // Get color for this chart (cycle through colors if colorIndex provided)
  const chartColor =
    colorIndex !== undefined ? visColors[colorIndex % visColors.length] : undefined;
  // Value formatter
  const valueFormatter = getValueFormatter(unit);

  // Check if we have multi-series data
  const hasDimensions = data.length > 0 && typeof data[0] === 'object' && 'key' in data[0];

  if (isLoading) {
    return (
      <EuiFlexItem
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EuiLoadingChart size="m" />
      </EuiFlexItem>
    );
  }

  if (error) {
    return (
      <EuiFlexItem
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EuiText color="danger" textAlign="center">
          {error}
        </EuiText>
      </EuiFlexItem>
    );
  }

  // Use date picker range for x-axis bounds - parse datemath expressions
  const startDate = dateMath.parse(timeRange.from || 'now-1h');
  const endDate = dateMath.parse(timeRange.to || 'now');

  const xBounds: [number, number] = [
    startDate?.valueOf() || Date.now() - 86400000, // fallback to 24h ago if parsing fails
    endDate?.valueOf() || Date.now(), // fallback to now if parsing fails
  ];

  return (
    <EuiFlexItem style={{ height }}>
      <Chart size={{ height, width }}>
        <Settings
          baseTheme={colorMode === 'light' ? LIGHT_THEME : DARK_THEME}
          xDomain={{ min: xBounds[0], max: xBounds[1] }}
          showLegend={showLegend}
        />
        <Axis
          id="bottom"
          position="bottom"
          gridLine={{ visible: true, stroke: '#e0e0e0', strokeWidth: 1 }}
          tickFormat={niceTimeFormatter(xBounds)}
        />
        <Axis id="left" position="left" gridLine={{ visible: false }} tickFormat={valueFormatter} />
        {hasDimensions
          ? // Render multiple series for dimensions
            (data as SeriesData[]).map((series) => {
              // Serialize key for React and display purposes
              const seriesKey =
                typeof series.key === 'object' ? JSON.stringify(series.key) : series.key;
              const displayName =
                typeof series.key === 'object' ? Object.values(series.key).join(' - ') : series.key;

              if (chartType === 'bar') {
                return (
                  <BarSeries
                    key={seriesKey}
                    id={`${metricName}-${seriesKey}`}
                    name={displayName}
                    data={series.data}
                    xAccessor="x"
                    yAccessors={['y']}
                    xScaleType={ScaleType.Time}
                    stackAccessors={['x']}
                  />
                );
              }
              return (
                <LineSeries
                  key={seriesKey}
                  id={`${metricName}-${seriesKey}`}
                  name={displayName}
                  data={series.data}
                  xAccessor="x"
                  yAccessors={['y']}
                  xScaleType={ScaleType.Time}
                />
              );
            })
          : // Render single series for no dimensions
            (() => {
              if (chartType === 'bar') {
                return (
                  <BarSeries
                    id={metricName}
                    data={data as ChartData[]}
                    xAccessor="x"
                    yAccessors={['y']}
                    xScaleType={ScaleType.Time}
                    color={chartColor}
                  />
                );
              }
              if (chartType === 'line') {
                return (
                  <LineSeries
                    id={metricName}
                    data={data as ChartData[]}
                    xAccessor="x"
                    yAccessors={['y']}
                    xScaleType={ScaleType.Time}
                    color={chartColor}
                  />
                );
              }
              return (
                <AreaSeries
                  id={metricName}
                  data={data as ChartData[]}
                  xAccessor="x"
                  yAccessors={['y']}
                  xScaleType={ScaleType.Time}
                  color={chartColor}
                />
              );
            })()}
      </Chart>
    </EuiFlexItem>
  );
};
