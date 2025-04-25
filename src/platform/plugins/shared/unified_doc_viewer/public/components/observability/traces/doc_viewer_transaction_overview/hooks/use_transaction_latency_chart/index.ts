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
import { useState, useEffect } from 'react';

import { EuiThemeComputed, useEuiTheme } from '@elastic/eui';
import type { HistogramItem } from '@kbn/apm-ui-shared';
import { DurationDistributionChartData } from '@kbn/apm-ui-shared';
import { getUnifiedDocViewerServices } from '../../../../../../plugin';

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
}

const getTransactionLatencyChart = ({
  core,
  signal,
  transactionName,
  transactionType,
  serviceName,
}: GetLatencyChartParams): Promise<{
  overallHistogram?: HistogramItem[];
  percentileThresholdValue?: number;
}> => {
  const { data } = getUnifiedDocViewerServices();
  const timeFilter = data.query.timefilter.timefilter.getAbsoluteTime();
  const params = {
    transactionName,
    transactionType,
    serviceName,
    chartType: 'transactionLatency',
    end: timeFilter.to,
    environment: 'ENVIRONMENT_ALL',
    kuery: '',
    percentileThreshold: 95,
    start: timeFilter.from,
  };

  return core.http.post('/internal/apm/latency/overall_distribution/transactions', {
    body: JSON.stringify(params),
    signal,
  });
};

interface TransactionLatencyChartData {
  transactionDistributionChartData: DurationDistributionChartData[];
  percentileThresholdValue?: number;
}

interface UseTransactionLatencyChartParams {
  transactionName: string;
  transactionType: string;
  serviceName: string;
}

export const useTransactionLatencyChart = ({
  transactionName,
  transactionType,
  serviceName,
}: UseTransactionLatencyChartParams) => {
  const { core } = getUnifiedDocViewerServices();
  const { euiTheme } = useEuiTheme();

  const [data, setData] = useState<TransactionLatencyChartData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!transactionName || !transactionType || !serviceName) {
      setData(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getTransactionLatencyChart({
          core,
          signal,
          transactionName,
          transactionType,
          serviceName,
        });

        setData({
          transactionDistributionChartData: getTransactionDistributionChartData({
            euiTheme,
            transactionHistogram: result.overallHistogram,
          }),
          percentileThresholdValue: result.percentileThresholdValue,
        });
      } catch (err) {
        if (!signal.aborted) {
          const error = err as Error;
          core.notifications.toasts.addDanger({
            title: i18n.translate(
              'unifiedDocViewer.observability.traces.useTransactionLatencyChart.error',
              {
                defaultMessage: 'An error occurred while fetching the latency histogram',
              }
            ),
            text: error.message,
          });
          setData(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return function onUnmount() {
      controller.abort();
    };
  }, [core, euiTheme, serviceName, transactionName, transactionType]);

  return { loading, data };
};
