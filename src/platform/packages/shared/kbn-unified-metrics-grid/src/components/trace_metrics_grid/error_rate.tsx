/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { LensYBoundsConfig } from '@kbn/lens-embeddable-utils/config_builder/types';
import { useTraceMetricsContext } from '../../context/trace_metrics_context';
import { Chart } from '../chart';
import { useChartLayersFromEsql } from '../chart/hooks/use_chart_layers_from_esql';
import { getErrorRateChart } from './trace_charts_definition';

const ERROR_RATE_Y_BOUNDS: LensYBoundsConfig = { mode: 'custom', lowerBound: 0, upperBound: 1 };

export const ErrorRateChart = () => {
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

  const { esqlQuery, seriesType, unit, color, title } = getErrorRateChart({
    dataSource,
    indexes,
    filters,
  });

  const chartLayers = useChartLayersFromEsql({
    query: esqlQuery,
    seriesType,
    services,
    timeRange,
    unit,
    color,
    abortController,
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
      syncCursor
      syncTooltips
      yBounds={ERROR_RATE_Y_BOUNDS}
    />
  );
};
