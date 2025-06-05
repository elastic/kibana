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
  EuiSkeletonText,
  EuiTab,
  EuiTabs,
  EuiSkeletonTitle,
} from '@elastic/eui';
import { DataTableRecord, PARENT_ID_FIELD } from '@kbn/discover-utils';
import { flattenObject } from '@kbn/object-utils';
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import SpanOverview from '../../doc_viewer_span_overview';
import TransactionOverview from '../../doc_viewer_transaction_overview';
import { useSpan } from './hooks/use_span';
import DocViewerTable from '../../../../doc_viewer_table';
import DocViewerSource from '../../../../doc_viewer_source';

const flyoutId = 'spanDetailFlyout';
const tabIds = {
  OVERVIEW: 'unifiedDocViewerTracesSpanFlyoutOverview',
  TABLE: 'unifiedDocViewerTracesSpanFlyoutTable',
  JSON: 'unifiedDocViewerTracesSpanFlyoutJson',
};

const tabs = [
  {
    id: tabIds.OVERVIEW,
    name: i18n.translate(
      'unifiedDocViewer.observability.traces.fullScreenWaterfall.tabs.overview',
      {
        defaultMessage: 'Overview',
      }
    ),
  },
  {
    id: tabIds.TABLE,
    name: i18n.translate('unifiedDocViewer.observability.traces.fullScreenWaterfall.tabs.table', {
      defaultMessage: 'Table',
    }),
  },
  {
    id: tabIds.JSON,
    name: i18n.translate('unifiedDocViewer.observability.traces.fullScreenWaterfall.tabs.json', {
      defaultMessage: 'JSON',
    }),
  },
];

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
  const [selectedTabId, setSelectedTabId] = useState(tabIds.OVERVIEW);
  const { euiTheme } = useEuiTheme();
  const documentAsHit: DataTableRecord | null = useMemo(() => {
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
  const isSpan = !!documentAsHit?.flattened[PARENT_ID_FIELD];
  const onSelectedTabChanged = (id: string) => setSelectedTabId(id);

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiTab
        key={index}
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
      >
        {tab.name}
      </EuiTab>
    ));
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
        <EuiSkeletonTitle isLoading={loading}>
          <EuiTitle size="m">
            <h2 id={flyoutId}>
              {i18n.translate('unifiedDocViewer.observability.traces.fullScreenWaterfall.title', {
                defaultMessage: '{docType} document',
                values: {
                  docType: isSpan ? 'Span' : 'Transaction',
                },
              })}
            </h2>
          </EuiTitle>
        </EuiSkeletonTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {loading || !documentAsHit ? (
          <EuiSkeletonText lines={5} />
        ) : (
          <>
            <EuiTabs size="s">{renderTabs()}</EuiTabs>
            <EuiSkeletonText isLoading={loading}>
              {selectedTabId === tabIds.OVERVIEW ? (
                isSpan ? (
                  <SpanOverview
                    hit={documentAsHit}
                    tracesIndexPattern={tracesIndexPattern}
                    showWaterfall={false}
                    showActions={false}
                    dataView={dataView}
                  />
                ) : (
                  <TransactionOverview
                    hit={documentAsHit}
                    tracesIndexPattern={tracesIndexPattern}
                    showWaterfall={false}
                    showActions={false}
                    dataView={dataView}
                  />
                )
              ) : selectedTabId === tabIds.TABLE ? (
                <DocViewerTable hit={documentAsHit} dataView={dataView} />
              ) : (
                <DocViewerSource
                  id={documentAsHit.id}
                  index={documentAsHit.raw._index}
                  dataView={dataView}
                  esqlHit={documentAsHit}
                  onRefresh={() => {}}
                  /* We're already passing the document in this case, so this refresh won't have a chance to run.
                  It's handled the same way in src/platform/plugins/shared/unified_doc_viewer/public/plugin.tsx */
                />
              )}
            </EuiSkeletonText>
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
