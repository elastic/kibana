/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import { css } from '@emotion/react';
import { EuiEmptyPrompt } from '@elastic/eui';
import type { DiscoverSessionApiData } from '@kbn/as-code-discover-schema';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import type { ChangeHistoryPreviewRenderFn } from '@kbn/change-history-ui';
import { i18n } from '@kbn/i18n';
import { UnifiedTabs, type TabItem, type UnifiedTabsProps } from '@kbn/unified-tabs';
import { buildDiscoverSessionEmbeddableInput } from '../agent_builder/discover_session_inline_state';
import type { SearchEmbeddableApi, SearchEmbeddablePanelApiState } from '../embeddable/types';
import { DiscoverSessionHistorySearchBar } from './discover_session_history_search_bar';
import { useDiscoverServices } from '../hooks/use_discover_services';

const containerStyles = css({ height: '100%', width: '100%', overflow: 'auto' });
const embeddableStyles = css({
  height: '100%',
  minHeight: 400,
  display: 'flex',
  flexDirection: 'column',
});
const embeddableFillStyles = css({ flex: 1, minHeight: 0 });
const NO_RECENTLY_CLOSED_TABS: UnifiedTabsProps['recentlyClosedItems'] = [];
const noop = () => {};
// tabs can't be created in the preview, but UnifiedTabs requires a factory
const createUnusedItem = (): TabItem => ({ id: 'unused', label: '' });

type PreviewProps = Parameters<ChangeHistoryPreviewRenderFn>[0];

/**
 * Renders a snapshot of a Discover session read-only, using the search embeddable (one tab at a time).
 */
export const DiscoverSessionHistoryPreview = ({ change }: PreviewProps): JSX.Element => {
  const services = useDiscoverServices();
  const { data } = services;
  const snapshot = change.snapshot as DiscoverSessionApiData;
  const [selectedTabId, setSelectedTabId] = useState<string | undefined>();
  const selectedTab = snapshot.tabs.find((tab) => tab.id === selectedTabId) ?? snapshot.tabs[0];

  // snapshots without a stored time range inherit the one currently selected in the app
  const timeRange = useMemo(
    () => selectedTab?.time_range ?? data.query.timefilter.timefilter.getTime(),
    [selectedTab, data.query.timefilter.timefilter]
  );

  const serializedState = useMemo(
    () =>
      selectedTab
        ? buildDiscoverSessionEmbeddableInput({ ...snapshot, tabs: [selectedTab] }, timeRange)
        : undefined,
    [snapshot, selectedTab, timeRange]
  );

  const parentApi = useMemo(
    () => ({
      getSerializedStateForChild: () => serializedState,
      viewMode$: new BehaviorSubject('view'),
    }),
    [serializedState]
  );

  const tabItems = useMemo<TabItem[]>(
    () => snapshot.tabs.map(({ id, label }) => ({ id, label })),
    [snapshot.tabs]
  );

  const onTabsChanged = useCallback<UnifiedTabsProps['onChanged']>(
    ({ selectedItem }) => setSelectedTabId(selectedItem?.id),
    []
  );

  const renderContent = useCallback(
    () => (
      <div css={embeddableStyles}>
        {selectedTab && <DiscoverSessionHistorySearchBar tab={selectedTab} timeRange={timeRange} />}
        <div css={embeddableFillStyles}>
          {/* the embeddable only reads its initial state, so remount per version and tab */}
          <EmbeddableRenderer<SearchEmbeddablePanelApiState, SearchEmbeddableApi>
            key={`${change.id}:${selectedTab?.id}`}
            maybeId={undefined}
            type={SEARCH_EMBEDDABLE_TYPE}
            getParentApi={() => parentApi}
            hidePanelChrome
          />
        </div>
      </div>
    ),
    [change.id, selectedTab, timeRange, parentApi]
  );

  if (!selectedTab) {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        data-test-subj="discoverChangeHistoryPreviewEmpty"
        title={
          <h2>
            {i18n.translate('discover.changeHistory.previewEmptyTitle', {
              defaultMessage: 'Nothing to preview',
            })}
          </h2>
        }
      />
    );
  }

  return (
    <div css={containerStyles} data-test-subj="discoverChangeHistoryPreview">
      <UnifiedTabs
        services={services}
        items={tabItems}
        selectedItemId={selectedTab.id}
        recentlyClosedItems={NO_RECENTLY_CLOSED_TABS}
        // the preview is read-only: tabs can only be selected
        disableCloseButton
        disableInlineLabelEditing
        disableDragAndDrop
        disableTabsBarMenu
        customNewTabButton={<span />}
        createItem={createUnusedItem}
        onChanged={onTabsChanged}
        onClearRecentlyClosed={noop}
        onEBTEvent={noop}
        renderContent={renderContent}
      />
    </div>
  );
};
