/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { useEffect } from 'react';

import type { EuiThemeComputed } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import type { HistogramItem } from '@kbn/apm-types-shared';
import type { DurationDistributionChartData } from '@kbn/apm-ui-shared';
import { useAbortableAsync } from '@kbn/react-hooks';
import { getUnifiedDocViewerServices } from '../../../../../plugin';

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
  const { core, data, discoverShared } = getUnifiedDocViewerServices();
  const { euiTheme } = useEuiTheme();
  const timeFilter = data.query.timefilter.timefilter.getAbsoluteTime();

  const fetchLatencyOverallTransactionDistributionFeature =
    discoverShared.features.registry.getById(
      'observability-traces-fetch-latency-overall-transaction-distribution'
    );

  const fetchLatencyOverallSpanDistributionFeature = discoverShared.features.registry.getById(
    'observability-traces-fetch-latency-overall-span-distribution'
  );

  const { loading, value, error } = useAbortableAsync<LatencyChartData | undefined>(
    async ({ signal }) => {
      if (!serviceName) {
        return undefined;
      }

      if (
        transactionName &&
        transactionType &&
        fetchLatencyOverallTransactionDistributionFeature?.fetchLatencyOverallTransactionDistribution
      ) {
        const result =
          await fetchLatencyOverallTransactionDistributionFeature.fetchLatencyOverallTransactionDistribution(
            {
              transactionName,
              transactionType,
              serviceName,
              start: timeFilter.from,
              end: timeFilter.to,
            },
            signal
          );

        if (!result) {
          return undefined;
        }

        return {
          distributionChartData: getTransactionDistributionChartData({
            euiTheme,
            transactionHistogram: result.overallHistogram,
          }),
          percentileThresholdValue: result.percentileThresholdValue ?? undefined,
        };
      }

      if (
        spanName &&
        fetchLatencyOverallSpanDistributionFeature?.fetchLatencyOverallSpanDistribution
      ) {
        const result =
          await fetchLatencyOverallSpanDistributionFeature.fetchLatencyOverallSpanDistribution(
            {
              spanName,
              serviceName,
              isOtel: isOtelSpan,
              start: timeFilter.from,
              end: timeFilter.to,
            },
            signal
          );

        if (!result) {
          return undefined;
        }

        return {
          distributionChartData: getSpanDistributionChartData({
            euiTheme,
            spanHistogram: result.overallHistogram,
          }),
          percentileThresholdValue: result.percentileThresholdValue ?? undefined,
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
