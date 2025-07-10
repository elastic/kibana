/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFocusTrap,
  EuiOverlayMask,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { SERVICE_NAME_FIELD, SPAN_ID_FIELD, TRANSACTION_ID_FIELD } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import { SpanFlyout } from './span_flyout';
import { useRootTransactionContext } from '../../doc_viewer_transaction_overview/hooks/use_root_transaction';
import { useDataSourcesContext } from '../../hooks/use_data_sources';
import { ExitFullScreenButton } from './exit_full_screen_button';

export interface FullScreenWaterfallProps {
  traceId: string;
  rangeFrom: string;
  rangeTo: string;
  dataView: DocViewRenderProps['dataView'];
  tracesIndexPattern: string;
  onExitFullScreen: () => void;
}

export const FullScreenWaterfall = ({
  traceId,
  rangeFrom,
  rangeTo,
  dataView,
  tracesIndexPattern,
  onExitFullScreen,
}: FullScreenWaterfallProps) => {
  const { transaction } = useRootTransactionContext();
  const [spanId, setSpanId] = useState<string | null>(null);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const overlayMaskRef = useRef<HTMLDivElement>(null);
  const {
    share: {
      url: { locators },
    },
    data: {
      query: {
        timefilter: { timefilter },
      },
    },
  } = getUnifiedDocViewerServices();
  const { indexes } = useDataSourcesContext();

  const discoverLocator = useMemo(() => locators.get('DISCOVER_APP_LOCATOR'), [locators]);

  const generateRelatedErrorsDiscoverUrl = useCallback(
    (docId: string) => {
      if (!discoverLocator) {
        return null;
      }

      const url = discoverLocator.getRedirectUrl({
        timeRange: timefilter.getAbsoluteTime(),
        filters: [],
        query: {
          language: 'kuery',
          esql: `FROM ${indexes.apm.errors},${indexes.logs} | WHERE QSTR("trace.id:${traceId} AND span.id:${docId}")`,
        },
      });

      return url;
    },
    [discoverLocator, timefilter, indexes.apm.errors, indexes.logs, traceId]
  );

  const getParentApi = useCallback(
    () => ({
      getSerializedStateForChild: () => ({
        rawState: {
          traceId,
          rangeFrom,
          rangeTo,
          serviceName: transaction?.[SERVICE_NAME_FIELD],
          entryTransactionId: transaction?.[TRANSACTION_ID_FIELD] || transaction?.[SPAN_ID_FIELD],
          scrollElement: overlayMaskRef.current,
          getRelatedErrorsHref: generateRelatedErrorsDiscoverUrl,
          onNodeClick: (nodeSpanId: string) => {
            setSpanId(nodeSpanId);
            setIsFlyoutVisible(true);
          },
        },
      }),
    }),
    [traceId, rangeFrom, rangeTo, transaction, generateRelatedErrorsDiscoverUrl]
  );

  return (
    <>
      <EuiOverlayMask
        maskRef={overlayMaskRef}
        css={{ paddingBlockEnd: '0 !important', overflowY: 'scroll' }}
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
                      defaultMessage: 'Exit full screen waterfall',
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

      {isFlyoutVisible && spanId && (
        <EuiFocusTrap>
          <SpanFlyout
            tracesIndexPattern={tracesIndexPattern}
            spanId={spanId}
            dataView={dataView}
            onCloseFlyout={() => {
              setIsFlyoutVisible(false);
            }}
          />
        </EuiFocusTrap>
      )}
    </>
  );
};
