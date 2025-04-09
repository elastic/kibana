/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Duration, DurationDistributionChart } from '@kbn/apm-ui-shared';
import { FETCH_STATUS, ProcessorEvent } from '@kbn/apm-ui-shared/src/enums';
import { useRootTransactionContext } from '../../hooks/use_root_transaction/use_root_transaction';
import { useTransactionLatencyChart } from '../../hooks/use_transaction_latency_chart';

export interface TransactionDurationSummaryProps {
  transaction: {
    duration: number;
    type: string;
    name: string;
  };
  service: {
    name: string;
  };
}

export function TransactionDurationSummary({
  transaction,
  service,
}: TransactionDurationSummaryProps) {
  const { transaction: rootTransaction, loading: rootTransactionLoading } =
    useRootTransactionContext();

  const { data: latencyChartData, loading: latencyChartLoading } = useTransactionLatencyChart({
    transactionName: transaction.name,
    transactionType: transaction.type,
    serviceName: service.name,
  });

  return (
    <>
      <EuiTitle size="s">
        <h2>
          {i18n.translate(
            'unifiedDocViewer.observability.traces.docViewerTransactionOverview.spanDurationSummary.title',
            {
              defaultMessage: 'Duration',
            }
          )}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText color="subdued" size="xs">
        {i18n.translate(
          'unifiedDocViewer.observability.traces.docViewerTransactionOverview.spanDurationSummary.description',
          {
            defaultMessage: 'Time taken to complete this transaction from start to finish.',
          }
        )}
      </EuiText>
      <EuiSpacer size="m" />

      <>
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <EuiFlexGroup alignItems="center" gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxxs">
                  <h3>
                    {i18n.translate(
                      'unifiedDocViewer.observability.traces.docViewerTransactionOverview.spanDurationSummary.duration.title',
                      {
                        defaultMessage: 'Duration',
                      }
                    )}
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={2}>
            <EuiText size="xs">
              <Duration
                duration={transaction.duration}
                parent={{
                  type: 'trace',
                  duration: rootTransaction?.duration,
                  loading: rootTransactionLoading,
                }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="xs" />

        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="xxxs">
              <h3>
                {i18n.translate(
                  'unifiedDocViewer.observability.traces.docViewerTransactionOverview.spanDurationSummary.latency.title',
                  {
                    defaultMessage: 'Latency',
                  }
                )}
              </h3>
            </EuiTitle>

            {(latencyChartLoading || latencyChartData) && (
              <DurationDistributionChart
                data={latencyChartData?.transactionDistributionChartData ?? []}
                markerValue={latencyChartData?.percentileThresholdValue ?? 0}
                markerCurrentEvent={transaction.duration}
                hasData={!latencyChartLoading}
                status={latencyChartLoading ? FETCH_STATUS.LOADING : FETCH_STATUS.SUCCESS}
                showAxisTitle={false}
                eventType={ProcessorEvent.transaction} // TODO PUEDE SER SPAN?
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    </>
  );
}
