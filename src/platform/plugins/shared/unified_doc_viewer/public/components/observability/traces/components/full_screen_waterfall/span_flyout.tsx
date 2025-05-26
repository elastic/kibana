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
  useGeneratedHtmlId,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiSkeletonText,
} from '@elastic/eui';
import { PARENT_ID_FIELD } from '@kbn/discover-utils';
import { flattenObject } from '@kbn/object-utils';
import React from 'react';
import { i18n } from '@kbn/i18n';
import SpanOverview from '../../doc_viewer_span_overview';
import TransactionOverview from '../../doc_viewer_transaction_overview';
import { useSpan } from './hooks/use_span';

export interface SpanFlyoutProps {
  indexPattern: string;
  spanId: string;
  onCloseFlyout: () => void;
}

export const SpanFlyout = ({ indexPattern, spanId, onCloseFlyout }: SpanFlyoutProps) => {
  const { span, loading } = useSpan({ indexPattern, spanId });
  const { euiTheme } = useEuiTheme();

  const flyoutId = useGeneratedHtmlId({
    prefix: 'spanDetailFlyout',
  });

  // TODO I think I won’t use the hit and will go with the flattened for the overviews, but not sure yet.
  const detailDocument = {
    id: 'test',
    raw: {},
    flattened: flattenObject(span || {}),
  };

  return (
    <EuiFlyout
      includeFixedHeadersInFocusTrap={false}
      ownFocus={false}
      css={{ zIndex: (euiTheme.levels.mask as number) + 1, top: '0' }}
      onClose={onCloseFlyout}
      aria-labelledby={flyoutId}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutId}>
            {i18n.translate('unifiedDocViewer.observability.traces.fullScreenWaterfall.title', {
              defaultMessage: 'Detail',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiSkeletonText isLoading={loading}>
          {detailDocument &&
            (detailDocument.flattened[PARENT_ID_FIELD] ? (
              <SpanOverview
                hit={detailDocument}
                transactionIndexPattern={'remote_cluster:traces-*'} // TODO this needs to be set correctly!
                showWaterfall={false}
                showActions={false}
              />
            ) : (
              <TransactionOverview
                hit={detailDocument}
                tracesIndexPattern={'remote_cluster:traces-*'} // TODO this needs to be set correctly!
                showWaterfall={false}
                showActions={false}
              />
            ))}
        </EuiSkeletonText>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
