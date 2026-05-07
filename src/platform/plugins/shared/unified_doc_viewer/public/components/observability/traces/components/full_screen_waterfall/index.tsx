/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
  type EuiFlyoutProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FullTraceWaterfallOnErrorClick } from '@kbn/apm-types';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useEffect } from 'react';
import { useDocViewerViewedEvent } from '@kbn/unified-doc-viewer';
import { css } from '@emotion/react';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import { useFlyoutHistoryKey } from '../../../../doc_viewer_flyout/flyout_history_key_context';
import type { TraceOverviewSections } from '../../doc_viewer_overview/overview';
import { DocumentDetailFlyout } from './waterfall_flyout/document_detail_flyout';
import { FlyoutContentId } from '../../common/constants';
import type { TraceDocFlyoutType } from '../../common/types';
import { TRACES_DOC_VIEWER_EBT_ELEMENTS } from '../../ebt_constants';

export interface FullScreenWaterfallProps {
  traceId: string;
  rangeFrom: string;
  rangeTo: string;
  dataView: DocViewRenderProps['dataView'];
  serviceName?: string;
  contextSpanIds?: string[];
  scrollToContextOnMount?: boolean;
  docId: string | null;
  docIndex?: string;
  activeFlyoutType: TraceDocFlyoutType | null;
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
  contextSpanIds,
  scrollToContextOnMount,
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
  const FullTraceWaterfall = discoverShared.features.registry.getById(
    'observability-full-trace-waterfall'
  )?.render;
  const { euiTheme } = useEuiTheme();

  useDocViewerViewedEvent({
    reportEvent: analytics.reportEvent,
    contentId: FlyoutContentId.TRACE_TIMELINE,
    skipNextReport: skipNextEventReport,
  });

  /*
   * Temporary workaround: add a native <style> tag to fix the z-index of EuiDataGrid cell popovers
   * rendered inside nested flyouts.
   *
   * EuiDataGrid popovers use EuiPortal, which inserts content at the document root. When nested
   * flyouts unmount, Emotion's style cleanup can target portals that have already been removed
   * from the DOM, resulting in a white screen crash.
   *
   * By injecting a plain <style> element into document.head, we bypass Emotion entirely,
   * avoiding the cleanup race condition while still ensuring the popover renders
   * above the flyout layers.
   *
   * TODO: Remove this workaround once EUI provides a proper fix for popover z-index handling
   * inside nested flyouts (see: https://github.com/elastic/eui/issues/8801).
   */

  useEffect(() => {
    const style = document.createElement('style');

    style.id = 'flyout-datagrid-popover-z-index-fix';
    style.textContent = `
      .euiDataGridRowCell__popover {
        z-index: ${euiTheme.levels.menu} !important;
      }
    `;

    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, [euiTheme.levels.menu]);

  const traceWaterfallTitleId = useGeneratedHtmlId({
    prefix: 'traceWaterfallTitle',
  });

  const traceWaterfallTitle = i18n.translate(
    'unifiedDocViewer.observability.traces.fullScreenWaterfall.title',
    {
      defaultMessage: 'Trace timeline',
    }
  );

  const minWidth = euiTheme.base * 30;

  if (!FullTraceWaterfall) {
    return null;
  }

  return (
    <EuiFlyout
      data-test-subj="traceWaterfallFlyout"
      session="start"
      historyKey={historyKey}
      size="m"
      onClose={onExitFullScreen}
      ownFocus={false}
      aria-labelledby={traceWaterfallTitleId}
      flyoutMenuProps={{
        title: traceWaterfallTitle,
      }}
      resizable={true}
      minWidth={minWidth}
      hasAnimation={!skipOpenAnimation}
    >
      <EuiFlyoutHeader>
        <EuiTitle size="l">
          <h2 id={traceWaterfallTitleId}>{traceWaterfallTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        css={css`
          .euiFlyoutBody__overflow,
          .euiFlyoutBody__overflowContent {
            height: 100%;
          }
          .euiFlyoutBody__overflow {
            overflow: hidden;
          }
        `}
      >
        <div
          css={css`
            display: flex;
            flex-direction: column;
            height: 100%;
          `}
        >
          <FullTraceWaterfall
            traceId={traceId}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            serviceName={serviceName}
            contextSpanIds={contextSpanIds}
            scrollToContextOnMount={scrollToContextOnMount}
            scrollStrategy="parent"
            onNodeClick={onNodeClick}
            onErrorClick={onErrorClick}
            ebt={{
              row: { element: TRACES_DOC_VIEWER_EBT_ELEMENTS.WATERFALL_ROW },
              errorBadge: { element: TRACES_DOC_VIEWER_EBT_ELEMENTS.WATERFALL_ERROR_BADGE },
              serviceBadge: { element: TRACES_DOC_VIEWER_EBT_ELEMENTS.WATERFALL_SERVICE_BADGE },
            }}
          />
        </div>
      </EuiFlyoutBody>

      {docId && activeFlyoutType ? (
        <DocumentDetailFlyout
          type={activeFlyoutType}
          docId={docId}
          docIndex={docIndex}
          traceId={traceId}
          dataView={dataView}
          dataTestSubj="traceWaterfallDocumentFlyout"
          hasAnimation={!skipOpenAnimation}
          onCloseFlyout={onCloseFlyout}
          activeSection={activeSection}
          skipNextEventReport={skipNextEventReport}
        />
      ) : null}
    </EuiFlyout>
  );
};
