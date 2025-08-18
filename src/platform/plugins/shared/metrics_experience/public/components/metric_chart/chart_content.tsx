/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexItem, EuiText, EuiLoadingChart } from '@elastic/eui';
import React from 'react';
import { TimeSeriesChart } from './time_series_chart';

interface ChartContentProps {
  isLoading: boolean;
  error: Error | null;
  data:
    | Array<{ x: number; y: number }>
    | Array<{ key: string; data: Array<{ x: number; y: number }> }>;
  metricName: string;
  isSupported: boolean;
  unit?: string;
  hasDimensions: boolean;
  chartType?: string;
  timeRange: { from?: string; to?: string };
  colorIndex?: number;
  displayDensity?: 'normal' | 'compact' | 'row';
}

export const ChartContent = ({
  isLoading,
  error,
  data,
  metricName,
  isSupported,
  unit,
  hasDimensions: _hasDimensions,
  chartType,
  timeRange,
  colorIndex,
  displayDensity = 'normal',
}: ChartContentProps) => {
  // TODO: replace with value from useEuiTheme OR useKibana
  const colorMode = 'light';

  // Get chart height based on display density
  const getChartHeight = () => {
    if (displayDensity !== 'normal') {
      return 100;
    }
    return 150; // normal and row use same height
  };

  if (!isSupported) {
    return (
      <EuiText color="subdued" textAlign="center">
        <p>This metric type is unsupported</p>
      </EuiText>
    );
  }

  if (isLoading) {
    return (
      <EuiFlexItem
        style={{
          height: getChartHeight(),
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
          height: getChartHeight(),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EuiText color="danger" textAlign="center">
          {error.message}
        </EuiText>
      </EuiFlexItem>
    );
  }

  return (
    <div style={{ width: '100%', height: getChartHeight() }}>
      <TimeSeriesChart
        data={data}
        timeRange={timeRange}
        colorMode={colorMode}
        height={getChartHeight()}
        width="100%"
        isLoading={isLoading}
        error={error ? (error as Error).message : null}
        chartType={(chartType as 'area' | 'line' | 'bar') || 'area'}
        metricName={metricName}
        unit={unit}
        showLegend={false}
        colorIndex={colorIndex}
      />
    </div>
  );
};
