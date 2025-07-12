/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSkeletonText, EuiTab, EuiTabs } from '@elastic/eui';
import { DataTableRecord } from '@kbn/discover-utils';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { KibanaSectionErrorBoundary } from '@kbn/shared-ux-error-boundary';
import SpanOverview from '../../../doc_viewer_span_overview';
import TransactionOverview from '../../../doc_viewer_transaction_overview';
import DocViewerTable from '../../../../../doc_viewer_table';
import DocViewerSource from '../../../../../doc_viewer_source';
import { useDataSourcesContext } from '../../../hooks/use_data_sources';
import { isSpanHit } from '../helpers/is_span';

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
  hit: DataTableRecord | null;
  loading: boolean;
  dataView: DocViewRenderProps['dataView'];
  onCloseFlyout: () => void;
}

export const SpanFlyoutBody = ({ hit, loading, dataView }: SpanFlyoutProps) => {
  const [selectedTabId, setSelectedTabId] = useState(tabIds.OVERVIEW);
  const isSpan = isSpanHit(hit);
  const { indexes } = useDataSourcesContext();
  const onSelectedTabChanged = (id: string) => setSelectedTabId(id);

  const renderTabs = () => {
    return tabs.map((tab) => (
      <EuiTab
        key={tab.id}
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  return (
    <>
      {loading || !hit ? (
        <EuiSkeletonText lines={5} />
      ) : (
        <>
          <EuiTabs size="s">{renderTabs()}</EuiTabs>
          <EuiSkeletonText isLoading={loading}>
            {selectedTabId === tabIds.OVERVIEW && (
              <KibanaSectionErrorBoundary
                sectionName={i18n.translate(
                  'unifiedDocViewer.observability.traces.spanFlyout.overview.kibanaSectionErrorBoundary.sectionName',
                  { defaultMessage: 'Overview' }
                )}
              >
                {isSpan ? (
                  <SpanOverview
                    hit={hit}
                    indexes={indexes}
                    showWaterfall={false}
                    showActions={false}
                    dataView={dataView}
                  />
                ) : (
                  <TransactionOverview
                    hit={hit}
                    indexes={indexes}
                    showWaterfall={false}
                    showActions={false}
                    dataView={dataView}
                  />
                )}
              </KibanaSectionErrorBoundary>
            )}

            {selectedTabId === tabIds.TABLE && <DocViewerTable hit={hit} dataView={dataView} />}

            {selectedTabId === tabIds.JSON && (
              <DocViewerSource
                id={hit.id}
                index={hit.raw._index}
                dataView={dataView}
                esqlHit={hit}
                onRefresh={() => {}}
                /* We're already passing the document in this case, so this refresh won't have a chance to run.
            It's handled the same way in src/platform/plugins/shared/unified_doc_viewer/public/plugin.tsx */
              />
            )}
          </EuiSkeletonText>
        </>
      )}
    </>
  );
};
