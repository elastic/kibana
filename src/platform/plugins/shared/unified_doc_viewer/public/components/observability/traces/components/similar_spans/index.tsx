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
import type { LatencyChartData } from '../../doc_viewer_overview/hooks/use_latency_chart';

export interface SimilarSpansProps {
  spanDuration: number;
  latencyChart: {
    data: LatencyChartData | null;
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
}: SimilarSpansProps) {
  return (
    <ContentFrameworkSection
      id="similarSpans"
      data-test-subj="docViewerSimilarSpansSection"
      title={i18n.translate('unifiedDocViewer.observability.traces.similarSpans', {
        defaultMessage: 'Similar spans',
      })}
    >
      <ContentFrameworkChart
        data-test-subj={`docViewerSimilarSpansLatencyChart`}
        title={i18n.translate('unifiedDocViewer.observability.traces.similarSpans.latency.title', {
          defaultMessage: 'Latency',
        })}
        esqlQuery={!latencyChart.hasError && esqlQuery ? esqlQuery : undefined}
      >
        <DurationDistributionChart
          data={latencyChart.data?.distributionChartData ?? []}
          markerValue={latencyChart.data?.percentileThresholdValue ?? 0}
          markerCurrentEvent={spanDuration}
          hasData={!!latencyChart.data?.distributionChartData?.length}
          loading={latencyChart.loading}
          hasError={latencyChart.hasError}
          eventType={ProcessorEvent.span}
          showAxisTitle={false}
          showLegend={false}
          isOtelData={isOtelSpan}
          data-test-subj="docViewerSimilarSpansDurationDistributionChart"
        />
      </ContentFrameworkChart>
    </ContentFrameworkSection>
  );
}
