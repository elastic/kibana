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
import { ContentFrameworkSection } from '../../../../content_framework/lazy_content_framework_section';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import { useDataSourcesContext } from '../../../../../hooks/use_data_sources';
import { useLogsQuery } from '../../hooks/use_logs_query';
import { createTraceContextWhereClause } from '../../common/create_trace_context_where_clause';
import { useDiscoverLinkAndEsqlQuery } from '../../../../../hooks/use_discover_link_and_esql_query';
import { useOpenInDiscoverSectionAction } from '../../../../../hooks/use_open_in_discover_section_action';

const logsTitle = i18n.translate('unifiedDocViewer.observability.traces.section.logs.title', {
  defaultMessage: 'Logs',
});

const logsDescription = i18n.translate(
  'unifiedDocViewer.observability.traces.section.logs.description',
  {
    defaultMessage: 'Correlated logs that occurred during the span.',
  }
);

export interface TraceContextLogEventsProps {
  traceId: string;
  spanId?: string;
  transactionId?: string;
}
export function TraceContextLogEvents({
  traceId,
  transactionId,
  spanId,
}: TraceContextLogEventsProps) {
  const { data: dataService, discoverShared } = getUnifiedDocViewerServices();
  const { indexes } = useDataSourcesContext();
  const { from, to } = dataService.query.timefilter.timefilter.getTime();

  const timeRange = useMemo(() => ({ from, to }), [from, to]);
  const query = useLogsQuery({ traceId, spanId, transactionId });

  const savedSearchTimeRange = useMemo(
    () => ({
      from: timeRange.from,
      to: timeRange.to,
    }),
    [timeRange.from, timeRange.to]
  );

  const { discoverUrl, esqlQueryString } = useDiscoverLinkAndEsqlQuery({
    indexPattern: indexes.logs,
    whereClause: createTraceContextWhereClause({ traceId, spanId, transactionId }),
  });

  const openInDiscoverSectionAction = useOpenInDiscoverSectionAction({
    href: discoverUrl,
    esql: esqlQueryString,
    tabLabel: logsTitle,
    dataTestSubj: 'unifiedDocViewerLogsOpenInDiscoverButton',
  });

  const actions = useMemo(
    () => (openInDiscoverSectionAction ? [openInDiscoverSectionAction] : []),
    [openInDiscoverSectionAction]
  );

  const LogEvents = discoverShared.features.registry.getById('observability-log-events');

  if (!LogEvents || !indexes.logs) {
    return null;
  }

  const LogEventsComponent = LogEvents.render;

  return (
    <ContentFrameworkSection
      title={logsTitle}
      description={logsDescription}
      id="traceContextLogEvents"
      forceState="closed"
      actions={actions}
    >
      <div tabIndex={0} className="eui-yScrollWithShadows" style={{ maxHeight: '400px' }}>
        <LogEventsComponent
          nonHighlightingQuery={query}
          timeRange={savedSearchTimeRange}
          index={indexes.logs}
        />
      </div>
    </ContentFrameworkSection>
  );
}
