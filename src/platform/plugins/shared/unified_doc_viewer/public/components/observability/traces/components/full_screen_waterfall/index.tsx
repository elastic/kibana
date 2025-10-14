/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFocusTrap,
  EuiOverlayMask,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { Global, css } from '@emotion/react';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useCallback, useRef, useState } from 'react';
import { ExitFullScreenButton } from './exit_full_screen_button';
import type { TraceOverviewSections } from '../../doc_viewer_overview/overview';
import type { spanFlyoutId as spanFlyoutIdType } from './waterfall_flyout/span_flyout';
import { SpanFlyout, spanFlyoutId } from './waterfall_flyout/span_flyout';
import type { logsFlyoutId as logsFlyoutIdType } from './waterfall_flyout/logs_flyout';
import { LogsFlyout, logsFlyoutId } from './waterfall_flyout/logs_flyout';

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
  const [docId, setDocId] = useState<string | null>(null);
  const [activeFlyoutId, setActiveFlyoutId] = useState<
    typeof spanFlyoutIdType | typeof logsFlyoutIdType | null
  >(null);
  const [activeSection, setActiveSection] = useState<TraceOverviewSections | undefined>();
  const overlayMaskRef = useRef<HTMLDivElement>(null);
  const { euiTheme } = useEuiTheme();

  const getParentApi = useCallback(
    () => ({
      getSerializedStateForChild: () => ({
        rawState: {
          traceId,
          rangeFrom,
          rangeTo,
          serviceName,
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
          mode: 'full',
        },
      }),
    }),
    [traceId, rangeFrom, rangeTo, serviceName]
  );

  function handleCloseFlyout() {
    setActiveFlyoutId(null);
    setActiveSection(undefined);
    setDocId(null);
  }

  return (
    <>
      {/** This global style is a temporary fix until we migrate to the
       * new flyout system (with child) instead of full screen */}
      <Global
        styles={css`
          .euiDataGridRowCell__popover {
            z-index: ${euiTheme.levels.modal} !important;
          }
        `}
      />
      <EuiOverlayMask
        maskRef={overlayMaskRef}
        css={{
          paddingBlockEnd: '0 !important',
          overflowY: 'scroll',
          backgroundColor: `${euiTheme.colors.backgroundBasePlain} !important`,
        }}
      >
        <EuiFocusTrap css={{ height: '100%', width: '100%' }}>
          <EuiPanel hasShadow={false} css={{ minHeight: '100%', width: '100%' }}>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={1}>
                <EuiTitle size="l">
                  <h2>
                    {i18n.translate(
                      'unifiedDocViewer.observability.traces.fullScreenWaterfall.title',
                      {
                        defaultMessage: 'Trace timeline',
                      }
                    )}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={1} css={{ alignItems: 'end' }}>
                <ExitFullScreenButton
                  onExitFullScreen={onExitFullScreen}
                  dataTestSubj="unifiedDocViewerObservabilityTracesFullScreenWaterfallExitFullScreenButton"
                  ariaLabel={i18n.translate(
                    'unifiedDocViewer.observability.traces.fullScreenWaterfall.exitFullScreen.button',
                    {
                      defaultMessage: 'Exit expanded trace timeline',
                    }
                  )}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem>
                <EmbeddableRenderer
                  type="APM_TRACE_WATERFALL_EMBEDDABLE"
                  getParentApi={getParentApi}
                  hidePanelChrome
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFocusTrap>
      </EuiOverlayMask>
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
          <LogsFlyout onCloseFlyout={handleCloseFlyout} id={docId} dataView={dataView} />
        )
      ) : null}
    </>
  );
};
