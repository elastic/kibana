/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { ChartContent } from './chart_content';
import { ChartHeader } from './chart_header';
import type { MetricField } from '../../types';
import { createESQLQuery } from '../../utils/create_esql_query';

interface MetricChartProps {
  metric: MetricField;
  timeRange: { from?: string; to?: string };
  byDimension?: string;
  dimensions?: Array<string>;
  colorIndex?: number;
  displayDensity?: 'normal' | 'compact' | 'row';
  filters?: Array<{ field: string; value: string }>;
  headerActions?: {
    hasExploreAction?: boolean;
    hasMetricsInsightsAction?: boolean;
  };
}

export const MetricChart: React.FC<MetricChartProps> = ({
  metric,
  timeRange,
  byDimension,
  dimensions = [],
  colorIndex,
  displayDensity = 'normal',
  filters = [],
  headerActions,
}) => {
  // Hardcoded data for demo
  const data = [
    { x: Date.now() - 3600000, y: Math.random() * 100 },
    { x: Date.now() - 1800000, y: Math.random() * 100 },
    { x: Date.now(), y: Math.random() * 100 },
  ];
  const isSupported = true;
  const hasDimensions = false;
  const error = null;
  const isLoading = false;

  // Generate ESQL query using the same logic as the hook
  const esqlQuery = useMemo(() => {
    if (!isSupported) return '';
    return createESQLQuery({
      metricName: metric.name,
      timeSeriesMetric: metric.timeSeriesMetric,
      index: metric.index,
      dimensions,
      filters,
    });
  }, [isSupported, metric.name, metric.timeSeriesMetric, metric.index, dimensions, filters]);

  return (
    <EuiPanel grow={false} hasBorder={true} style={{ width: '100%', minWidth: 0 }}>
      <ChartHeader
        title={metric.name}
        byDimension={byDimension}
        esqlQuery={esqlQuery}
        metric={metric}
        displayDensity={displayDensity}
        hasExploreAction={headerActions?.hasExploreAction ?? true}
        hasMetricsInsightsAction={headerActions?.hasMetricsInsightsAction ?? true}
      />
      <EuiSpacer size="m" />
      <ChartContent
        isLoading={isLoading}
        error={error}
        data={data}
        metricName={metric.name}
        isSupported={isSupported}
        unit={metric.unit}
        hasDimensions={hasDimensions}
        chartType="area"
        timeRange={timeRange}
        colorIndex={colorIndex}
        displayDensity={displayDensity}
      />
    </EuiPanel>
  );
};
