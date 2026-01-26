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
  useGeneratedHtmlId,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useCallback, useState } from 'react';
import type { TraceOverviewSections } from '../../doc_viewer_overview/overview';
import type { spanFlyoutId as spanFlyoutIdType } from './waterfall_flyout/span_flyout';
import { SpanFlyout, spanFlyoutId } from './waterfall_flyout/span_flyout';
import type { logsFlyoutId as logsFlyoutIdType } from './waterfall_flyout/logs_flyout';
import { LogsFlyout, logsFlyoutId } from './waterfall_flyout/logs_flyout';

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
  const { euiTheme } = useEuiTheme();
  const [docId, setDocId] = useState<string | null>(null);
  const [docIndex, setDocIndex] = useState<string | undefined>(undefined);
  const [activeFlyoutId, setActiveFlyoutId] = useState<
    typeof spanFlyoutIdType | typeof logsFlyoutIdType | null
  >(null);
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
   * - Embeddables are constructed once with immutable initial state
   * - EUI components don't expose refs, requiring a wrapper div with closest()
   * - scrollElement must be available before the embeddable initializes (conditional render below)
   *
   *
   * TODO: Once the EUI team implements a scrollRef prop (or exposes refs on EUIFlyoutBody, Issue: 2564 in kibana-team repository),
   * we can replace this workaround with a direct ref usage.
   */
  const embeddableContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setScrollElement(node.closest(`.${EUI_FLYOUT_BODY_OVERFLOW_CLASS}`) ?? null);
    }
  }, []);

  const getParentApi = useCallback(() => {
    return {
      getSerializedStateForChild: () => ({
        traceId,
        rangeFrom,
        rangeTo,
        serviceName,
        scrollElement,
        onErrorClick: (params: {
          traceId: string;
          docId: string;
          errorCount: number;
          errorDocId?: string;
          docIndex?: string;
        }) => {
          if (params.errorCount > 1) {
            setActiveFlyoutId(spanFlyoutId);
            setActiveSection('errors-table');
            setDocId(params.docId);
            setDocIndex(undefined);
          } else if (params.errorDocId) {
            setActiveFlyoutId(logsFlyoutId);
            setDocId(params.errorDocId);
            setDocIndex(params.docIndex);
          }
        },
        onNodeClick: (nodeSpanId: string) => {
          setActiveSection(undefined);
          setDocId(nodeSpanId);
          setDocIndex(undefined);
          setActiveFlyoutId(spanFlyoutId);
        },
        mode: 'full',
      }),
    };
  }, [traceId, rangeFrom, rangeTo, serviceName, scrollElement]);

  function handleCloseFlyout() {
    setActiveFlyoutId(null);
    setActiveSection(undefined);
    setDocId(null);
    setDocIndex(undefined);
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
        <div
          ref={embeddableContainerRef}
          css={css`
            width: 100%;
            & .embPanel__content {
              display: block;
            }
          `}
        >
          {scrollElement ? (
            <EmbeddableRenderer
              type="APM_TRACE_WATERFALL_EMBEDDABLE"
              getParentApi={getParentApi}
              hidePanelChrome
            />
          ) : null}
        </div>
      </EuiFlyoutBody>

      {docId && activeFlyoutId ? (
        activeFlyoutId === spanFlyoutId ? (
          <SpanFlyout
            traceId={traceId}
            spanId={docId}
            dataView={dataView}
            onCloseFlyout={handleCloseFlyout}
            activeSection={activeSection}
          />
        ) : (
          <LogsFlyout
            onCloseFlyout={handleCloseFlyout}
            id={docId}
            index={docIndex}
            dataView={dataView}
          />
        )
      ) : null}
    </EuiFlyout>
  );
};
