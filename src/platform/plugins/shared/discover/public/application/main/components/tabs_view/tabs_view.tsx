/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiResizeObserver } from '@elastic/eui';
import { UnifiedTabs, type UnifiedTabsProps } from '@kbn/unified-tabs';
import { AppMenuComponent } from '@kbn/core-chrome-app-menu-components';
import { SingleTabView, type SingleTabViewProps } from '../single_tab_view';
import {
  createTabItem,
  internalStateActions,
  selectAllTabs,
  selectRecentlyClosedTabs,
  selectIsTabsBarHidden,
  useInternalStateDispatch,
  useInternalStateSelector,
  useCurrentTabRuntimeState,
} from '../../state_management/redux';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { usePreviewData } from './use_preview_data';
import { useAppMenuData } from './use_app_menu_data';

const MAX_TABS_COUNT = 25;

export const TabsView = (props: SingleTabViewProps) => {
  const services = useDiscoverServices();
  const dispatch = useInternalStateDispatch();
  const items = useInternalStateSelector(selectAllTabs);
  const recentlyClosedItems = useInternalStateSelector(selectRecentlyClosedTabs);
  const currentTabId = useInternalStateSelector((state) => state.tabs.unsafeCurrentId);
  const { getPreviewData } = usePreviewData(props.runtimeStateManager);
  const hideTabsBar = useInternalStateSelector(selectIsTabsBarHidden);
  const unsavedTabIds = useInternalStateSelector((state) => state.tabs.unsavedIds);
  const currentDataView = useCurrentTabRuntimeState(
    props.runtimeStateManager,
    (tab) => tab.currentDataView$
  );

  const scopedEbtManager = useCurrentTabRuntimeState(
    props.runtimeStateManager,
    (state) => state.scopedEbtManager$
  );

  const { shouldCollapseAppMenu, onResize, getAdditionalTabMenuItems, topNavMenuItems } =
    useAppMenuData({ currentDataView });

  const onEvent: UnifiedTabsProps['onEBTEvent'] = useCallback(
    (event) => {
      void scopedEbtManager.trackTabsEvent(event);
    },
    [scopedEbtManager]
  );

  const onChanged: UnifiedTabsProps['onChanged'] = useCallback(
    (updateState) => dispatch(internalStateActions.updateTabs(updateState)),
    [dispatch]
  );

  const onClearRecentlyClosed: UnifiedTabsProps['onClearRecentlyClosed'] = useCallback(
    () => dispatch(internalStateActions.clearRecentlyClosedTabs()),
    [dispatch]
  );

  const createItem: UnifiedTabsProps['createItem'] = useCallback(
    () => createTabItem(items),
    [items]
  );

  const renderContent: UnifiedTabsProps['renderContent'] = useCallback(
    () => <SingleTabView key={currentTabId} {...props} />,
    [currentTabId, props]
  );

  return (
    /**
     * AppMenuComponent handles responsiveness on its own, however, there are some edge cases e.g opening push flyout
     * where this might not be good enough.
     */
    <EuiResizeObserver onResize={onResize}>
      {(resizeRef) => (
        <div ref={resizeRef}>
          <UnifiedTabs
            services={services}
            items={items}
            selectedItemId={currentTabId}
            recentlyClosedItems={recentlyClosedItems}
            unsavedItemIds={unsavedTabIds}
            maxItemsCount={MAX_TABS_COUNT}
            hideTabsBar={hideTabsBar}
            createItem={createItem}
            getPreviewData={getPreviewData}
            renderContent={renderContent}
            onChanged={onChanged}
            onEBTEvent={onEvent}
            onClearRecentlyClosed={onClearRecentlyClosed}
            getAdditionalTabMenuItems={getAdditionalTabMenuItems}
            appendRight={
              <AppMenuComponent config={topNavMenuItems} isCollapsed={shouldCollapseAppMenu} />
            }
          />
        </div>
      )}
    </EuiResizeObserver>
  );
};
