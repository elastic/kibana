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

export const LatencyChart = () => {
  const {
    filters,
    requestParams,
    services,
    abortController,
    discoverFetch$,
    searchSessionId,
    dataSource,
    indexes,
    onBrushEnd,
    onFilter,
  } = useTraceMetricsContext();

  const { esqlQuery, seriesType, unit, color, title } = getLatencyChart({
    dataSource,
    indexes,
    filters,
  });

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
      requestParams={requestParams}
      services={services}
      abortController={abortController}
      searchSessionId={searchSessionId}
      onBrushEnd={onBrushEnd}
      onFilter={onFilter}
      title={title}
      chartLayers={chartLayers}
      syncCursor
      syncTooltips
    />
  );
};
