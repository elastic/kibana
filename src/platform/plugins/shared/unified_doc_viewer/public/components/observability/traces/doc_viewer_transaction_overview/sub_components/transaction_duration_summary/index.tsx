/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Duration, DurationDistributionChart } from '@kbn/apm-ui-shared';
import { ProcessorEvent } from '@kbn/apm-types-shared';
import { useRootTransactionContext } from '../../hooks/use_root_transaction';
import { useTransactionLatencyChart } from '../../hooks/use_transaction_latency_chart';
import { Section } from '../../../components/section';
import { FieldWithoutActions } from '../../../components/field_without_actions';

export interface TransactionDurationSummaryProps {
  transactionDuration: number;
  transactionName: string;
  transactionType: string;
  serviceName: string;
}

export function TransactionDurationSummary({
  transactionDuration,
  transactionName,
  transactionType,
  serviceName,
}: TransactionDurationSummaryProps) {
  const { transaction: rootTransaction, loading: rootTransactionLoading } =
    useRootTransactionContext();

  const {
    data: latencyChartData,
    loading: latencyChartLoading,
    hasError: latencyChartHasError,
  } = useTransactionLatencyChart({
    transactionName,
    transactionType,
    serviceName,
  });

  return (
    <Section
      title={i18n.translate(
        'unifiedDocViewer.observability.traces.docViewerTransactionOverview.spanDurationSummary.title',
        {
          defaultMessage: 'Duration',
        }
      )}
      subtitle={i18n.translate(
        'unifiedDocViewer.observability.traces.docViewerTransactionOverview.spanDurationSummary.description',
        {
          defaultMessage: 'Time taken to complete this transaction from start to finish.',
        }
      )}
    >
      <>
        <FieldWithoutActions
          label={i18n.translate(
            'unifiedDocViewer.observability.traces.docViewerTransactionOverview.spanDurationSummary.duration.title',
            {
              defaultMessage: 'Duration',
            }
          )}
        >
          <EuiText size="xs">
            <Duration
              duration={transactionDuration}
              parent={{
                type: 'trace',
                duration: rootTransaction?.duration,
                loading: rootTransactionLoading,
              }}
              size="xs"
            />
          </EuiText>
        </FieldWithoutActions>
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
                markerCurrentEvent={transactionDuration}
                hasData={!!latencyChartData}
                loading={latencyChartLoading}
                hasError={latencyChartHasError}
                eventType={ProcessorEvent.transaction}
                showAxisTitle={false}
                showLegend={false}
                dataTestSubPrefix="docViewerTransactionOverview"
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    </Section>
  );
}
