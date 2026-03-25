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
  EuiSkeletonText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FullTraceWaterfallOnErrorClick } from '@kbn/apm-types';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { css } from '@emotion/react';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import type { TraceOverviewSections } from '../../doc_viewer_overview/overview';
import { DocumentDetailFlyout, type DocumentType } from './waterfall_flyout/document_detail_flyout';

export const FULL_TRACE_WATERFALL_RENDER_DELAY_MS = 150;

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
  onCloseFlyout: () => void;
  onExitFullScreen: () => void;
}

export const FullScreenWaterfall = ({
  traceId,
  rangeFrom,
  rangeTo,
  dataView,
  serviceName,
  highlightedSpanId: initialHighlightedSpanId,
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
}: FullScreenWaterfallProps) => {
  const { discoverShared } = getUnifiedDocViewerServices();
  const FullTraceWaterfall = discoverShared.features.registry.getById(
    'observability-full-trace-waterfall'
  )?.render;
  const { euiTheme } = useEuiTheme();

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

  // Suppress EuiFlyout's open-animation when restoring previously-open state.
  // Uses a native <style> tag (not Emotion) to avoid cleanup races with nested flyout unmounts.
  // Removed after 1s so subsequent open/close interactions animate normally.
  const skipAnimationOnMountRef = useRef(skipOpenAnimation);

  useLayoutEffect(() => {
    // typical path
    if (!skipAnimationOnMountRef.current) return;

    // suppress animation when restoring previously-open state
    // this style applies for 1 second to block animations
    const style = document.createElement('style');
    style.id = 'flyout-skip-open-animation';
    style.textContent = `
      .euiFlyout[data-test-subj="traceWaterfallFlyout"],
      .euiFlyout[data-test-subj="traceWaterfallDocumentFlyout"] {
        animation-duration: 0s !important;
      }
    `;
    document.head.appendChild(style);

    const timerId = setTimeout(() => {
      style.remove();
    }, 1000);

    // once animation is suppressed, remove the style
    return () => {
      clearTimeout(timerId);
      style.remove();
    };
  }, []);

  const [highlightedSpanId, setHighlightedSpanId] = useState<string | undefined>(
    initialHighlightedSpanId
  );

  // TODO: Remove this deferred-mount workaround once EUI exposes a prop to
  // disable the flyout open animation at mount time.
  // Tracking issue: https://github.com/elastic/kibana/issues/256531
  const [isWaterfallReady, setIsWaterfallReady] = useState(Boolean(skipOpenAnimation));

  useEffect(() => {
    if (skipOpenAnimation) return;

    const timerId = window.setTimeout(() => {
      setIsWaterfallReady(true);
    }, FULL_TRACE_WATERFALL_RENDER_DELAY_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [skipOpenAnimation]);

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
      size="m"
      onClose={onExitFullScreen}
      ownFocus={false}
      aria-labelledby={traceWaterfallTitleId}
      flyoutMenuProps={{
        title: traceWaterfallTitle,
      }}
      resizable={true}
      minWidth={minWidth}
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
        {isWaterfallReady ? (
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
              highlightedSpanId={highlightedSpanId}
              scrollToHighlightedOnMount={scrollToHighlightedOnMount}
              scrollStrategy="parent"
              onNodeClick={(nodeSpanId) => {
                setHighlightedSpanId(nodeSpanId);
                onNodeClick(nodeSpanId);
              }}
              onErrorClick={(params) => {
                setHighlightedSpanId(params.errorCount > 1 ? params.docId : undefined);
                onErrorClick(params);
              }}
            />
          </div>
        ) : (
          <EuiSkeletonText lines={4} />
        )}
      </EuiFlyoutBody>

      {docId && activeFlyoutType ? (
        <DocumentDetailFlyout
          type={activeFlyoutType}
          docId={docId}
          docIndex={docIndex}
          traceId={traceId}
          dataView={dataView}
          dataTestSubj="traceWaterfallDocumentFlyout"
          onCloseFlyout={() => {
            setHighlightedSpanId(undefined);
            onCloseFlyout();
          }}
          activeSection={activeSection}
        />
      ) : null}
    </EuiFlyout>
  );
};
