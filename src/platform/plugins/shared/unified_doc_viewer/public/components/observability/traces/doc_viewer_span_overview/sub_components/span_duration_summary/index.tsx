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
import { ProcessorEvent } from '@kbn/apm-ui-shared';
import { useTransactionContext } from '../../hooks/use_transaction';
import { useSpanLatencyChart } from '../../hooks/use_span_latency_chart';
import { FieldWithoutActions } from '../../../components/field_without_actions';
import { Section } from '../../../components/section';

export interface SpanDurationSummaryProps {
  spanDuration: number;
  spanName: string;
  serviceName: string;
  transactionId?: string;
}

export function SpanDurationSummary({
  spanDuration,
  spanName,
  transactionId,
  serviceName,
}: SpanDurationSummaryProps) {
  const { transaction, loading } = useTransactionContext();
  const {
    data: latencyChartData,
    loading: latencyChartLoading,
    hasError: latencyChartHasError,
  } = useSpanLatencyChart({
    spanName,
    transactionId: transactionId || '',
    serviceName,
  });

  return (
    <Section
      title={i18n.translate(
        'unifiedDocViewer.observability.traces.docViewerSpanOverview.spanDurationSummary.title',
        {
          defaultMessage: 'Duration',
        }
      )}
      subtitle={i18n.translate(
        'unifiedDocViewer.observability.traces.docViewerSpanOverview.spanDurationSummary.description',
        {
          defaultMessage: 'Time taken to complete this span from start to finish.',
        }
      )}
    >
      <>
        <FieldWithoutActions
          label={i18n.translate(
            'unifiedDocViewer.observability.traces.docViewerSpanOverview.spanDurationSummary.duration.title',
            {
              defaultMessage: 'Duration',
            }
          )}
        >
          <EuiText size="xs">
            <Duration
              duration={spanDuration}
              parent={{ loading, duration: transaction?.duration, type: 'transaction' }}
            />
          </EuiText>
        </FieldWithoutActions>
        <EuiHorizontalRule margin="xs" />

        {transactionId && (
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
                  data={latencyChartData?.spanDistributionChartData ?? []}
                  markerValue={latencyChartData?.percentileThresholdValue ?? 0}
                  markerCurrentEvent={spanDuration}
                  hasData={!!latencyChartData}
                  loading={latencyChartLoading}
                  hasError={latencyChartHasError}
                  eventType={ProcessorEvent.span}
                  showAxisTitle={false}
                  showLegend={false}
                  dataTestSubPrefix="docViewerSpanOverview"
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </>
    </Section>
  );
}
