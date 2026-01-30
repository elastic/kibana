/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiErrorBoundary,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSkeletonText,
  EuiSkeletonTitle,
  EuiTab,
  EuiTabs,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useState } from 'react';
import DocViewerSource from '../../../../../doc_viewer_source';
import DocViewerTable from '../../../../../doc_viewer_table';

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

interface FlyoutTabsProps {
  onClick: (id: string) => void;
  selectedTabId: string;
}
const FlyoutTabs = ({ onClick, selectedTabId }: FlyoutTabsProps) => {
  return tabs.map((tab) => (
    <EuiTab key={tab.id} onClick={() => onClick(tab.id)} isSelected={tab.id === selectedTabId}>
      {tab.name}
    </EuiTab>
  ));
};

export interface Props {
  title: string;
  onCloseFlyout: () => void;
  hit: DataTableRecord | null;
  loading: boolean;
  dataView: DocViewRenderProps['dataView'];
  children: React.ReactNode;
}

export function WaterfallFlyout({ onCloseFlyout, dataView, hit, loading, children, title }: Props) {
  const [selectedTabId, setSelectedTabId] = useState(tabIds.OVERVIEW);
  const flyoutTitleId = useGeneratedHtmlId();
  const flyoutId = useGeneratedHtmlId({ prefix: 'documentDetailFlyout' });

  return (
    <EuiFlyout
      size="s"
      includeFixedHeadersInFocusTrap={false}
      onClose={onCloseFlyout}
      aria-labelledby={flyoutTitleId}
      id={flyoutId}
    >
      <EuiFlyoutHeader>
        <EuiSkeletonTitle isLoading={loading}>
          <EuiTitle size="s">
            <h2 id={flyoutTitleId}>{title}</h2>
          </EuiTitle>
        </EuiSkeletonTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        css={css`
          & .euiFlyoutBody__overflow {
            overflow-y: hidden;
          }
        `}
      >
        {loading || !hit ? (
          <EuiSkeletonText lines={5} />
        ) : (
          <>
            <EuiTabs size="s">
              <FlyoutTabs onClick={setSelectedTabId} selectedTabId={selectedTabId} />
            </EuiTabs>
            <EuiSkeletonText isLoading={loading}>
              {selectedTabId === tabIds.OVERVIEW && hit ? (
                <EuiErrorBoundary>{children}</EuiErrorBoundary>
              ) : null}

              {selectedTabId === tabIds.TABLE && hit ? (
                <DocViewerTable hit={hit} dataView={dataView} />
              ) : null}

              {selectedTabId === tabIds.JSON && hit ? (
                <DocViewerSource
                  id={hit.id}
                  index={hit.raw._index}
                  dataView={dataView}
                  esqlHit={hit}
                  onRefresh={() => {}}
                />
              ) : null}
            </EuiSkeletonText>
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
