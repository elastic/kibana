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
import { LazySavedSearchComponent } from '@kbn/saved-search-component';
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
  const {
    discoverShared,
    data: dataService,
    uiSettings,
    embeddable,
  } = getUnifiedDocViewerServices();

  const { indexes } = useDataSourcesContext();

  const { from: start, to: end } = dataService.query.timefilter.timefilter.getTime();

  const timeRange = useMemo(() => ({ start, end }), [start, end]);

  const savedSearchTimeRange = React.useMemo(
    () => ({
      from: timeRange.start,
      to: timeRange.end,
    }),
    [timeRange.start, timeRange.end]
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

  return (
    <ContentFrameworkSection
      title={logsTitle}
      description={logsDescription}
      id="logs"
      children={
        <LazySavedSearchComponent
          query={query}
          index={indexes.logs}
          timeRange={savedSearchTimeRange}
          dependencies={{
            embeddable,
            searchSource: dataService.search.searchSource,
            dataViews: dataService.dataViews,
          }}
          displayOptions={{
            solutionNavIdOverride: 'oblt',
            enableDocumentViewer: false,
            enableFilters: true,
          }}
          height="30vh"
        />
      }
    />
  );
}
