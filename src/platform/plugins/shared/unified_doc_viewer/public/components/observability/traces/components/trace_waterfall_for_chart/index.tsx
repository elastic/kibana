/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import React, { useCallback, useRef, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TraceIndexes } from '@kbn/discover-utils/src';
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

// Temporary for POC purposes, this component should not be in this plugin
export function TraceWaterfallForChart() {
  const { data } = getUnifiedDocViewerServices();
  const { from: rangeFrom, to: rangeTo } = data.query.timefilter.timefilter.getAbsoluteTime();

  // TODO get the right trace id (extract from query)
  // const traceId = '7b9ad4a8eb72d9bc69678981376dafeb';
  const traceId = 'e5458ded740fe3bcca842fb6872cc709'; // with errors

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
    [, rangeFrom, rangeTo]
  );

  return (
    <>
      {/* TODO adjust whatever is needed to the virtual scroll to work properly */}
      <div css={{ height: '100%', overflow: 'auto' }}>
        <EmbeddableRenderer
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
