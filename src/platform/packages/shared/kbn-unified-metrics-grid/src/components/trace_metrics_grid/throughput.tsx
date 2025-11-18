/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SPAN_ID, TRANSACTION_ID } from '@kbn/apm-types';
import React from 'react';
import { useTraceMetricsContext } from '../../context/trace_metrics_context';
import { Chart } from '../chart';
import { useChartLayers } from '../chart/hooks/use_chart_layers';
import { getThroughputChart } from './trace_charts_definition';

export const ThroughputChart = () => {
  const {
    filters,
    timeRange,
    services,
    abortController,
    discoverFetch$,
    searchSessionId,
    dataSource,
    indexes,
    onBrushEnd,
    onFilter,
  } = useTraceMetricsContext();
  const fieldName = dataSource === 'apm' ? TRANSACTION_ID : SPAN_ID;

  const { esqlQuery, seriesType, unit, color, title } = getThroughputChart({
    dataSource,
    indexes,
    filters,
    fieldName,
  });

  const chartLayers = useChartLayers({
    metric: {
      name: fieldName,
      instrument: 'histogram',
      unit,
      index: indexes,
      dimensions: [],
      type: 'metric',
    },
    color,
    seriesType,
    customFunction: 'COUNT',
  });

  return (
    <Chart
      esqlQuery={esqlQuery}
      size="s"
      discoverFetch$={discoverFetch$}
      timeRange={timeRange}
      services={services}
      abortController={abortController}
      searchSessionId={searchSessionId}
      onBrushEnd={onBrushEnd}
      onFilter={onFilter}
      title={title}
      chartLayers={chartLayers}
      syncTooltips
      syncCursor
    />
  );
};
