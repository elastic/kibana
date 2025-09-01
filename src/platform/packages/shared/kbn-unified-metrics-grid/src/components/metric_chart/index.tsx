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
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import { useMetricDataQuery } from '../../hooks';
import { ChartContent } from './chart_content';
import { ChartHeader } from './chart_header';

interface MetricChartProps {
  metric: MetricField;
  timeRange: { from?: string; to?: string };
  byDimension?: string;
  dimensions: string[];
  colorIndex?: number;
  size?: 'm' | 's';
  filters?: Array<{ field: string; value: string }>;
}

export const MetricChart = ({
  metric,
  timeRange,
  byDimension,
  dimensions = [],
  colorIndex,
  size = 'm',
  filters = [],
}: MetricChartProps) => {
  const isSupported = metric.type !== 'unsigned_long' && metric.type !== 'histogram';

  const {
    data: queryData,
    isLoading,
    error,
  } = useMetricDataQuery({
    metricName: isSupported ? metric.name : '',
    timeRange,
    instrument: metric.instrument,
    index: metric.index,
    dimensions,
    filters,
  });

  const data = useMemo(() => queryData?.data || [], [queryData?.data]);
  const hasDimensions = queryData?.hasDimensions || false;

  return (
    <EuiPanel grow={false} hasBorder={true} style={{ width: '100%', minWidth: 0 }}>
      <ChartHeader title={metric.name} byDimension={byDimension} metric={metric} size={size} />
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
        size={size}
      />
    </EuiPanel>
  );
};
