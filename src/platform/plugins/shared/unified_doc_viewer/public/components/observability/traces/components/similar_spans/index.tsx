/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { DurationDistributionChart } from '@kbn/apm-ui-shared';
import { ProcessorEvent } from '@kbn/apm-types-shared';
import { ContentFrameworkChart } from '../../../../content_framework/chart';
import { ContentFrameworkSection } from '../../../../content_framework/section';
import type { SpanLatencyChartData } from '../../doc_viewer_span_overview/hooks/use_span_latency_chart';

export interface SimilarSpansProps {
  id: string;
  spanDuration: number;
  latencyChart: {
    data: SpanLatencyChartData | null; // TODO move this interface
    loading: boolean;
    hasError: boolean;
  };
  isOtelSpan: boolean;
  esqlQuery?: string;
}

// This section will be replacing the SpanDurationSummary and TransactionDurationSummary as part of https://github.com/elastic/kibana/issues/228916
export function SimilarSpans({
  latencyChart,
  spanDuration,
  esqlQuery,
  isOtelSpan,
  id,
}: SimilarSpansProps) {
  return (
    <ContentFrameworkSection
      id={id}
      data-test-subj={`docViewerSimilarSpans-${id}`}
      title={i18n.translate('unifiedDocViewer.observability.traces.similarSpans', {
        defaultMessage: 'Similar spans',
      })}
    >
      <ContentFrameworkChart
        id={id}
        data-test-subj={`docViewerSimilarSpansLatencyChart-${id}`}
        title={i18n.translate('unifiedDocViewer.observability.traces.similarSpans.latency.title', {
          defaultMessage: 'Latency',
        })}
        esqlQuery={!latencyChart.hasError && esqlQuery ? esqlQuery : undefined}
      >
        {(latencyChart.loading || latencyChart.data) && (
          <DurationDistributionChart
            data={latencyChart.data?.spanDistributionChartData ?? []}
            markerValue={latencyChart.data?.percentileThresholdValue ?? 0}
            markerCurrentEvent={spanDuration}
            hasData={!!latencyChart.data?.spanDistributionChartData?.length}
            loading={latencyChart.loading}
            hasError={latencyChart.hasError}
            eventType={ProcessorEvent.span}
            showAxisTitle={false}
            showLegend={false}
            isOtelData={isOtelSpan}
            dataTestSubPrefix="docViewerSimilarSpansDurationDistributionChart"
          />
        )}
      </ContentFrameworkChart>
    </ContentFrameworkSection>
  );
}
