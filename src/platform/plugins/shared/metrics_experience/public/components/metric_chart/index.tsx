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
import { useMetricDataQuery } from '../../hooks';
import type { MetricField } from '../../../common/fields/types';
import { createESQLQuery } from '../../utils';
import { ChartContent } from './chart_content';
import { ChartHeader } from './chart_header';

interface MetricChartProps {
  metric: MetricField;
  timeRange: { from?: string; to?: string };
  byDimension?: string;
  dimensions: string[];
  colorIndex?: number;
  displayDensity?: 'normal' | 'compact' | 'row';
  filters?: Array<{ field: string; value: string }>;
}

export const MetricChart: React.FC<MetricChartProps> = ({
  metric,
  timeRange,
  byDimension,
  dimensions = [],
  colorIndex,
  displayDensity = 'normal',
  filters = [],
}) => {
  const isSupported = metric.type !== 'unsigned_long' && metric.type !== 'histogram';

  // Generate ESQL query using the same logic as the hook
  const esqlQuery = useMemo(() => {
    if (!isSupported) return '';
    return createESQLQuery({
      metricName: metric.name,
      timeSeriesMetric: metric.instrument,
      index: metric.index,
      dimensions,
      filters,
    });
  }, [isSupported, metric.name, metric.instrument, metric.index, dimensions, filters]);

  const {
    data: queryData,
    isLoading,
    error,
  } = useMetricDataQuery({
    metricName: isSupported ? metric.name : '',
    timeRange,
    timeSeriesMetric: metric.instrument,
    index: metric.index,
    dimensions,
    filters,
  });

  const data = useMemo(() => queryData?.data || [], [queryData?.data]);
  const hasDimensions = queryData?.hasDimensions || false;

  return (
    <EuiPanel grow={false} hasBorder={true} style={{ width: '100%', minWidth: 0 }}>
      <ChartHeader
        title={metric.name}
        byDimension={byDimension}
        esqlQuery={esqlQuery}
        metric={metric}
        displayDensity={displayDensity}
      />
      <EuiSpacer size="m" />
      <ChartContent
        isLoading={isLoading}
        error={error as Error}
        data={data}
        metricName={metric.name}
        isSupported={isSupported}
        unit={metric.unit}
        hasDimensions={hasDimensions}
        chartType={metric.display}
        timeRange={timeRange}
        colorIndex={colorIndex}
        displayDensity={displayDensity}
      />
    </EuiPanel>
  );
};
