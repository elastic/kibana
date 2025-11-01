/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TraceIndexes } from '@kbn/discover-utils/src';
import type { Subscription } from 'rxjs';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import {
  SpanFlyout,
  spanFlyoutId,
  type spanFlyoutId as spanFlyoutIdType,
} from '../full_screen_waterfall/waterfall_flyout/span_flyout';
import type { logsFlyoutId as logsFlyoutIdType } from '../full_screen_waterfall/waterfall_flyout/logs_flyout';
import { LogsFlyout, logsFlyoutId } from '../full_screen_waterfall/waterfall_flyout/logs_flyout';
import type { TraceOverviewSections } from '../../doc_viewer_overview/overview';
import { DataSourcesProvider } from '../../hooks/use_data_sources';

// TODO search if there's helpers to extract filters from ESQL queries so we can use them here
function extractTraceIdIfOnlyTraceFilter(query: string): string | null {
  if (typeof query !== 'string') return null;
  const normalized = query.replace(/\s+/g, ' ').trim();
  const reEsql = /^FROM\s+[^|]+\s*\|\s*WHERE\s+trace\.id\s*={1,2}\s*["']?([\w\-]+)["']?$/i;
  const match = normalized.match(reEsql);
  return match ? match[1] : null;
}

// Temporary for POC purposes, this component should not be in this plugin
export function TraceWaterfallForChart() {
  const { data } = getUnifiedDocViewerServices();
  const { from: rangeFrom, to: rangeTo } = data.query.timefilter.timefilter.getAbsoluteTime();
  const [traceId, setTraceId] = useState<string | null>(null);

  useEffect(() => {
    const initialQuery = data.query.queryString.getQuery();
    if ('esql' in initialQuery) {
      // TODO the POC only uses TraceWaterfallForChart only for ESQL (at least for now)
      const esql: string = initialQuery.esql;
      setTraceId(extractTraceIdIfOnlyTraceFilter(esql));
    }

    const subscription: Subscription = data.query.queryString.getUpdates$().subscribe((query) => {
      if ('esql' in query) {
        // TODO the POC only uses TraceWaterfallForChart only for ESQL (at least for now)
        const esql: string = query.esql;
        setTraceId(extractTraceIdIfOnlyTraceFilter(esql));
      } else {
        setTraceId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [data.query.queryString]);

  // TODO get the right data view
  const [dataView, setDataView] = useState<DataView | null>(null);
  data.dataViews.getDefault().then((dataView2) => {
    if (dataView2) {
      setDataView(dataView2);
    }
  });

  // TODO get the right indexes, not hardcoded
  const indexes: TraceIndexes = {
    logs: 'logs*,remote_cluster:logs*',
    apm: { errors: 'logs*,remote_cluster:logs*', traces: 'traces*,remote_cluster:traces*' },
  };

  const [docId, setDocId] = useState<string | null>(null);
  const [activeFlyoutId, setActiveFlyoutId] = useState<
    typeof spanFlyoutIdType | typeof logsFlyoutIdType | null
  >(null);
  const [activeSection, setActiveSection] = useState<TraceOverviewSections | undefined>();
  const overlayMaskRef = useRef<HTMLDivElement>(null);

  function handleCloseFlyout() {
    setActiveFlyoutId(null);
    setActiveSection(undefined);
    setDocId(null);
  }

  const getParentApi = useCallback(
    () => ({
      getSerializedStateForChild: () => ({
        rawState: {
          traceId,
          rangeFrom,
          rangeTo,
          mode: 'full',
          scrollElement: overlayMaskRef.current,
          onErrorClick: (params: {
            traceId: string;
            docId: string;
            errorCount: number;
            errorDocId?: string;
          }) => {
            if (params.errorCount > 1) {
              setActiveFlyoutId(spanFlyoutId);
              setActiveSection('errors-table');
              setDocId(params.docId);
            } else if (params.errorDocId) {
              setActiveFlyoutId(logsFlyoutId);
              setDocId(params.errorDocId);
            }
          },
          onNodeClick: (nodeSpanId: string) => {
            setActiveSection(undefined);
            setDocId(nodeSpanId);
            setActiveFlyoutId(spanFlyoutId);
          },
        },
      }),
    }),
    [rangeFrom, rangeTo, traceId]
  );

  if (!traceId) return null;

  return (
    <>
      {/* TODO adjust whatever is needed to the virtual scroll to work properly */}
      <div css={{ height: '100%', overflow: 'auto' }}>
        <EmbeddableRenderer
          key={traceId}
          type="APM_TRACE_WATERFALL_EMBEDDABLE"
          getParentApi={getParentApi}
          hidePanelChrome
        />
      </div>
      <DataSourcesProvider indexes={indexes}>
        {docId && activeFlyoutId && dataView ? (
          activeFlyoutId === spanFlyoutId ? (
            <SpanFlyout
              traceId={traceId}
              spanId={docId}
              dataView={dataView}
              onCloseFlyout={handleCloseFlyout}
              activeSection={activeSection}
            />
          ) : (
            <LogsFlyout onCloseFlyout={handleCloseFlyout} id={docId} dataView={dataView} />
          )
        ) : null}
      </DataSourcesProvider>
    </>
  );
}
