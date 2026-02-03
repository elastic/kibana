/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useTraceMetricsContext } from '../../context/trace_metrics_context';
import { Chart } from '../chart';
import { useChartLayers } from '../chart/hooks/use_chart_layers';
import { getLatencyChart } from './trace_charts_definition';

type LatencyChartContentProps = NonNullable<ReturnType<typeof getLatencyChart>>;

const LatencyChartContent = ({
  esqlQuery,
  seriesType,
  unit,
  color,
  title,
}: LatencyChartContentProps) => {
  const { services, fetchParams, discoverFetch$, indexes, onBrushEnd, onFilter } =
    useTraceMetricsContext();

  const chartLayers = useChartLayers({
    metric: {
      name: 'duration_ms',
      instrument: 'histogram',
      unit,
      index: indexes,
      dimensions: [],
      type: 'metric',
    },
    color,
    seriesType,
  });

  return (
    <Chart
      esqlQuery={esqlQuery}
      size="s"
      discoverFetch$={discoverFetch$}
      fetchParams={fetchParams}
      services={services}
      onBrushEnd={onBrushEnd}
      onFilter={onFilter}
      title={title}
      chartLayers={chartLayers}
      syncCursor
      syncTooltips
    />
  );
};

export const LatencyChart = () => {
  const { filters, dataSource, indexes } = useTraceMetricsContext();

  const latencyChart = getLatencyChart({
    dataSource,
    indexes,
    filters,
  });

  if (!latencyChart) {
    return null;
  }

  return <LatencyChartContent {...latencyChart} />;
};
