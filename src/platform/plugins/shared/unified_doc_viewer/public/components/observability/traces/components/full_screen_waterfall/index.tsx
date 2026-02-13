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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useCallback, useEffect, useState } from 'react';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import type { TraceOverviewSections } from '../../doc_viewer_overview/overview';
import { spanFlyoutId } from './waterfall_flyout/span_flyout';
import { logsFlyoutId } from './waterfall_flyout/logs_flyout';
import { DocumentDetailFlyout, type DocumentType } from './waterfall_flyout/document_detail_flyout';

export const EUI_FLYOUT_BODY_OVERFLOW_CLASS = 'euiFlyoutBody__overflow';

export interface FullScreenWaterfallProps {
  traceId: string;
  rangeFrom: string;
  rangeTo: string;
  dataView: DocViewRenderProps['dataView'];
  serviceName?: string;
  onExitFullScreen: () => void;
}

export const FullScreenWaterfall = ({
  traceId,
  rangeFrom,
  rangeTo,
  dataView,
  serviceName,
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

  const [docId, setDocId] = useState<string | null>(null);
  const [docIndex, setDocIndex] = useState<string | undefined>(undefined);
  const [activeFlyoutType, setActiveFlyoutType] = useState<DocumentType | null>(null);
  const [activeSection, setActiveSection] = useState<TraceOverviewSections | undefined>();
  const [scrollElement, setScrollElement] = useState<Element | null>(null);

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

  /**
   * Obtains the EUI flyout scroll container for the trace waterfall embeddable.
   *
   * This pattern is necessary because:
   * - EUI components don't expose refs, requiring a wrapper div with closest()
   * - scrollElement must be available before the embeddable initializes (conditional render below)
   *
   *
   * TODO: Once the EUI team implements a scrollRef prop (or exposes refs on EUIFlyoutBody, Issue: 2564 in kibana-team repository),
   * we can replace this workaround with a direct ref usage.
   */
  const waterfallContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setScrollElement(node.closest(`.${EUI_FLYOUT_BODY_OVERFLOW_CLASS}`) ?? null);
    }
  }, []);

  function handleCloseFlyout() {
    setActiveFlyoutType(null);
    setActiveSection(undefined);
    setDocId(null);
    setDocIndex(undefined);
  }

  function handleNodeClick(nodeSpanId: string) {
    setActiveSection(undefined);
    setDocId(nodeSpanId);
    setDocIndex(undefined);
    setActiveFlyoutType(spanFlyoutId);
  }

  function handleErrorClick(params: {
    traceId: string;
    docId: string;
    errorCount: number;
    errorDocId?: string;
    docIndex?: string;
  }) {
    if (params.errorCount > 1) {
      setActiveFlyoutType(spanFlyoutId);
      setActiveSection('errors-table');
      setDocId(params.docId);
      setDocIndex(undefined);
    } else if (params.errorDocId) {
      setActiveFlyoutType(logsFlyoutId);
      setDocId(params.errorDocId);
      setDocIndex(params.docIndex);
    }
  }

  if (!FullTraceWaterfall) {
    return null;
  }

  return (
    <EuiFlyout
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
      <EuiFlyoutBody>
        {/* TODO: This is a workaround for layout issues when using hidePanelChrome outside of Dashboard.
          The PresentationPanel applies flex styles (.embPanel__content) that cause width: 0 in non-Dashboard contexts.
          This should be removed once PresentationPanel properly supports hidePanelChrome as an out-of-the-box solution.
          Issue: https://github.com/elastic/kibana/issues/248307
          */}
        <div ref={waterfallContainerRef}>
          {scrollElement && serviceName ? (
            <FullTraceWaterfall
              traceId={traceId}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              serviceName={serviceName}
              scrollElement={scrollElement}
              onNodeClick={handleNodeClick}
              onErrorClick={handleErrorClick}
            />
          ) : null}
        </div>
      </EuiFlyoutBody>

      {docId && activeFlyoutType ? (
        <DocumentDetailFlyout
          type={activeFlyoutType}
          docId={docId}
          docIndex={docIndex}
          traceId={traceId}
          dataView={dataView}
          onCloseFlyout={handleCloseFlyout}
          activeSection={activeSection}
        />
      ) : null}
    </EuiFlyout>
  );
};
