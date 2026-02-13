/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { useTraceMetricsContext } from './context/trace_metrics_context';
import { Chart } from '../../chart';
import { useChartLayers } from '../../chart/hooks/use_chart_layers';
import { ACTION_OPEN_IN_DISCOVER } from '../../../common/constants';
import { getLatencyChart } from './trace_charts_definition';

type LatencyChartContentProps = NonNullable<ReturnType<typeof getLatencyChart>>;

const LatencyChartContent = ({
  esqlQuery,
  seriesType,
  unit,
  color,
  title,
}: LatencyChartContentProps) => {
  const { services, fetchParams, discoverFetch$, indexes, onBrushEnd, onFilter, actions } =
    useTraceMetricsContext();

  const chartLayers = useChartLayers({
    metric: {
      name: 'duration_ms',
      instrument: 'histogram',
      unit,
      index: indexes,
      dimensions: [],
      type: ES_FIELD_TYPES.DOUBLE,
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
      onExploreInDiscoverTab={actions.openInNewTab}
      title={title}
      chartLayers={chartLayers}
      syncCursor
      syncTooltips
      extraDisabledActions={[ACTION_OPEN_IN_DISCOVER]}
    />
  );
};

export const LatencyChart = () => {
  const { filters, indexes, metadataFields } = useTraceMetricsContext();

  const latencyChart = getLatencyChart({
    indexes,
    filters,
    metadataFields,
  });

  if (!latencyChart) {
    return null;
  }

  return <LatencyChartContent {...latencyChart} />;
};
