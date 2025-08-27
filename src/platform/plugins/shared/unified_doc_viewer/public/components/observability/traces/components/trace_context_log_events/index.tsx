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
import { ContentFrameworkSection } from '../../../../content_framework/section';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import { useDataSourcesContext } from '../../hooks/use_data_sources';

const logsTitle = i18n.translate('unifiedDocViewer.observability.traces.section.logs.title', {
  defaultMessage: 'Logs',
});

const logsDescription = i18n.translate(
  'unifiedDocViewer.observability.traces.section.logs.description',
  {
    defaultMessage: 'View logs related to this document.',
  }
);

export interface TraceContextLogEventsProps {
  traceId: string;
  spanId?: string;
}
export function TraceContextLogEvents({ traceId, spanId }: TraceContextLogEventsProps) {
  const { data: dataService, discoverShared } = getUnifiedDocViewerServices();
  const { indexes } = useDataSourcesContext();
  const { from, to } = dataService.query.timefilter.timefilter.getTime();

  const timeRange = useMemo(() => ({ from, to }), [from, to]);

  const savedSearchTimeRange = React.useMemo(
    () => ({
      from: timeRange.from,
      to: timeRange.to,
    }),
    [timeRange.from, timeRange.to]
  );

  const query = useMemo(() => {
    const queryStrings = [`(trace.id:"${traceId}" OR (not trace.id:* AND "${traceId}"))`];

    if (spanId) {
      queryStrings.push(`(span.id:"${spanId}" OR (not span.id* AND "${spanId}"))`);
    }

    return {
      language: 'kuery',
      query: queryStrings.join(' AND '),
    };
  }, [traceId, spanId]);

  const LogEvents = discoverShared.features.registry.getById('observability-log-events');

  if (!LogEvents) {
    return null;
  }

  const LogEventsComponent = LogEvents.render;

  return (
    <ContentFrameworkSection
      title={logsTitle}
      description={logsDescription}
      id="traceContextLogEvents"
    >
      <div tabIndex={0} className="eui-yScrollWithShadows" style={{ maxHeight: '400px' }}>
        <LogEventsComponent query={query} timeRange={savedSearchTimeRange} index={indexes.logs} />
      </div>
    </ContentFrameworkSection>
  );
}
