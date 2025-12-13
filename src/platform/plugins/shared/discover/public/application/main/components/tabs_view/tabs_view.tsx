/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useContext } from 'react';
import { UnifiedTabs, type UnifiedTabsProps } from '@kbn/unified-tabs';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { AppMenu } from '@kbn/app-menu';
import useObservable from 'react-use/lib/useObservable';
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
import { discoverTopNavMenuContext } from '../top_nav/discover_topnav_menu';

const MAX_TABS_COUNT = 25;

const VerticalRule = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <span
      css={css`
        width: ${euiTheme.border.width.thin};
        height: 28px;
        background-color: ${euiTheme.colors.borderBasePlain};
      `}
    />
  );
};

export const TabsBarWithAppMenu = (props: SingleTabViewProps) => {
  const services = useDiscoverServices();
  const dispatch = useInternalStateDispatch();
  const items = useInternalStateSelector(selectAllTabs);
  const recentlyClosedItems = useInternalStateSelector(selectRecentlyClosedTabs);
  const currentTabId = useInternalStateSelector((state) => state.tabs.unsafeCurrentId);
  const { getPreviewData } = usePreviewData(props.runtimeStateManager);
  const hideTabsBar = useInternalStateSelector(selectIsTabsBarHidden);
  const unsavedTabIds = useInternalStateSelector((state) => state.tabs.unsavedIds);
  const { euiTheme } = useEuiTheme();

  const { topNavMenu$ } = useContext(discoverTopNavMenuContext);
  const topNavMenuItems = useObservable(topNavMenu$, topNavMenu$.getValue());

  const scopedEbtManager = useCurrentTabRuntimeState(
    props.runtimeStateManager,
    (state) => state.scopedEbtManager$
  );

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

  if (hideTabsBar) {
    return null;
  }

  void topNavMenuItems;

  return (
    <div
      css={css`
        width: 100%;
        background-color: ${euiTheme.colors.lightestShade};
      `}
    >
      <EuiFlexGroup gutterSize="xs" alignItems="center" wrap={false} responsive={false}>
        <EuiFlexItem
          grow={true}
          css={css`
            overflow: hidden;
          `}
        >
          <UnifiedTabs
            services={services}
            items={items}
            selectedItemId={currentTabId}
            recentlyClosedItems={recentlyClosedItems}
            unsavedItemIds={unsavedTabIds}
            maxItemsCount={MAX_TABS_COUNT}
            createItem={createItem}
            getPreviewData={getPreviewData}
            onChanged={onChanged}
            onEBTEvent={onEvent}
            onClearRecentlyClosed={onClearRecentlyClosed}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <VerticalRule />
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={css`
            margin-right: ${euiTheme.size.s};
          `}
        >
          <AppMenu
            config={{
              items: [
                {
                  label: 'Test',
                  run: () => {},
                  order: 1,
                  id: 'placeholder',
                  iconType: 'gear',
                },
              ],
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

export const TabsView = (props: SingleTabViewProps) => {
  const items = useInternalStateSelector(selectAllTabs);
  const currentTabId = useInternalStateSelector((state) => state.tabs.unsafeCurrentId);

  const renderContent: UnifiedTabsProps['renderContent'] = useCallback(
    () => <SingleTabView key={currentTabId} {...props} />,
    [currentTabId, props]
  );

  return renderContent(items.find((item) => item.id === currentTabId) || items[0]);
};
