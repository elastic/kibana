/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useEffect } from 'react';

import { EuiThemeComputed, useEuiTheme } from '@elastic/eui';
import type { HistogramItem } from '@kbn/apm-types-shared';
import { DurationDistributionChartData } from '@kbn/apm-ui-shared';
import { useAbortableAsync } from '@kbn/react-hooks';
import { getUnifiedDocViewerServices } from '../../../../../../plugin';

interface GetSpanDistributionChartDataParams {
  euiTheme: EuiThemeComputed;
  spanHistogram?: HistogramItem[];
}

export const getSpanDistributionChartData = ({
  euiTheme,
  spanHistogram,
}: GetSpanDistributionChartDataParams): DurationDistributionChartData[] =>
  Array.isArray(spanHistogram)
    ? [
        {
          id: i18n.translate(
            'unifiedDocViewer.observability.traces.useSpanLatencyChart.allSpansLabel',
            {
              defaultMessage: 'All spans',
            }
          ),
          histogram: spanHistogram,
          areaSeriesColor: euiTheme.colors.vis.euiColorVis1,
        },
      ]
    : [];

interface GetLatencyChartParams {
  core: CoreStart;
  signal: AbortSignal;
  spanName: string;
  serviceName: string;
  isOtelSpan: boolean;
}

const getSpanLatencyChart = ({
  core,
  signal,
  spanName,
  serviceName,
  isOtelSpan,
}: GetLatencyChartParams): Promise<{
  overallHistogram?: HistogramItem[];
  percentileThresholdValue?: number;
}> => {
  const { data } = getUnifiedDocViewerServices();
  const timeFilter = data.query.timefilter.timefilter.getAbsoluteTime();

  return core.http.post('/internal/apm/latency/overall_distribution/spans', {
    body: JSON.stringify({
      spanName,
      serviceName,
      chartType: 'spanLatency',
      isOtel: isOtelSpan,
      end: timeFilter.to,
      environment: 'ENVIRONMENT_ALL',
      kuery: '',
      percentileThreshold: 95,
      start: timeFilter.from,
    }),
    signal,
  });
};

interface SpanLatencyChartData {
  spanDistributionChartData: DurationDistributionChartData[];
  percentileThresholdValue?: number;
}

interface UseSpanLatencyChartParams {
  spanName: string;
  serviceName: string;
  isOtelSpan?: boolean;
}

export const useSpanLatencyChart = ({
  spanName,
  serviceName,
  isOtelSpan = false,
}: UseSpanLatencyChartParams) => {
  const { core } = getUnifiedDocViewerServices();
  const { euiTheme } = useEuiTheme();

  const { loading, value, error } = useAbortableAsync(
    async ({ signal }) => {
      if (!spanName || !serviceName) {
        return null;
      }

      const result = await getSpanLatencyChart({
        core,
        signal,
        spanName,
        serviceName,
        isOtelSpan,
      });

      return {
        spanDistributionChartData: getSpanDistributionChartData({
          euiTheme,
          spanHistogram: result.overallHistogram,
        }),
        percentileThresholdValue: result.percentileThresholdValue,
      };
    },
    [core, euiTheme, serviceName, spanName]
  );

  useEffect(() => {
    if (error) {
      core.notifications.toasts.addDanger({
        title: i18n.translate(
          'unifiedDocViewer.observability.traces.useTransactionLatencyChart.error',
          {
            defaultMessage: 'An error occurred while fetching the latency histogram',
          }
        ),
        text: error.message,
      });
    }
  }, [error, core]);

  return { loading, hasError: !!error, data: value as SpanLatencyChartData | null };
};
