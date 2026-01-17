/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useContext, useState } from 'react';
import { EuiResizeObserver, type EuiResizeObserverProps } from '@elastic/eui';
import { UnifiedTabs, type UnifiedTabsProps } from '@kbn/unified-tabs';
import useObservable from 'react-use/lib/useObservable';
import { AppMenuComponent, type AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { css } from '@emotion/react';
import { SingleTabView, type SingleTabViewProps } from '../single_tab_view';
import { discoverTopNavMenuContext } from '../top_nav/discover_topnav_menu';
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

const MAX_TABS_COUNT = 25;
const APP_MENU_COLLAPSE_THRESHOLD = 800;

export const TabsView = (props: SingleTabViewProps) => {
  const services = useDiscoverServices();
  const dispatch = useInternalStateDispatch();
  const items = useInternalStateSelector(selectAllTabs);
  const [shouldCollapseAppMenu, setShouldCollapseAppMenu] = useState(false);
  const recentlyClosedItems = useInternalStateSelector(selectRecentlyClosedTabs);
  const currentTabId = useInternalStateSelector((state) => state.tabs.unsafeCurrentId);
  const { getPreviewData } = usePreviewData(props.runtimeStateManager);
  const hideTabsBar = useInternalStateSelector(selectIsTabsBarHidden);
  const unsavedTabIds = useInternalStateSelector((state) => state.tabs.unsavedIds);

  const scopedEbtManager = useCurrentTabRuntimeState(
    props.runtimeStateManager,
    (state) => state.scopedEbtManager$
  );

  const onResize: EuiResizeObserverProps['onResize'] = useCallback((dimensions) => {
    if (!dimensions) return;
    setShouldCollapseAppMenu(dimensions.width < APP_MENU_COLLAPSE_THRESHOLD);
  }, []);

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

  const { topNavMenu$ } = useContext(discoverTopNavMenuContext);
  const topNavMenuItems = useObservable(topNavMenu$, topNavMenu$.getValue());

  return (
    /**
     * AppMenuComponent handles responsiveness on its own, however, there are some edge cases e.g opening push flyout
     * where this might not be good enough.
     */
    <EuiResizeObserver onResize={onResize}>
      {(resizeRef) => (
        <div
          ref={resizeRef}
          /** EuiResizeObserver requires the ref container to have defined dimensions. */
          css={css`
            height: 100%;
            width: 100%;
          `}
        >
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
            appendRight={
              <AppMenuComponent
                config={topNavMenuItems as AppMenuConfig}
                isCollapsed={shouldCollapseAppMenu}
              />
            }
          />
        </div>
      )}
    </EuiResizeObserver>
  );
};
