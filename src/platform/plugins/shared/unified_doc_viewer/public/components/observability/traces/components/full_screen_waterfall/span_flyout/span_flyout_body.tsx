/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiErrorBoundary, EuiSkeletonText, EuiTab, EuiTabs } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useEffect, useState } from 'react';
import DocViewerSource from '../../../../../doc_viewer_source';
import DocViewerTable from '../../../../../doc_viewer_table';
import Overview from '../../../doc_viewer_overview';
import type { OverviewApi, TraceOverviewSections } from '../../../doc_viewer_overview/overview';
import { useDataSourcesContext } from '../../../hooks/use_data_sources';

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
  hit: DataTableRecord | null;
  loading: boolean;
  dataView: DocViewRenderProps['dataView'];
  onCloseFlyout: () => void;
  activeSection?: TraceOverviewSections;
}

export const SpanFlyoutBody = ({ hit, loading, dataView, activeSection }: SpanFlyoutProps) => {
  const [selectedTabId, setSelectedTabId] = useState(tabIds.OVERVIEW);
  const { indexes } = useDataSourcesContext();
  const onSelectedTabChanged = (id: string) => setSelectedTabId(id);
  const [flyoutRef, setFlyoutRef] = useState<OverviewApi | null>(null);

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

  useEffect(() => {
    if (activeSection && flyoutRef) {
      flyoutRef.openAndScrollToSection(activeSection);
    }
  }, [activeSection, flyoutRef]);

  return (
    <>
      {loading || !hit ? (
        <EuiSkeletonText lines={5} />
      ) : (
        <>
          <EuiTabs size="s">{renderTabs()}</EuiTabs>
          <EuiSkeletonText isLoading={loading}>
            {selectedTabId === tabIds.OVERVIEW && (
              <EuiErrorBoundary>
                <Overview
                  ref={setFlyoutRef}
                  hit={hit}
                  indexes={indexes}
                  showWaterfall={false}
                  showActions={false}
                  dataView={dataView}
                />
              </EuiErrorBoundary>
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
