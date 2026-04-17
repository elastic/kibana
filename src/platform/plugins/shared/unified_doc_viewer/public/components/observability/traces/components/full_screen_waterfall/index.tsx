/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type EuiFlyoutProps } from '@elastic/eui';
import type { FullTraceWaterfallOnErrorClick } from '@kbn/apm-types';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React from 'react';
import { useDocViewerViewedEvent } from '@kbn/unified-doc-viewer';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import { useFlyoutHistoryKey } from '../../../../doc_viewer_flyout/flyout_history_key_context';
import type { TraceOverviewSections } from '../../doc_viewer_overview/overview';
import { DocumentDetailFlyout, type DocumentType } from './waterfall_flyout/document_detail_flyout';
import { FlyoutContentId } from '../../common/constants';

export interface FullScreenWaterfallProps {
  traceId: string;
  rangeFrom: string;
  rangeTo: string;
  dataView: DocViewRenderProps['dataView'];
  serviceName?: string;
  highlightedSpanId?: string;
  scrollToHighlightedOnMount?: boolean;
  docId: string | null;
  docIndex?: string;
  activeFlyoutType: DocumentType | null;
  activeSection?: TraceOverviewSections;
  skipOpenAnimation?: boolean;
  onNodeClick: (nodeSpanId: string) => void;
  onErrorClick: FullTraceWaterfallOnErrorClick;
  onCloseFlyout: EuiFlyoutProps['onClose'];
  onExitFullScreen: EuiFlyoutProps['onClose'];
  skipNextEventReport?: boolean;
}

export const FullScreenWaterfall = ({
  traceId,
  rangeFrom,
  rangeTo,
  dataView,
  serviceName,
  highlightedSpanId,
  scrollToHighlightedOnMount,
  docId,
  docIndex,
  activeFlyoutType,
  activeSection,
  skipOpenAnimation,
  onNodeClick,
  onErrorClick,
  onCloseFlyout,
  onExitFullScreen,
  skipNextEventReport,
}: FullScreenWaterfallProps) => {
  const historyKey = useFlyoutHistoryKey();
  const { analytics, discoverShared } = getUnifiedDocViewerServices();
  const TraceWaterfallFlyout = discoverShared.features.registry.getById(
    'observability-trace-waterfall-flyout'
  )?.render;

  useDocViewerViewedEvent({
    reportEvent: analytics.reportEvent,
    contentId: FlyoutContentId.TRACE_TIMELINE,
    skipNextReport: skipNextEventReport,
  });

  if (!TraceWaterfallFlyout) {
    return null;
  }

  return (
    <TraceWaterfallFlyout
      traceId={traceId}
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
      serviceName={serviceName}
      highlightedSpanId={highlightedSpanId}
      scrollToHighlightedOnMount={scrollToHighlightedOnMount}
      docId={docId}
      docIndex={docIndex}
      activeFlyoutType={activeFlyoutType}
      activeSection={activeSection}
      skipOpenAnimation={skipOpenAnimation}
      historyKey={historyKey}
      onNodeClick={onNodeClick}
      onErrorClick={onErrorClick}
      onCloseFlyout={onCloseFlyout}
      onExitFullScreen={onExitFullScreen}
      renderDetailFlyout={(props) => (
        <DocumentDetailFlyout
          type={props.type}
          docId={props.docId}
          docIndex={props.docIndex}
          traceId={props.traceId}
          dataView={dataView}
          hasAnimation={props.hasAnimation}
          onCloseFlyout={props.onClose}
          activeSection={props.activeSection}
          skipNextEventReport={skipNextEventReport}
        />
      )}
    />
  );
};
