/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  useEuiTheme,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiSkeletonTitle,
} from '@elastic/eui';
import { DataTableRecord } from '@kbn/discover-utils';
import { flattenObject } from '@kbn/object-utils';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { useSpan } from '../hooks/use_span';
import { SpanFlyoutBody } from './span_flyout_body';
import { isSpanHit } from '../helpers/is_span';

const flyoutId = 'spanDetailFlyout';

export interface SpanFlyoutProps {
  tracesIndexPattern: string;
  spanId: string;
  dataView: DocViewRenderProps['dataView'];
  onCloseFlyout: () => void;
}

export const SpanFlyout = ({
  tracesIndexPattern,
  spanId,
  dataView,
  onCloseFlyout,
}: SpanFlyoutProps) => {
  const { span, docId, loading } = useSpan({ indexPattern: tracesIndexPattern, spanId });
  const { euiTheme } = useEuiTheme();
  const documentAsHit = useMemo<DataTableRecord | null>(() => {
    if (!span || !docId) return null;

    return {
      id: docId,
      raw: {
        _index: span._index,
        _id: docId,
        _source: span,
      },
      flattened: flattenObject(span),
    };
  }, [docId, span]);

  const isSpan = isSpanHit(documentAsHit);

  return (
    <EuiFlyout
      includeFixedHeadersInFocusTrap={false}
      ownFocus={false}
      css={{ zIndex: (euiTheme.levels.mask as number) + 1, top: '0' }}
      onClose={onCloseFlyout}
      aria-labelledby={flyoutId}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiSkeletonTitle isLoading={loading}>
          <EuiTitle size="m">
            <h2 id={flyoutId}>
              {i18n.translate(
                'unifiedDocViewer.observability.traces.fullScreenWaterfall.spanFlyout.title',
                {
                  defaultMessage: '{docType} document',
                  values: {
                    docType: isSpan
                      ? i18n.translate(
                          'unifiedDocViewer.observability.traces.fullScreenWaterfall.spanFlyout.title.span',
                          { defaultMessage: 'Span' }
                        )
                      : i18n.translate(
                          'unifiedDocViewer.observability.traces.fullScreenWaterfall.spanFlyout.title.transction',
                          { defaultMessage: 'Transaction' }
                        ),
                  },
                }
              )}
            </h2>
          </EuiTitle>
        </EuiSkeletonTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <SpanFlyoutBody
          tracesIndexPattern={tracesIndexPattern}
          hit={documentAsHit}
          dataView={dataView}
          loading={loading}
          onCloseFlyout={onCloseFlyout}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
