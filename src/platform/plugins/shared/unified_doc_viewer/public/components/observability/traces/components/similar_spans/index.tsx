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
import { ContentFrameworkSection } from '../../../../content_framework/lazy_content_framework_section';
import { ContentFrameworkChart } from '../../../../content_framework/chart';
import { useLatencyChart } from '../../hooks/use_latency_chart';
import { useDataSourcesContext } from '../../hooks/use_data_sources';
import { useGetGenerateDiscoverLink } from '../../hooks/use_get_generate_discover_link';
import { getEsqlQuery } from './get_esql_query';
import type { ContentFrameworkSectionProps } from '../../../../content_framework/section/section';

const sectionTitle = i18n.translate('unifiedDocViewer.observability.traces.similarSpans', {
  defaultMessage: 'Similar spans',
});
const latencyTitle = i18n.translate(
  'unifiedDocViewer.observability.traces.similarSpans.latency.title',
  {
    defaultMessage: 'Latency',
  }
);
const discoverBtnLabel = i18n.translate(
  'unifiedDocViewer.observability.traces.similarSpans.openInDiscover.button',
  { defaultMessage: 'Open in Discover' }
);
const discoverBtnAria = i18n.translate(
  'unifiedDocViewer.observability.traces.similarSpans.openInDiscover.label',
  { defaultMessage: 'Open in Discover link' }
);

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

  const esqlQuery = getEsqlQuery({ serviceName, spanName, transactionName, transactionType });

  const discoverUrl = useMemo(
    () => generateDiscoverLink(esqlQuery),
    [generateDiscoverLink, esqlQuery]
  );

  const sectionActions: ContentFrameworkSectionProps['actions'] = useMemo(
    () =>
      discoverUrl
        ? [
            {
              dataTestSubj: 'docViewerSimilarSpansOpenInDiscoverButton',
              label: discoverBtnLabel,
              href: discoverUrl,
              icon: 'discoverApp',
              ariaLabel: discoverBtnAria,
            },
          ]
        : [],
    [, discoverUrl]
  );

  return (
    <ContentFrameworkSection
      id="similarSpans"
      data-test-subj="docViewerSimilarSpansSection"
      title={sectionTitle}
      actions={sectionActions}
    >
      <ContentFrameworkChart
        data-test-subj="docViewerSimilarSpansLatencyChart"
        title={latencyTitle}
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
