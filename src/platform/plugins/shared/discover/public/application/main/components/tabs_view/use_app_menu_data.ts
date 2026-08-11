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
  useInternalStateDispatch,
  useInternalStateSelector,
  useCurrentTabAction,
  selectAllTabs,
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
}

export const useAppMenuData = ({ currentDataView }: UseAppMenuDataParams): UseAppMenuDataResult => {
  const dispatch = useInternalStateDispatch();
  const allTabs = useInternalStateSelector(selectAllTabs);
  const currentTabId = useInternalStateSelector((state) => state.tabs.unsafeCurrentId);
  const { canSwitchLanguageMode, isDataViewMode, openInspector, switchLanguageMode } =
    useCurrentTabMenuActions({ currentDataView });
  const setCommentUiState = useCurrentTabAction(internalStateActions.setCommentUiState);

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
      const items: Array<{
        'data-test-subj': string;
        name: string;
        label: string;
        onClick: () => void;
      }> = [];

      if (isCurrentTab && canSwitchLanguageMode) {
        if (isDataViewMode) {
          items.push({
            'data-test-subj': 'unifiedTabs_tabMenuItem_switchToESQL',
            name: 'switchToESQL',
            label: i18n.translate('discover.tabsView.tabMenu.switchToESQLTitle', {
              defaultMessage: 'Switch to ES|QL',
            }),
            onClick: switchLanguageMode,
          });
        } else {
          items.push({
            'data-test-subj': 'unifiedTabs_tabMenuItem_switchToClassic',
            name: 'switchToClassic',
            label: i18n.translate('discover.tabsView.tabMenu.switchToClassicTitle', {
              defaultMessage: 'Switch to classic',
            }),
            onClick: switchLanguageMode,
          });
        }
      }

      if (isCurrentTab && tab) {
        const hasComment = typeof tab.uiState.comment === 'string';
        items.push({
          'data-test-subj': hasComment
            ? 'unifiedTabs_tabMenuItem_removeComment'
            : 'unifiedTabs_tabMenuItem_addComment',
          name: hasComment ? 'removeComment' : 'addComment',
          label: hasComment
            ? i18n.translate('discover.tabs.removeCommentMenuItem', {
                defaultMessage: 'Remove comment',
              })
            : i18n.translate('discover.tabs.addCommentMenuItem', {
                defaultMessage: 'Add comment',
              }),
          onClick: () => {
            dispatch(setCommentUiState({ comment: hasComment ? undefined : '' }));
          },
        });
      }

      return items;
    },
    [
      allTabs,
      canSwitchLanguageMode,
      currentTabId,
      dispatch,
      isDataViewMode,
      setCommentUiState,
      switchLanguageMode,
    ]
  );

  const topNavMenuItems = useTopNavMenuItems();

  return {
    getTopTabMenuItems,
    getAdditionalTabMenuItems,
    topNavMenuItems,
  };
};
