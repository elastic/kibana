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
import type { HistogramItem } from '@kbn/apm-ui-shared';
import { DurationDistributionChartData } from '@kbn/apm-ui-shared';
import { useAbortableAsync } from '@kbn/react-hooks';
import { getUnifiedDocViewerServices } from '../../../../../../plugin';

interface GetSpanDistributionChartDataParams {
  euiTheme: EuiThemeComputed;
  spanHistogram?: HistogramItem[];
}

export function getSpanDistributionChartData({
  euiTheme,
  spanHistogram,
}: GetSpanDistributionChartDataParams) {
  const spanDistributionChartData: DurationDistributionChartData[] = [];

  if (Array.isArray(spanHistogram)) {
    spanDistributionChartData.push({
      id: i18n.translate(
        'unifiedDocViewer.observability.traces.useSpanLatencyChart.allSpansLabel',
        {
          defaultMessage: 'All spans',
        }
      ),
      histogram: spanHistogram,
      areaSeriesColor: euiTheme.colors.vis.euiColorVis1,
    });
  }

  return spanDistributionChartData;
}

interface GetLatencyChartParams {
  core: CoreStart;
  signal: AbortSignal;
  spanName: string;
  transactionId: string;
  serviceName: string;
}

const getSpanLatencyChart = ({
  core,
  signal,
  spanName,
  transactionId,
  serviceName,
}: GetLatencyChartParams): Promise<{
  overallHistogram?: HistogramItem[];
  percentileThresholdValue?: number;
}> => {
  const { data } = getUnifiedDocViewerServices();
  const timeFilter = data.query.timefilter.timefilter.getAbsoluteTime();
  const params = {
    spanName,
    transactionId,
    serviceName,
    chartType: 'spanLatency',
    end: timeFilter.to,
    environment: 'ENVIRONMENT_ALL',
    kuery: '',
    percentileThreshold: 95,
    start: timeFilter.from,
  };

  return core.http.post('/internal/apm/latency/overall_distribution/spans', {
    body: JSON.stringify(params),
    signal,
  });
};

interface SpanLatencyChartData {
  spanDistributionChartData: DurationDistributionChartData[];
  percentileThresholdValue?: number;
}

interface UseSpanLatencyChartParams {
  spanName: string;
  transactionId: string;
  serviceName: string;
}

export const useSpanLatencyChart = ({
  spanName,
  transactionId,
  serviceName,
}: UseSpanLatencyChartParams) => {
  const { core } = getUnifiedDocViewerServices();
  const { euiTheme } = useEuiTheme();

  const { loading, value, error } = useAbortableAsync(
    async ({ signal }) => {
      if (!spanName || !transactionId || !serviceName) {
        return null;
      }

      const result = await getSpanLatencyChart({
        core,
        signal,
        spanName,
        transactionId,
        serviceName,
      });

      return {
        spanDistributionChartData: getSpanDistributionChartData({
          euiTheme,
          spanHistogram: result.overallHistogram,
        }),
        percentileThresholdValue: result.percentileThresholdValue,
      };
    },
    [core, euiTheme, serviceName, transactionId, spanName]
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
