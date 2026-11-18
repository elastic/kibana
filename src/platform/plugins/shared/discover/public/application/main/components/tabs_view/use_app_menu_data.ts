/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import type { UnifiedTabsProps } from '@kbn/unified-tabs';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/common';
import {
  internalStateActions,
  selectAllTabs,
  selectSplitGroup,
  useInternalStateDispatch,
  useInternalStateSelector,
} from '../../state_management/redux';
import { useTopNavMenuItems } from '../top_nav/use_top_nav_menu_items';
import { useCurrentTabMenuActions } from '../../hooks/use_current_tab_menu_actions';

interface UseAppMenuDataParams {
  currentDataView: DataView | undefined;
}

interface UseAppMenuDataResult {
  getTopTabMenuItems: UnifiedTabsProps['getTopTabMenuItems'];
  getAdditionalTabMenuItems: UnifiedTabsProps['getAdditionalTabMenuItems'];
  topNavMenuItems: AppMenuConfig | undefined;
  shareAction: ReturnType<typeof useTopNavMenuItems>['shareAction'];
}

export const useAppMenuData = ({ currentDataView }: UseAppMenuDataParams): UseAppMenuDataResult => {
  const allTabs = useInternalStateSelector(selectAllTabs);
  const currentTabId = useInternalStateSelector((state) => state.tabs.unsafeCurrentId);
  const { canSwitchLanguageMode, isDataViewMode, openInspector, switchLanguageMode } =
    useCurrentTabMenuActions({ currentDataView });

  const getTopTabMenuItems = useCallback<NonNullable<UnifiedTabsProps['getTopTabMenuItems']>>(
    (item) => {
      const tab = allTabs.find((t) => t.id === item.id);
      const isCurrentTab = tab?.id === currentTabId;

      if (!isCurrentTab) {
        return [];
      }

      return [
        {
          'data-test-subj': 'unifiedTabs_tabMenuItem_inspect',
          name: 'inspect',
          label: i18n.translate('discover.tabsView.tabMenu.inspectTitle', {
            defaultMessage: 'Inspect',
          }),
          onClick: openInspector,
        },
      ];
    },
    [allTabs, currentTabId, openInspector]
  );

  const splitGroup = useInternalStateSelector(selectSplitGroup);
  const dispatch = useInternalStateDispatch();

  // Provide "Switch to ES|QL", "Switch to Classic" and split view menu items for the selected tab
  const getAdditionalTabMenuItems = useCallback<
    NonNullable<UnifiedTabsProps['getAdditionalTabMenuItems']>
  >(
    (item) => {
      const tab = allTabs.find((t) => t.id === item.id);
      const isCurrentTab = tab?.id === currentTabId;

      if (!isCurrentTab) {
        return [];
      }

      const menuItems: ReturnType<NonNullable<UnifiedTabsProps['getAdditionalTabMenuItems']>> = [];

      if (canSwitchLanguageMode) {
        menuItems.push({
          'data-test-subj': isDataViewMode
            ? 'unifiedTabs_tabMenuItem_switchToESQL'
            : 'unifiedTabs_tabMenuItem_switchToClassic',
          name: isDataViewMode ? 'switchToESQL' : 'switchToClassic',
          label: isDataViewMode
            ? i18n.translate('discover.tabsView.tabMenu.switchToESQLTitle', {
                defaultMessage: 'Switch to ES|QL',
              })
            : i18n.translate('discover.tabsView.tabMenu.switchToClassicTitle', {
                defaultMessage: 'Switch to classic',
              }),
          onClick: switchLanguageMode,
        });
      }

      if (splitGroup?.tabIds.includes(item.id)) {
        menuItems.push({
          'data-test-subj': 'unifiedTabs_tabMenuItem_exitSplitView',
          name: 'exitSplitView',
          label: i18n.translate('discover.tabsView.tabMenu.exitSplitViewTitle', {
            defaultMessage: 'Exit split view',
          }),
          onClick: () => dispatch(internalStateActions.setSplitGroup(undefined)),
        });
      } else {
        menuItems.push({
          'data-test-subj': 'unifiedTabs_tabMenuItem_addToSplitView',
          name: 'addToSplitView',
          label: i18n.translate('discover.tabsView.tabMenu.addToSplitViewTitle', {
            defaultMessage: 'Add new tab to split view',
          }),
          onClick: () => {
            void dispatch(internalStateActions.addTabToSplitView({ tabId: item.id }));
          },
        });
      }

      return menuItems;
    },
    [
      allTabs,
      canSwitchLanguageMode,
      currentTabId,
      dispatch,
      isDataViewMode,
      splitGroup,
      switchLanguageMode,
    ]
  );

  const topNavMenuItems = useTopNavMenuItems();

  return {
    getTopTabMenuItems,
    getAdditionalTabMenuItems,
    ...topNavMenuItems,
  };
};
