/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { DurationDistributionChart } from '@kbn/apm-ui-shared';
import { ProcessorEvent } from '@kbn/apm-types-shared';
import { ContentFrameworkChart } from '../../../../content_framework/chart';
import type { ContentFrameworkSectionProps } from '../../../../content_framework/section';
import { ContentFrameworkSection } from '../../../../content_framework/section';
import { useLatencyChart } from '../../hooks/use_latency_chart';
import { useDataSourcesContext } from '../../hooks/use_data_sources';
import { useGetGenerateDiscoverLink } from '../../hooks/use_get_generate_discover_link';

export interface SimilarSpansProps {
  duration: number;
  spanName?: string;
  serviceName?: string;
  transactionName?: string;
  transactionType?: string;
  isOtelSpan?: boolean;
}

export function SimilarSpans({
  duration,
  spanName,
  serviceName,
  transactionName,
  transactionType,
  isOtelSpan,
}: SimilarSpansProps) {
  const latencyChart = useLatencyChart({
    spanName,
    serviceName,
    transactionName,
    transactionType,
    isOtelSpan,
  });

  const { indexes } = useDataSourcesContext();
  const { generateDiscoverLink } = useGetGenerateDiscoverLink({ indexPattern: indexes.apm.traces });

  const isTransaction = !!transactionType;

  let esqlQuery = null;

  if (isTransaction) {
    // TODO build queries
    esqlQuery = {};
  } else {
    esqlQuery = {};
  }

  const discoverUrl = useMemo(
    () => generateDiscoverLink(esqlQuery),
    [generateDiscoverLink, esqlQuery]
  );

  const sectionActions: ContentFrameworkSectionProps['actions'] =
    esqlQuery && discoverUrl
      ? [
          {
            dataTestSubj: 'docViewerSimilarSpansOpenInDiscoverButton',
            label: i18n.translate(
              'unifiedDocViewer.observability.traces.similarSpans.openInDiscover.button',
              {
                defaultMessage: 'Open in Discover',
              }
            ),
            href: discoverUrl,
            icon: 'discoverApp',
            ariaLabel: i18n.translate(
              'unifiedDocViewer.observability.traces.similarSpans.openInDiscover.label',
              {
                defaultMessage: 'Open in Discover link',
              }
            ),
          },
        ]
      : [];

  return (
    <ContentFrameworkSection
      id="similarSpans"
      data-test-subj="docViewerSimilarSpansSection"
      title={i18n.translate('unifiedDocViewer.observability.traces.similarSpans', {
        defaultMessage: 'Similar spans',
      })}
      actions={sectionActions}
    >
      <ContentFrameworkChart
        data-test-subj="docViewerSimilarSpansLatencyChart"
        title={i18n.translate('unifiedDocViewer.observability.traces.similarSpans.latency.title', {
          defaultMessage: 'Latency',
        })}
      >
        <DurationDistributionChart
          data={latencyChart.data?.distributionChartData ?? []}
          markerValue={latencyChart.data?.percentileThresholdValue ?? 0}
          markerCurrentEvent={duration}
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
