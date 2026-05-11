/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiResizeObserver } from '@elastic/eui';
import { UnifiedTabs, type UnifiedTabsProps, type UnifiedTabsRef } from '@kbn/unified-tabs';
import { AppMenuComponent } from '@kbn/core-chrome-app-menu-components';
import { SingleTabView, type SingleTabViewProps } from '../single_tab_view';
import { LeaderKeyShortcuts, type LeaderKeyShortcut } from './leader_key_shortcuts';
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
const SHORTCUTS_LEADER_KEY = 't';
const SHORTCUTS_LEADER_KEY_DESCRIPTION = i18n.translate('discover.tabsView.shortcut.tabModeLabel', {
  defaultMessage: 'Tab',
});

export const TabsView = (props: SingleTabViewProps) => {
  const services = useDiscoverServices();
  const dispatch = useInternalStateDispatch();
  const items = useInternalStateSelector(selectAllTabs);
  const recentlyClosedItems = useInternalStateSelector(selectRecentlyClosedTabs);
  const currentTabId = useInternalStateSelector((state) => state.tabs.unsafeCurrentId);
  const { getPreviewData } = usePreviewData(props.runtimeStateManager);
  const hideTabsBar = useInternalStateSelector(selectIsTabsBarHidden);
  const unsavedTabIds = useInternalStateSelector((state) => state.tabs.unsavedIds);
  const currentDataView = useCurrentTabRuntimeState((tab) => tab.currentDataView$);
  const scopedEbtManager = useCurrentTabRuntimeState((tab) => tab.scopedEbtManager$);

  const {
    shouldCollapseAppMenu,
    onResize,
    getTopTabMenuItems,
    getAdditionalTabMenuItems,
    topNavMenuItems,
  } = useAppMenuData({ currentDataView });

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

  const unifiedTabsRef = useRef<UnifiedTabsRef | null>(null);
  const shortcuts = useMemo<LeaderKeyShortcut[]>(
    () => [
      {
        key: 'n',
        label: 'n',
        description: i18n.translate('discover.tabsView.shortcut.newTab', {
          defaultMessage: 'New',
        }),
        onTrigger: () => {
          void unifiedTabsRef.current?.add();
        },
      },
      {
        key: 'x',
        label: 'x',
        description: i18n.translate('discover.tabsView.shortcut.closeCurrentTab', {
          defaultMessage: 'Close',
        }),
        onTrigger: () => {
          void unifiedTabsRef.current?.closeSelected();
        },
      },
      {
        key: 'u',
        label: 'u',
        description: i18n.translate('discover.tabsView.shortcut.restoreLastClosedTab', {
          defaultMessage: 'Reopen',
        }),
        onTrigger: () => {
          void unifiedTabsRef.current?.restoreLastClosed();
        },
      },
      {
        key: 'ArrowLeft',
        label: '←',
        description: i18n.translate('discover.tabsView.shortcut.previousTab', {
          defaultMessage: 'Previous',
        }),
        onTrigger: () => {
          void unifiedTabsRef.current?.selectPrevious();
        },
      },
      {
        key: 'ArrowRight',
        label: '→',
        description: i18n.translate('discover.tabsView.shortcut.nextTab', {
          defaultMessage: 'Next',
        }),
        onTrigger: () => {
          void unifiedTabsRef.current?.selectNext();
        },
      },
      {
        key: 'd',
        label: 'd',
        description: i18n.translate('discover.tabsView.shortcut.duplicateCurrentTab', {
          defaultMessage: 'Duplicate',
        }),
        onTrigger: () => {
          void unifiedTabsRef.current?.duplicateSelected();
        },
      },
      {
        key: 'r',
        label: 'r',
        description: i18n.translate('discover.tabsView.shortcut.renameCurrentTab', {
          defaultMessage: 'Rename',
        }),
        onTrigger: () => {
          unifiedTabsRef.current?.enterRenamingMode();
        },
      },
    ],
    []
  );

  return (
    /**
     * AppMenuComponent handles responsiveness on its own, however, there are some edge cases e.g opening push flyout
     * where this might not be good enough.
     */
    <EuiResizeObserver onResize={onResize}>
      {(resizeRef) => (
        <div ref={resizeRef} className="eui-fullHeight">
          <UnifiedTabs
            ref={unifiedTabsRef}
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
            getTopTabMenuItems={getTopTabMenuItems}
            getAdditionalTabMenuItems={getAdditionalTabMenuItems}
            appendRight={
              <AppMenuComponent config={topNavMenuItems} isCollapsed={shouldCollapseAppMenu} />
            }
          />
          {!hideTabsBar && (
            <LeaderKeyShortcuts
              leaderKey={SHORTCUTS_LEADER_KEY}
              leaderKeyDescription={SHORTCUTS_LEADER_KEY_DESCRIPTION}
              shortcuts={shortcuts}
            />
          )}
        </div>
      )}
    </EuiResizeObserver>
  );
};
