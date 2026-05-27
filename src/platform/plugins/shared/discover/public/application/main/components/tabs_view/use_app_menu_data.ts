/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useState } from 'react';
import type { EuiResizeObserverProps } from '@elastic/eui';
import type { UnifiedTabsProps } from '@kbn/unified-tabs';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useInternalStateSelector, selectAllTabs } from '../../state_management/redux';
import { useTopNavMenuItems } from '../top_nav/use_top_nav_menu_items';
import { useCurrentTabMenuActions } from '../../hooks/use_current_tab_menu_actions';

const APP_MENU_COLLAPSE_THRESHOLD = 800;

interface UseAppMenuDataParams {
  currentDataView: DataView | undefined;
}

interface UseAppMenuDataResult {
  shouldCollapseAppMenu: boolean;
  onResize: EuiResizeObserverProps['onResize'];
  getTopTabMenuItems: UnifiedTabsProps['getTopTabMenuItems'];
  getAdditionalTabMenuItems: UnifiedTabsProps['getAdditionalTabMenuItems'];
  topNavMenuItems: AppMenuConfig | undefined;
}

export const useAppMenuData = ({ currentDataView }: UseAppMenuDataParams): UseAppMenuDataResult => {
  const allTabs = useInternalStateSelector(selectAllTabs);
  const currentTabId = useInternalStateSelector((state) => state.tabs.unsafeCurrentId);
  const [shouldCollapseAppMenu, setShouldCollapseAppMenu] = useState(false);
  const { canSwitchLanguageMode, isDataViewMode, openInspector, switchLanguageMode } =
    useCurrentTabMenuActions({ currentDataView });

  const onResize: EuiResizeObserverProps['onResize'] = useCallback((dimensions) => {
    if (!dimensions) return;
    setShouldCollapseAppMenu(dimensions.width < APP_MENU_COLLAPSE_THRESHOLD);
  }, []);

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

  // Provide "Switch to ES|QL" and "Switch to Classic" menu items for the selected tab
  const getAdditionalTabMenuItems = useCallback<
    NonNullable<UnifiedTabsProps['getAdditionalTabMenuItems']>
  >(
    (item) => {
      const tab = allTabs.find((t) => t.id === item.id);
      const isCurrentTab = tab?.id === currentTabId;

      if (!isCurrentTab || !canSwitchLanguageMode) {
        return [];
      }

      if (isDataViewMode) {
        return [
          {
            'data-test-subj': 'unifiedTabs_tabMenuItem_switchToESQL',
            name: 'switchToESQL',
            label: i18n.translate('discover.tabsView.tabMenu.switchToESQLTitle', {
              defaultMessage: 'Switch to ES|QL',
            }),
            onClick: switchLanguageMode,
          },
        ];
      }

      return [
        {
          'data-test-subj': 'unifiedTabs_tabMenuItem_switchToClassic',
          name: 'switchToClassic',
          label: i18n.translate('discover.tabsView.tabMenu.switchToClassicTitle', {
            defaultMessage: 'Switch to classic',
          }),
          onClick: switchLanguageMode,
        },
      ];
    },
    [allTabs, canSwitchLanguageMode, currentTabId, isDataViewMode, switchLanguageMode]
  );

  const topNavMenuItems = useTopNavMenuItems();

  return {
    shouldCollapseAppMenu,
    onResize,
    getTopTabMenuItems,
    getAdditionalTabMenuItems,
    topNavMenuItems,
  };
};
