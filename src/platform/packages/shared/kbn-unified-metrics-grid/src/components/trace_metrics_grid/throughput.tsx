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

type ThroughputChartContentProps = NonNullable<ReturnType<typeof getThroughputChart>> & {
  fieldName: string;
};

const ThroughputChartContent = ({
  esqlQuery,
  seriesType,
  unit,
  color,
  title,
  fieldName,
}: ThroughputChartContentProps) => {
  const { services, fetchParams, discoverFetch$, indexes, onBrushEnd, onFilter } =
    useTraceMetricsContext();

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
      fetchParams={fetchParams}
      services={services}
      onBrushEnd={onBrushEnd}
      onFilter={onFilter}
      title={title}
      chartLayers={chartLayers}
      syncTooltips
      syncCursor
    />
  );
};

export const ThroughputChart = () => {
  const { filters, dataSource, indexes } = useTraceMetricsContext();
  const fieldName = dataSource === 'apm' ? TRANSACTION_ID : SPAN_ID;
  const throughputChart = getThroughputChart({
    dataSource,
    indexes,
    filters,
    fieldName,
  });

  if (!throughputChart) {
    return null;
  }

  return <ThroughputChartContent {...throughputChart} fieldName={fieldName} />;
};
