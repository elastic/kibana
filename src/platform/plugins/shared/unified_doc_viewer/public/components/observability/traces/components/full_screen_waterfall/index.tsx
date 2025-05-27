/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFocusTrap,
  EuiOverlayMask,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { SPAN_ID_FIELD } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { useRootTransactionContext } from '../../doc_viewer_transaction_overview/hooks/use_root_transaction';
import { SpanFlyout } from './span_flyout';

export interface FullScreenWaterfallProps {
  traceId: string;
  rangeFrom: string;
  rangeTo: string;
  dataView: DocViewRenderProps['dataView'];
  onCloseFullScreen: () => void;
}

export const FullScreenWaterfall = ({
  traceId,
  rangeFrom,
  rangeTo,
  dataView,
  onCloseFullScreen,
}: FullScreenWaterfallProps) => {
  const { transaction } = useRootTransactionContext();
  const [spanId, setSpanId] = useState<string | null>(null);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  let flyout;

  const getParentApi = useCallback(
    () => ({
      getSerializedStateForChild: () => ({
        rawState: {
          traceId,
          rangeFrom,
          rangeTo,
          entryTransactionId: transaction?.[SPAN_ID_FIELD],
          onNodeClick: (item: { id: string }) => {
            setSpanId(item.id);
            setIsFlyoutVisible(true);
          },
        },
      }),
    }),
    [rangeFrom, rangeTo, traceId, transaction]
  );

  if (isFlyoutVisible && spanId) {
    flyout = (
      <SpanFlyout
        indexPattern={'remote_cluster:traces-*'}
        spanId={spanId}
        dataView={dataView}
        onCloseFlyout={() => {
          setIsFlyoutVisible(false);
        }}
      />
    );
  }

  return (
    <>
      <EuiOverlayMask css={{ paddingBlockEnd: '0 !important' }}>
        <EuiFocusTrap scrollLock preventScrollOnFocus css={{ height: '100%', width: '100%' }}>
          <EuiPanel hasShadow={false} css={{ height: '100%', width: '100%' }}>
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
                <EuiButtonIcon
                  data-test-subj="unifiedDocViewerObservabilityTracesFullScreenWaterfallExitFullScreenButton"
                  display="base"
                  iconSize="m"
                  iconType="fullScreenExit"
                  aria-label="fullScreenExit"
                  onClick={() => {
                    onCloseFullScreen();
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem>
                <EmbeddableRenderer
                  type="APM_TRACE_WATERFALL_EMBEDDABLE"
                  getParentApi={getParentApi}
                  hidePanelChrome={true}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFocusTrap>
      </EuiOverlayMask>

      {flyout}
    </>
  );
};
