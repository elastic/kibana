/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiEmptyPrompt,
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
  type EuiFlyoutProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useState } from 'react';
import { useDocViewerSpanLogViewedEvent } from '@kbn/unified-doc-viewer';
import DocViewerSource from '../../../../../doc_viewer_source';
import DocViewerTable from '../../../../../doc_viewer_table';
import { getUnifiedDocViewerServices } from '../../../../../../plugin';
import { useOriginDocType } from '../../../../../doc_viewer_flyout/origin_doc_type_context';
import type { FlyoutContentId } from '../../../common/constants';

const tabIds = {
  OVERVIEW: 'unifiedDocViewerTracesDocDetailFlyoutOverview',
  TABLE: 'unifiedDocViewerTracesDocDetailFlyoutTable',
  JSON: 'unifiedDocViewerTracesDocDetailFlyoutJson',
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

const NotFoundPrompt = () => (
  <EuiEmptyPrompt
    data-test-subj="unifiedDocViewerWaterfallFlyoutNotFound"
    iconType="search"
    titleSize="s"
    title={
      <h2>
        {i18n.translate(
          'unifiedDocViewer.observability.traces.fullScreenWaterfall.flyout.notFound.title',
          { defaultMessage: 'Document not found' }
        )}
      </h2>
    }
    body={
      <p>
        {i18n.translate(
          'unifiedDocViewer.observability.traces.fullScreenWaterfall.flyout.notFound.body',
          { defaultMessage: 'The document could not be found. It may no longer be available.' }
        )}
      </p>
    }
  />
);

const FetchErrorPrompt = ({ error }: { error: string }) => (
  <EuiEmptyPrompt
    data-test-subj="unifiedDocViewerWaterfallFlyoutFetchError"
    iconType="warning"
    iconColor="danger"
    titleSize="s"
    title={
      <h2>
        {i18n.translate(
          'unifiedDocViewer.observability.traces.fullScreenWaterfall.flyout.fetchError.title',
          { defaultMessage: 'Unable to load document' }
        )}
      </h2>
    }
    body={<p>{error}</p>}
  />
);

export interface Props {
  title: string;
  onCloseFlyout: EuiFlyoutProps['onClose'];
  hit: DataTableRecord | null;
  loading: boolean;
  error?: string | null;
  dataView: DocViewRenderProps['dataView'];
  dataTestSubj?: string;
  hasAnimation?: boolean;
  flyoutContentId: FlyoutContentId;
  children: React.ReactNode;
  skipNextEventReport?: boolean;
  size?: EuiFlyoutProps['size'];
}

export function WaterfallFlyout({
  onCloseFlyout,
  dataView,
  hit,
  loading,
  error,
  children,
  title,
  dataTestSubj,
  hasAnimation,
  flyoutContentId,
  skipNextEventReport,
  size = 's',
}: Props) {
  const { analytics } = getUnifiedDocViewerServices();
  const [selectedTabId, setSelectedTabId] = useState(tabIds.OVERVIEW);
  const flyoutTitleId = useGeneratedHtmlId();
  const flyoutId = useGeneratedHtmlId({ prefix: 'documentDetailFlyout' });
  const originDocType = useOriginDocType();

  useDocViewerSpanLogViewedEvent({
    reportEvent: analytics.reportEvent,
    originDocType,
    contentId: flyoutContentId,
    tabId: selectedTabId,
    hit,
    skipNextReport: skipNextEventReport,
  });

  return (
    <EuiFlyout
      data-test-subj={dataTestSubj}
      size={size}
      includeFixedHeadersInFocusTrap={false}
      onClose={onCloseFlyout}
      aria-labelledby={flyoutTitleId}
      id={flyoutId}
      hasAnimation={hasAnimation}
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
        {loading ? (
          <EuiSkeletonText lines={5} />
        ) : !hit && error ? (
          <FetchErrorPrompt error={error} />
        ) : !hit ? (
          <NotFoundPrompt />
        ) : (
          <>
            <EuiTabs size="s">
              <FlyoutTabs onClick={setSelectedTabId} selectedTabId={selectedTabId} />
            </EuiTabs>
            <EuiSkeletonText isLoading={loading}>
              {selectedTabId === tabIds.OVERVIEW ? (
                <EuiErrorBoundary>{children}</EuiErrorBoundary>
              ) : null}

              {selectedTabId === tabIds.TABLE ? (
                <DocViewerTable hit={hit} dataView={dataView} />
              ) : null}

              {selectedTabId === tabIds.JSON ? (
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
