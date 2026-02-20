/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useEffect } from 'react';

import type { EuiThemeComputed } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import type { HistogramItem } from '@kbn/apm-types-shared';
import type { DurationDistributionChartData } from '@kbn/apm-ui-shared';
import { useAbortableAsync } from '@kbn/react-hooks';
import { useUnifiedDocViewerServices } from '../../../../../services';

interface GetTransactionDistributionChartDataParams {
  euiTheme: EuiThemeComputed;
  transactionHistogram?: HistogramItem[];
}

export function getTransactionDistributionChartData({
  euiTheme,
  transactionHistogram,
}: GetTransactionDistributionChartDataParams) {
  const transactionDistributionChartData: DurationDistributionChartData[] = [];

  if (Array.isArray(transactionHistogram)) {
    transactionDistributionChartData.push({
      id: i18n.translate(
        'unifiedDocViewer.observability.traces.useTransactionLatencyChart.allTransactionsLabel',
        {
          defaultMessage: 'All transactions',
        }
      ),
      histogram: transactionHistogram,
      areaSeriesColor: euiTheme.colors.vis.euiColorVis1,
    });
  }

  return transactionDistributionChartData;
}

interface GetLatencyChartParams {
  core: CoreStart;
  signal: AbortSignal;
  transactionName: string;
  transactionType: string;
  serviceName: string;
  timeRange: { from: string; to: string };
}

const getTransactionLatencyChart = ({
  core,
  signal,
  transactionName,
  transactionType,
  serviceName,
  timeRange,
}: GetLatencyChartParams): Promise<{
  overallHistogram?: HistogramItem[];
  percentileThresholdValue?: number;
}> => {
  return core.http.post('/internal/apm/latency/overall_distribution/transactions', {
    body: JSON.stringify({
      transactionName,
      transactionType,
      serviceName,
      chartType: 'transactionLatency',
      end: timeRange.to,
      environment: 'ENVIRONMENT_ALL',
      kuery: '',
      percentileThreshold: 95,
      start: timeRange.from,
    }),
    signal,
  });
};

export interface LatencyChartData {
  distributionChartData: DurationDistributionChartData[];
  percentileThresholdValue?: number;
}

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

interface GetSpanLatencyChartParams {
  core: CoreStart;
  signal: AbortSignal;
  spanName: string;
  serviceName: string;
  isOtelSpan: boolean;
  timeRange: { from: string; to: string };
}

const getSpanLatencyChart = ({
  core,
  signal,
  spanName,
  serviceName,
  isOtelSpan,
  timeRange,
}: GetSpanLatencyChartParams): Promise<{
  overallHistogram?: HistogramItem[];
  percentileThresholdValue?: number;
}> => {
  return core.http.post('/internal/apm/latency/overall_distribution/spans', {
    body: JSON.stringify({
      spanName,
      serviceName,
      chartType: 'spanLatency',
      isOtel: isOtelSpan,
      end: timeRange.to,
      environment: 'ENVIRONMENT_ALL',
      kuery: '',
      percentileThreshold: 95,
      start: timeRange.from,
    }),
    signal,
  });
};

interface UseLatencyChartParams {
  spanName?: string;
  serviceName?: string;
  transactionName?: string;
  transactionType?: string;
  isOtelSpan?: boolean;
}

export const useLatencyChart = ({
  spanName,
  serviceName,
  transactionName,
  transactionType,
  isOtelSpan = false,
}: UseLatencyChartParams) => {
  const { core, data } = useUnifiedDocViewerServices();
  const { euiTheme } = useEuiTheme();
  const timeRange = data.query.timefilter.timefilter.getAbsoluteTime();

  const { loading, value, error } = useAbortableAsync<LatencyChartData | undefined>(
    async ({ signal }) => {
      if (!serviceName) {
        return undefined;
      }

      if (transactionName && transactionType) {
        const result = await getTransactionLatencyChart({
          core,
          signal,
          transactionName,
          transactionType,
          serviceName,
          timeRange,
        });

        return {
          distributionChartData: getTransactionDistributionChartData({
            euiTheme,
            transactionHistogram: result.overallHistogram,
          }),
          percentileThresholdValue: result.percentileThresholdValue,
        };
      }

      if (spanName) {
        const result = await getSpanLatencyChart({
          core,
          signal,
          spanName,
          serviceName,
          isOtelSpan,
          timeRange,
        });

        return {
          distributionChartData: getSpanDistributionChartData({
            euiTheme,
            spanHistogram: result.overallHistogram,
          }),
          percentileThresholdValue: result.percentileThresholdValue,
        };
      }
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

  return {
    loading,
    hasError: !!error,
    data: value,
  };
};
