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
import { useDataSourcesContext } from '../../../../../hooks/use_data_sources';
import { useDiscoverLinkAndEsqlQuery } from '../../../../../hooks/use_discover_link_and_esql_query';
import { useOpenInDiscoverSectionAction } from '../../../../../hooks/use_open_in_discover_section_action';
import { getEsqlQuery } from './get_esql_query';

const sectionTitle = i18n.translate('unifiedDocViewer.observability.traces.similarSpans', {
  defaultMessage: 'Similar spans',
});
const latencyTitle = i18n.translate(
  'unifiedDocViewer.observability.traces.similarSpans.latency.title',
  {
    defaultMessage: 'Latency',
  }
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

  const { discoverUrl, esqlQueryString } = useDiscoverLinkAndEsqlQuery({
    indexPattern: indexes.apm.traces,
    whereClause: getEsqlQuery({ serviceName, spanName, transactionName, transactionType }),
  });

  const openInDiscoverSectionAction = useOpenInDiscoverSectionAction({
    href: discoverUrl,
    esql: esqlQueryString,
    tabLabel: sectionTitle,
    dataTestSubj: 'docViewerSimilarSpansOpenInDiscoverButton',
  });

  const actions = useMemo(
    () => (openInDiscoverSectionAction ? [openInDiscoverSectionAction] : []),
    [openInDiscoverSectionAction]
  );

  return (
    <ContentFrameworkSection
      id="similarSpans"
      data-test-subj="docViewerSimilarSpansSection"
      title={sectionTitle}
      actions={actions}
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
