/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexItem, EuiText, EuiLoadingChart } from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { TimeSeriesChart } from './time_series_chart';
import type { ChartData, SeriesData } from '../../hooks/use_metric_data_query';

interface ChartContentProps {
  isLoading: boolean;
  error: Error | null;
  data: ChartData[] | SeriesData[];
  metricName: string;
  isSupported: boolean;
  unit?: string;
  hasDimensions: boolean;
  chartType?: string;
  timeRange: { from?: string; to?: string };
  colorIndex?: number;
  size?: 'm' | 's';
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
  size = 'm',
}: ChartContentProps) => {
  // TODO: replace with value from useEuiTheme OR useKibana
  const colorMode = 'light';

  // Get chart height based on display density
  const chartHeight = useMemo(() => {
    if (size !== 'm') {
      return 100;
    }
    return 150; // normal and row use same height
  }, [size]);

  if (!isSupported) {
    return (
      <EuiText color="subdued" textAlign="center">
        <p>
          {i18n.translate('metricsExperience.chartContent.p.thisMetricTypeIsLabel', {
            defaultMessage: 'This metric type is unsupported',
          })}
        </p>
      </EuiText>
    );
  }

  if (isLoading) {
    return (
      <EuiFlexItem
        style={{
          height: chartHeight,
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
          height: chartHeight,
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
    <div style={{ width: '100%', height: chartHeight }}>
      <TimeSeriesChart
        data={data}
        timeRange={timeRange}
        colorMode={colorMode}
        height={chartHeight}
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
