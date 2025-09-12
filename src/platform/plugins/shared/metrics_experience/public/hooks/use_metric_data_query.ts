/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * THIS FILE IS TEMPORARY! IT WILL BE DELETED ONCE WE IMPLIMENT LENS EMBEDDABLES
 * FOR THE METRIC CHARTS
 */

import dateMath from '@elastic/datemath';
import { useQuery } from '@tanstack/react-query';
import { createESQLQuery } from '../utils/create_esql_query';
import { useMetricsExperience } from './use_metrics_experience';
import type { MetricsExperienceClient } from '../api';

interface ChartData {
  x: number;
  y: number;
}

interface SeriesData {
  key: string;
  data: ChartData[];
}

interface MetricDataResult {
  data: ChartData[] | SeriesData[];
  esqlQuery: string;
  hasDimensions: boolean;
}

interface UseMetricDataParams {
  metricName?: string;
  esqlQuery?: string;
  timeRange: { from?: string; to?: string };
  timeSeriesMetric?: string;
  index?: string;
  dimensions?: string[];
  filters?: Array<{ field: string; value: string }>;
  client: MetricsExperienceClient;
}

const fetchMetricData = async ({
  client,
  metricName,
  esqlQuery,
  timeRange,
  timeSeriesMetric,
  index,
  dimensions,
  filters,
}: UseMetricDataParams) => {
  // Convert EUI date strings to ISO strings for API
  const fromDate = dateMath.parse(timeRange.from || 'now-1h');
  const toDate = dateMath.parse(timeRange.to || 'now', { roundUp: true });

  if (!fromDate || !toDate) {
    throw new Error('Invalid date range');
  }

  // Use provided ESQL query or generate one from metric parameters
  const esql =
    esqlQuery ||
    createESQLQuery({
      metricName: metricName!,
      timeSeriesMetric,
      index,
      dimensions,
      filters,
    });

  const response = await client.postData({
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    esql,
    filters: filters || [], // Include filters array
  });

  return {
    data: (response?.data || []) as MetricDataResult['data'],
    esqlQuery: response?.esql || '',
    hasDimensions: response?.hasDimensions || false,
  };
};

export const useMetricDataQuery = ({
  metricName,
  esqlQuery,
  timeRange,
  timeSeriesMetric,
  index,
  dimensions,
  filters,
}: Omit<UseMetricDataParams, 'client'>) => {
  const { client } = useMetricsExperience();

  return useQuery({
    queryKey: [
      'metricData',
      metricName,
      esqlQuery,
      timeRange.from,
      timeRange.to,
      timeSeriesMetric,
      index,
      dimensions,
      filters,
    ],
    queryFn: () =>
      fetchMetricData({
        client,
        metricName,
        esqlQuery,
        timeRange,
        timeSeriesMetric,
        index,
        dimensions,
        filters,
      }),
    enabled: Boolean(metricName || esqlQuery), // Run query if either metricName or esqlQuery is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
