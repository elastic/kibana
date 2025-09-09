/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef, useState } from 'react';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
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
import { i18n } from '@kbn/i18n';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { where } from '@kbn/esql-composer';
import { SPAN_ID_FIELD, TRACE_ID_FIELD } from '@kbn/discover-utils';
import { SpanFlyout } from './span_flyout';
import { useDataSourcesContext } from '../../hooks/use_data_sources';
import { ExitFullScreenButton } from './exit_full_screen_button';
import { useGetGenerateDiscoverLink } from '../../hooks/use_get_generate_discover_link';

export interface FullScreenWaterfallProps {
  traceId: string;
  rangeFrom: string;
  rangeTo: string;
  dataView: DocViewRenderProps['dataView'];
  serviceName: string;
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
  const [spanId, setSpanId] = useState<string | null>(null);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const overlayMaskRef = useRef<HTMLDivElement>(null);
  const { euiTheme } = useEuiTheme();
  const { indexes } = useDataSourcesContext();
  const { generateDiscoverLink } = useGetGenerateDiscoverLink({
    indexPattern: [indexes.apm.errors, indexes.logs],
  });

  const generateRelatedErrorsDiscoverUrl = useCallback(
    (docId: string) => {
      return generateDiscoverLink(
        where(`QSTR("${TRACE_ID_FIELD}:${traceId} AND ${SPAN_ID_FIELD}:${docId}")`)
      );
    },
    [generateDiscoverLink, traceId]
  );

  const getParentApi = useCallback(
    () => ({
      getSerializedStateForChild: () => ({
        rawState: {
          traceId,
          rangeFrom,
          rangeTo,
          serviceName,
          scrollElement: overlayMaskRef.current,
          getRelatedErrorsHref: generateRelatedErrorsDiscoverUrl,
          onNodeClick: (nodeSpanId: string) => {
            setSpanId(nodeSpanId);
            setIsFlyoutVisible(true);
          },
          mode: 'full',
        },
      }),
    }),
    [traceId, rangeFrom, rangeTo, serviceName, generateRelatedErrorsDiscoverUrl]
  );

  return (
    <>
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

      {isFlyoutVisible && spanId && (
        <EuiFocusTrap>
          <SpanFlyout
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
